-- Atomic farm creation: farm row + owner membership + farm-scoped copies of
-- every active global category and field definition, in one transaction.

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
    sort_order, is_active, is_global, created_by
  )
  select
    v_farm_id, c.entity, c.code, c.name, c.name_bn, c.icon, c.color, null,
    c.sort_order, true, false, v_user_id
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
