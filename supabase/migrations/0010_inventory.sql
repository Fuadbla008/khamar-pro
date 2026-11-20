-- Phase 2.5 — minimal inventory module.
-- Requires 0001 (schema), 0002 (is_farm_member), 0003 (global seed pattern),
-- 0008 (table GRANTs) and 0009 (profile backfill) first.
--
-- Safe to re-run: tables, policies, trigger and seed rows are all guarded.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  -- No FK to categories.code: farm overrides duplicate the global code, so the
  -- active category is resolved by (farm_id, entity='inventory', code).
  category_code text not null,
  name text,
  name_bn text not null,
  unit text not null check (unit in (
    'কেজি', 'লিটার', 'বোতল', 'প্যাকেট', 'পিস', 'ব্যাগ', 'গ্রাম', 'মিলি'
  )),
  current_stock numeric(12, 2) not null default 0,
  min_stock numeric(12, 2) not null default 0,
  unit_price numeric(12, 2),
  custom_fields jsonb not null default '{}'::jsonb
    check (jsonb_typeof(custom_fields) = 'object'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists inventory_items_farm_category_idx
  on public.inventory_items (farm_id, category_code);
create index if not exists inventory_items_farm_name_idx
  on public.inventory_items (farm_id, name_bn);
create index if not exists inventory_items_custom_fields_gin
  on public.inventory_items using gin (custom_fields jsonb_path_ops);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items (id),
  farm_id uuid not null references public.farms (id),
  direction text not null check (direction in ('in', 'out')),
  qty numeric(12, 2) not null check (qty > 0),
  unit_price numeric(12, 2),
  total_cost numeric(12, 2),
  note text,
  date date not null default current_date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_item_date_idx
  on public.inventory_movements (item_id, date desc);
create index if not exists inventory_movements_farm_date_idx
  on public.inventory_movements (farm_id, date desc);

-- ---------------------------------------------------------------------------
-- Stock recomputation trigger.
-- SECURITY DEFINER so the item update is not blocked by the invoking user's
-- RLS; the trigger only ever writes current_stock on the item(s) involved.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_inventory_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_ids uuid[];
begin
  if tg_op = 'DELETE' then
    v_item_ids := array[old.item_id];
  elsif tg_op = 'UPDATE' and old.item_id is distinct from new.item_id then
    v_item_ids := array[old.item_id, new.item_id];
  else
    v_item_ids := array[new.item_id];
  end if;

  update public.inventory_items i
     set current_stock = coalesce((
           select sum(
             case when m.direction = 'in' then m.qty else -m.qty end
           )
           from public.inventory_movements m
           where m.item_id = i.id
         ), 0)
   where i.id = any (v_item_ids);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_movements_recompute_stock
  on public.inventory_movements;
create trigger inventory_movements_recompute_stock
  after insert or update or delete on public.inventory_movements
  for each row execute function public.recompute_inventory_stock();

-- ---------------------------------------------------------------------------
-- RLS. No DELETE policies: item removal is a deleted_at soft delete.
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
         'inventory_items_select_member', 'inventory_items_insert_member',
         'inventory_items_update_member', 'inventory_movements_select_member',
         'inventory_movements_insert_member', 'inventory_movements_update_member'
       )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end;
$$;

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

create policy "inventory_items_select_member"
  on public.inventory_items for select to authenticated
  using (deleted_at is null and public.is_farm_member(farm_id));

create policy "inventory_items_insert_member"
  on public.inventory_items for insert to authenticated
  with check (public.is_farm_member(farm_id));

create policy "inventory_items_update_member"
  on public.inventory_items for update to authenticated
  using (deleted_at is null and public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

create policy "inventory_movements_select_member"
  on public.inventory_movements for select to authenticated
  using (public.is_farm_member(farm_id));

create policy "inventory_movements_insert_member"
  on public.inventory_movements for insert to authenticated
  with check (public.is_farm_member(farm_id));

create policy "inventory_movements_update_member"
  on public.inventory_movements for update to authenticated
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

-- ---------------------------------------------------------------------------
-- Table privileges. 0008 already grants these via ALTER DEFAULT PRIVILEGES,
-- but repeat them explicitly so this file works on its own as well.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.inventory_items to anon, authenticated;
grant select, insert, update on public.inventory_movements to anon, authenticated;
grant all on public.inventory_items to service_role;
grant all on public.inventory_movements to service_role;

-- ---------------------------------------------------------------------------
-- Global inventory categories. Farm-scoped copies are created by create_farm()
-- (0004/0009); older farms fall back to these globals via the engine resolver.
-- ---------------------------------------------------------------------------
insert into public.categories (
  farm_id, entity, code, name, name_bn, icon, color, sort_order, is_active, is_global
)
select
  null, 'inventory', v.code, v.name, v.name_bn, v.icon, v.color, v.sort_order, true, true
from (values
  ('feed',       'Feed',       'খাবার',      '🌾', '#C79A3B', 1),
  ('medicine',   'Medicine',   'ঔষধ',        '💊', '#C0392B', 2),
  ('supplement', 'Supplement', 'সাপ্লিমেন্ট', '🧪', '#2E7D32', 3),
  ('equipment',  'Equipment',  'যন্ত্রপাতি',  '🛠️', '#6B7280', 4),
  ('other',      'Other',      'অন্যান্য',    '📦', '#9CA3AF', 5)
) as v(code, name, name_bn, icon, color, sort_order)
where not exists (
  select 1
  from public.categories c
  where c.farm_id is null
    and c.entity = 'inventory'
    and c.code = v.code
);
