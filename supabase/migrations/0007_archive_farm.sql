-- Owner-initiated farm archive (soft delete only, no DELETE policy anywhere).
-- Archiving marks the farm, its memberships and its invites inactive. Active
-- memberships are required by is_farm_member(), so all farm data becomes
-- unreadable through RLS the moment the archive completes.
--
-- Additive: replaces the last-owner guard and adds one RPC. Safe to run on a
-- project that already has 0001-0006 applied.

-- The guard normally refuses to soft-delete the last owner. During an archive
-- that is intentional, so skip the guard when the farm itself is archived.
create or replace function public.guard_last_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_farm_id uuid;
  v_owners int;
begin
  if tg_op = 'DELETE' then
    v_farm_id := old.farm_id;
  else
    v_farm_id := coalesce(new.farm_id, old.farm_id);
  end if;

  if exists (
    select 1 from public.farms f
     where f.id = v_farm_id and f.deleted_at is not null
  ) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role is distinct from 'owner' or old.deleted_at is not null then
      return old;
    end if;
  else
    if old.role is distinct from 'owner' or old.deleted_at is not null then
      return new;
    end if;
    if new.role = 'owner' and new.deleted_at is null then
      return new;
    end if;
  end if;

  select count(*) into v_owners
  from public.farm_members fm
  where fm.farm_id = v_farm_id
    and fm.role = 'owner'
    and fm.deleted_at is null;

  if v_owners <= 1 then
    raise exception 'Cannot remove or demote the last owner of a farm';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.archive_farm(p_farm_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_farm_owner(p_farm_id) then
    raise exception 'Only the owner can archive a farm';
  end if;

  update public.farms
     set deleted_at = now()
   where id = p_farm_id and deleted_at is null;

  update public.farm_members
     set deleted_at = now()
   where farm_id = p_farm_id and deleted_at is null;

  update public.farm_invites
     set is_active = false
   where farm_id = p_farm_id;
end;
$$;

revoke all on function public.archive_farm(uuid) from public;
grant execute on function public.archive_farm(uuid) to authenticated;
