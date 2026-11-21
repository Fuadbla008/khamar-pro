-- Phase 5a — production records and the shared export engine (app-side).
-- Requires 0001 (schema), 0002 (is_farm_member), 0008 (GRANTs) and
-- 0009 (profile backfill) first.
--
-- Safe to re-run: table, policies and indexes are all guarded.
-- No DELETE policy: removal is a deleted_at soft delete.

create table if not exists public.production_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  -- NULL means a lot / whole-farm total rather than one animal.
  animal_id uuid references public.animals (id),
  type text not null check (type in (
    'milk', 'egg', 'meat', 'manure', 'wool', 'honey', 'other'
  )),
  qty numeric(12, 2) not null check (qty > 0),
  unit text not null,
  date date not null default current_date,
  price_per_unit numeric(12, 2) not null default 0 check (price_per_unit >= 0),
  total_income numeric(12, 2) not null default 0 check (total_income >= 0),
  linked_transaction_id uuid references public.transactions (id),
  notes text,
  created_by uuid references public.profiles (id),
  custom_fields jsonb not null default '{}'::jsonb
    check (jsonb_typeof(custom_fields) = 'object'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists production_records_farm_date_idx
  on public.production_records (farm_id, date desc);
create index if not exists production_records_farm_type_date_idx
  on public.production_records (farm_id, type, date desc);
create index if not exists production_records_animal_date_idx
  on public.production_records (animal_id, date desc);
create index if not exists production_records_transaction_idx
  on public.production_records (linked_transaction_id)
  where linked_transaction_id is not null;
create index if not exists production_records_custom_fields_gin
  on public.production_records using gin (custom_fields jsonb_path_ops);

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and policyname in (
         'production_records_select_member',
         'production_records_insert_member',
         'production_records_update_member'
       )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end;
$$;

alter table public.production_records enable row level security;

create policy "production_records_select_member"
  on public.production_records for select to authenticated
  using (deleted_at is null and public.is_farm_member(farm_id));

create policy "production_records_insert_member"
  on public.production_records for insert to authenticated
  with check (public.is_farm_member(farm_id));

create policy "production_records_update_member"
  on public.production_records for update to authenticated
  using (deleted_at is null and public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

grant select, insert, update on public.production_records to anon, authenticated;
grant all on public.production_records to service_role;
