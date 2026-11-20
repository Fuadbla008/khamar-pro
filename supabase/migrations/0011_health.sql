-- Phase 4 — health records and vaccine scheduling.
-- Requires 0001 (schema), 0002 (is_farm_member), 0008 (GRANTs) and
-- 0010 (inventory_items, used by health_records.medicine_item_id) first.
--
-- Safe to re-run: tables, policies, constraint and seed rows are all guarded.
--
-- Design note: the requested health_records columns are all present. Two extra
-- nullable/defaulted columns make the module coherent:
--   is_done     false = auto-scheduled pending event, true = real event (default)
--   template_id links a scheduled record back to its template so recurring_days
--               can pre-fill next_due_date when the farmer completes it.

-- ---------------------------------------------------------------------------
-- animals.status: add 'sick' to the existing CHECK.
-- ---------------------------------------------------------------------------
do $$
declare
  v_name text;
begin
  select c.conname
    into v_name
    from pg_constraint c
   where c.conrelid = 'public.animals'::regclass
     and c.contype = 'c'
     and array_to_string(c.conkey, ',') = (
       select string_agg(a.attnum::text, ',')
         from pg_attribute a
        where a.attrelid = 'public.animals'::regclass
          and a.attname = 'status'
     )
   limit 1;

  if v_name is not null then
    execute format('alter table public.animals drop constraint %I', v_name);
  end if;
end;
$$;

-- Fallback for databases where the inline CHECK kept its auto-generated name.
alter table public.animals drop constraint if exists animals_status_check;

alter table public.animals add constraint animals_status_check
  check (status in ('active', 'sick', 'sold', 'dead', 'transferred'));

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.health_templates (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references public.farms (id), -- NULL = global default
  species text not null, -- animal category slug: cow, goat, chicken, ...
  type text not null check (type in (
    'vaccine', 'deworming', 'treatment', 'checkup', 'sick', 'death'
  )),
  title text not null,
  title_bn text not null,
  description_bn text,
  offset_days int not null default 0 check (offset_days >= 0),
  is_recurring boolean not null default false,
  recurring_days int check (recurring_days is null or recurring_days > 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists health_templates_species_idx
  on public.health_templates (species, is_active, sort_order);
create unique index if not exists health_templates_global_uq
  on public.health_templates (species, type, title_bn) where farm_id is null;
create unique index if not exists health_templates_farm_uq
  on public.health_templates (farm_id, species, type, title_bn);

create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  animal_id uuid references public.animals (id), -- NULL = whole-lot event
  type text not null check (type in (
    'vaccine', 'deworming', 'treatment', 'checkup', 'sick', 'death'
  )),
  title text not null,
  medicine_item_id uuid references public.inventory_items (id),
  dosage text,
  notes text,
  date date not null default current_date,
  next_due_date date,
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  created_by uuid references public.profiles (id),
  template_id uuid references public.health_templates (id),
  is_done boolean not null default true,
  custom_fields jsonb not null default '{}'::jsonb
    check (jsonb_typeof(custom_fields) = 'object'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists health_records_farm_date_idx
  on public.health_records (farm_id, date desc);
create index if not exists health_records_animal_date_idx
  on public.health_records (animal_id, date desc);
create index if not exists health_records_farm_due_idx
  on public.health_records (farm_id, next_due_date)
  where deleted_at is null and next_due_date is not null;
create index if not exists health_records_custom_fields_gin
  on public.health_records using gin (custom_fields jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- RLS. No DELETE policies: record removal is a deleted_at soft delete.
-- Global templates (farm_id IS NULL) are readable by any signed-in member;
-- farm-scoped templates require membership.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and policyname in (
         'health_records_select_member', 'health_records_insert_member',
         'health_records_update_member', 'health_templates_select_member'
       )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end;
$$;

alter table public.health_records enable row level security;
alter table public.health_templates enable row level security;

create policy "health_records_select_member"
  on public.health_records for select to authenticated
  using (deleted_at is null and public.is_farm_member(farm_id));

create policy "health_records_insert_member"
  on public.health_records for insert to authenticated
  with check (public.is_farm_member(farm_id));

create policy "health_records_update_member"
  on public.health_records for update to authenticated
  using (deleted_at is null and public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

create policy "health_templates_select_member"
  on public.health_templates for select to authenticated
  using (farm_id is null or public.is_farm_member(farm_id));

-- ---------------------------------------------------------------------------
-- Table privileges. 0008 already grants these via ALTER DEFAULT PRIVILEGES;
-- repeat explicitly so this file also works on a fresh project.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.health_records to anon, authenticated;
grant select on public.health_templates to anon, authenticated;
grant all on public.health_records to service_role;
grant all on public.health_templates to service_role;

-- ---------------------------------------------------------------------------
-- Global vaccine/deworming templates. Goat offsets are not specified in the
-- brief; 90/365 (PPR, Goat Pox) and 45/90 (deworming) follow common practice.
-- Chicken templates are one-off day-7/14/21 vaccinations.
-- ---------------------------------------------------------------------------
insert into public.health_templates (
  farm_id, species, type, title, title_bn, description_bn,
  offset_days, is_recurring, recurring_days, sort_order, is_active
)
select
  null, v.species, v.type, v.title, v.title_bn, null,
  v.offset_days, v.is_recurring, v.recurring_days, v.sort_order, true
from (values
  ('cow', 'vaccine',   'FMD',       'FMD টিকা',     90,  true,  180, 1),
  ('cow', 'vaccine',   'BQ',        'BQ টিকা',      120, true,  365, 2),
  ('cow', 'vaccine',   'Anthrax',   'Anthrax টিকা', 120, true,  365, 3),
  ('cow', 'deworming', 'Deworming', 'কৃমিনাশক',      45,  true,  90, 4),

  ('goat', 'vaccine',   'PPR',       'PPR টিকা',      90,  true, 365, 1),
  ('goat', 'vaccine',   'Goat Pox',  'Goat Pox টিকা', 90,  true, 365, 2),
  ('goat', 'deworming', 'Deworming', 'কৃমিনাশক',      45,  true, 90, 3),

  ('chicken', 'vaccine', 'Ranikhet', 'রানীক্ষেত টিকা', 7,  false, null, 1),
  ('chicken', 'vaccine', 'Gumboro',  'গামবোরো টিকা',   14, false, null, 2),
  ('chicken', 'vaccine', 'Fowl Pox', 'ফাউল পক্স',      21, false, null, 3)
) as v(species, type, title, title_bn, offset_days, is_recurring, recurring_days, sort_order)
where not exists (
  select 1
  from public.health_templates t
  where t.farm_id is null
    and t.species = v.species
    and t.type = v.type
    and t.title_bn = v.title_bn
);