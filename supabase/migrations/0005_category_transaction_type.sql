-- Transaction categories need to know whether they apply to income or expense.
-- The categories table only had `entity = 'transaction'`, so the form could not
-- offer a type-aware picker without hardcoding codes. Adding this column keeps
-- the split as owner-managed data (settings UI will expose it).
--
-- Additive migration on purpose: safe whether or not 0001-0004 were already
-- applied to a hosted project.

alter table public.categories
  add column if not exists transaction_type text
  check (transaction_type in ('income', 'expense'));

create index if not exists categories_farm_entity_type_sort_idx
  on public.categories (farm_id, entity, transaction_type, sort_order);

-- Backfill the seeded globals. These codes are seed data (SQL), never app code.
update public.categories
   set transaction_type = case
     when code in (
       'feed', 'medicine', 'labor', 'transport', 'vet', 'equipment',
       'animal_purchase', 'utility', 'expense_other'
     ) then 'expense'
     when code in (
       'animal_sale', 'milk', 'egg', 'meat', 'manure', 'income_other'
     ) then 'income'
   end
 where entity = 'transaction';

-- Farm-scoped copies created by the earlier create_farm() have NULL; derive
-- their type from the global template with the same code.
update public.categories c
   set transaction_type = g.transaction_type
  from public.categories g
 where c.farm_id is not null
   and c.entity = 'transaction'
   and c.transaction_type is null
   and g.farm_id is null
   and g.entity = 'transaction'
   and g.code = c.code;

-- Replace create_farm() so new farms copy transaction_type, and stop dropping
-- parent_id on the copied categories (the old version hardcoded NULL).
create or replace function public.create_farm(
  p_name text,
  p_primary_type text,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_farm_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'Farm name is required';
  end if;

  if btrim(coalesce(p_primary_type, '')) = '' then
    raise exception 'Primary type is required';
  end if;

  insert into public.farms (name, primary_type, address, owner_id)
  values (
    btrim(p_name),
    btrim(p_primary_type),
    nullif(btrim(coalesce(p_address, '')), ''),
    v_user_id
  )
  returning id into v_farm_id;

  insert into public.farm_members (farm_id, user_id, role, permissions)
  values (v_farm_id, v_user_id, 'owner', '{}'::jsonb);

  insert into public.categories (
    farm_id, entity, code, name, name_bn, icon, color, parent_id,
    sort_order, is_active, is_global, created_by, transaction_type
  )
  select
    v_farm_id, c.entity, c.code, c.name, c.name_bn, c.icon, c.color, c.parent_id,
    c.sort_order, true, false, v_user_id, c.transaction_type
  from public.categories c
  where c.farm_id is null
    and c.deleted_at is null
    and c.is_active;

  insert into public.field_definitions (
    farm_id, entity, key, label, label_bn, type, options, required,
    default_value, sort_order, show_in_list, show_in_form, is_active
  )
  select
    v_farm_id, fd.entity, fd.key, fd.label, fd.label_bn, fd.type, fd.options,
    fd.required, fd.default_value, fd.sort_order, fd.show_in_list,
    fd.show_in_form, true
  from public.field_definitions fd
  where fd.farm_id is null
    and fd.is_active;

  return v_farm_id;
end;
$$;

revoke all on function public.create_farm(text, text, text) from public;
grant execute on function public.create_farm(text, text, text) to authenticated;
