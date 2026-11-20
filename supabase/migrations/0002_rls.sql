-- Khamar RLS + security definer helpers. Requires 0001_schema.sql first.

-- ---------------------------------------------------------------------------
-- Membership helpers. SECURITY DEFINER is required: these read farm_members,
-- so a plain SECURITY INVOKER function would recurse through that table's RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_farm_member(p_farm_id uuid, p_permission text default null)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text;
  v_permissions jsonb;
begin
  if p_farm_id is null or auth.uid() is null then
    return false;
  end if;

  select fm.role, fm.permissions
    into v_role, v_permissions
  from public.farm_members fm
  where fm.farm_id = p_farm_id
    and fm.user_id = auth.uid()
    and fm.deleted_at is null;

  if not found then
    return false;
  end if;

  if p_permission is null then
    return true;
  end if;

  if v_role = 'owner' then
    return true;
  end if;

  return coalesce((v_permissions ->> p_permission)::boolean, false);
end;
$$;

create or replace function public.is_farm_owner(p_farm_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_members fm
    where fm.farm_id = p_farm_id
      and fm.user_id = auth.uid()
      and fm.role = 'owner'
      and fm.deleted_at is null
  );
$$;

create or replace function public.shares_farm_with(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_members mine
    join public.farm_members theirs on theirs.farm_id = mine.farm_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
      and mine.deleted_at is null
      and theirs.deleted_at is null
  );
$$;

revoke all on function public.is_farm_member(uuid, text) from public;
revoke all on function public.is_farm_owner(uuid) from public;
revoke all on function public.shares_farm_with(uuid) from public;
grant execute on function public.is_farm_member(uuid, text) to authenticated, service_role;
grant execute on function public.is_farm_owner(uuid) to authenticated, service_role;
grant execute on function public.shares_farm_with(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Account / membership lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'bn')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Last owner cannot be removed or demoted. Applies to SECURITY DEFINER
-- functions too, because triggers run independently of RLS.
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
    if old.role is distinct from 'owner' or old.deleted_at is not null then
      return old;
    end if;
    v_farm_id := old.farm_id;
  else
    if old.role is distinct from 'owner' or old.deleted_at is not null then
      return new;
    end if;
    if new.role = 'owner' and new.deleted_at is null then
      return new;
    end if;
    v_farm_id := coalesce(new.farm_id, old.farm_id);
  end if;

  select count(*) into v_owners
  from public.farm_members fm
  where fm.farm_id = v_farm_id
    and fm.role = 'owner'
    and fm.deleted_at is null;

  if v_owners <= 1 then
    raise exception 'Cannot remove or demote the last owner of a farm';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists farm_members_guard_last_owner on public.farm_members;
create trigger farm_members_guard_last_owner
  before update or delete on public.farm_members
  for each row execute function public.guard_last_owner();

-- Self-service leave (soft delete) with the last-owner trigger still enforced.
create or replace function public.leave_farm(p_farm_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.farm_members
     set deleted_at = now()
   where farm_id = p_farm_id
     and user_id = auth.uid()
     and deleted_at is null;

  if not found then
    raise exception 'You are not an active member of this farm';
  end if;
end;
$$;

-- Atomic invite redemption. Locks the invite row so concurrent uses cannot
-- exceed max_uses, and is idempotent for an already-joined member.
create or replace function public.redeem_invite(p_code text)
returns table (farm_id uuid, role text, permissions jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.farm_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_invite
  from public.farm_invites i
  where upper(i.code) = upper(btrim(p_code))
    and i.is_active
    and i.expires_at > now()
    and i.used_count < i.max_uses
  for update;

  if not found then
    raise exception 'Invalid, expired, or fully used invite code';
  end if;

  update public.farm_invites
     set used_count = used_count + 1
   where id = v_invite.id;

  insert into public.farm_members (farm_id, user_id, role, permissions)
  values (v_invite.farm_id, auth.uid(), v_invite.role, v_invite.permissions)
  on conflict (farm_id, user_id) do nothing;

  return query select v_invite.farm_id, v_invite.role, v_invite.permissions;
end;
$$;

revoke all on function public.leave_farm(uuid) from public;
revoke all on function public.redeem_invite(text) from public;
grant execute on function public.leave_farm(uuid) to authenticated, service_role;
grant execute on function public.redeem_invite(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS enablement
-- ---------------------------------------------------------------------------
-- Make a re-run safe: create policy fails if the same name already exists.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and policyname in (
         'profiles_select_own_or_cofarmer', 'profiles_update_self',
         'farms_select_member', 'farms_insert_owner', 'farms_update_owner',
         'farm_members_select', 'farm_members_insert_owner', 'farm_members_update_owner',
         'farm_invites_select_member', 'farm_invites_insert_manager', 'farm_invites_update_manager',
         'categories_select_global_or_member', 'categories_insert_manager', 'categories_update_manager',
         'animals_select_member', 'animals_insert_member', 'animals_update_member',
         'transactions_select_member', 'transactions_insert_member', 'transactions_update_member',
         'field_definitions_select_global_or_member', 'field_definitions_insert_manager',
         'field_definitions_update_manager',
         'app_settings_select_member', 'app_settings_insert_manager', 'app_settings_update_manager'
       )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end;
$$;

alter table public.profiles         enable row level security;
alter table public.farms            enable row level security;
alter table public.farm_members     enable row level security;
alter table public.farm_invites     enable row level security;
alter table public.categories       enable row level security;
alter table public.animals          enable row level security;
alter table public.transactions     enable row level security;
alter table public.field_definitions enable row level security;
alter table public.app_settings     enable row level security;

-- No DELETE policies anywhere: all removals are soft (deleted_at).

-- profiles ------------------------------------------------------------------
create policy "profiles_select_own_or_cofarmer"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_farm_with(id));

create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- farms ---------------------------------------------------------------------
create policy "farms_select_member"
  on public.farms for select to authenticated
  using (public.is_farm_member(id) or owner_id = auth.uid());

create policy "farms_insert_owner"
  on public.farms for insert to authenticated
  with check (owner_id = auth.uid());

create policy "farms_update_owner"
  on public.farms for update to authenticated
  using (public.is_farm_owner(id))
  with check (public.is_farm_owner(id));

-- farm_members --------------------------------------------------------------
-- The exists() clause breaks the onboarding chicken-and-egg: the owner row is
-- inserted after the farm, before any owner membership exists.
create policy "farm_members_select"
  on public.farm_members for select to authenticated
  using (public.is_farm_member(farm_id) or user_id = auth.uid());

create policy "farm_members_insert_owner"
  on public.farm_members for insert to authenticated
  with check (
    public.is_farm_owner(farm_id)
    or exists (
      select 1 from public.farms f
      where f.id = farm_id and f.owner_id = auth.uid()
    )
  );

create policy "farm_members_update_owner"
  on public.farm_members for update to authenticated
  using (public.is_farm_owner(farm_id))
  with check (public.is_farm_owner(farm_id));

-- farm_invites --------------------------------------------------------------
create policy "farm_invites_select_member"
  on public.farm_invites for select to authenticated
  using (public.is_farm_member(farm_id));

create policy "farm_invites_insert_manager"
  on public.farm_invites for insert to authenticated
  with check (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_members')
  );

create policy "farm_invites_update_manager"
  on public.farm_invites for update to authenticated
  using (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_members')
  )
  with check (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_members')
  );

-- categories ----------------------------------------------------------------
-- Global rows (farm_id NULL) are readable by every authenticated user.
create policy "categories_select_global_or_member"
  on public.categories for select to authenticated
  using (
    deleted_at is null
    and (
      (farm_id is null and is_active)
      or public.is_farm_member(farm_id)
    )
  );

create policy "categories_insert_manager"
  on public.categories for insert to authenticated
  with check (
    farm_id is not null
    and (
      public.is_farm_owner(farm_id)
      or public.is_farm_member(farm_id, 'can_manage_categories')
    )
  );

create policy "categories_update_manager"
  on public.categories for update to authenticated
  using (
    farm_id is not null
    and (
      public.is_farm_owner(farm_id)
      or public.is_farm_member(farm_id, 'can_manage_categories')
    )
  )
  with check (
    farm_id is not null
    and (
      public.is_farm_owner(farm_id)
      or public.is_farm_member(farm_id, 'can_manage_categories')
    )
  );

-- animals -------------------------------------------------------------------
create policy "animals_select_member"
  on public.animals for select to authenticated
  using (deleted_at is null and public.is_farm_member(farm_id));

create policy "animals_insert_member"
  on public.animals for insert to authenticated
  with check (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_animals')
  );

create policy "animals_update_member"
  on public.animals for update to authenticated
  using (deleted_at is null and (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_animals')
  ))
  with check (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_animals')
  );

-- transactions --------------------------------------------------------------
create policy "transactions_select_member"
  on public.transactions for select to authenticated
  using (deleted_at is null and public.is_farm_member(farm_id));

create policy "transactions_insert_member"
  on public.transactions for insert to authenticated
  with check (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_transactions')
  );

create policy "transactions_update_member"
  on public.transactions for update to authenticated
  using (deleted_at is null and (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_transactions')
  ))
  with check (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_transactions')
  );

-- field_definitions ---------------------------------------------------------
create policy "field_definitions_select_global_or_member"
  on public.field_definitions for select to authenticated
  using (farm_id is null or public.is_farm_member(farm_id));

create policy "field_definitions_insert_manager"
  on public.field_definitions for insert to authenticated
  with check (
    farm_id is not null
    and (
      public.is_farm_owner(farm_id)
      or public.is_farm_member(farm_id, 'can_manage_fields')
    )
  );

create policy "field_definitions_update_manager"
  on public.field_definitions for update to authenticated
  using (
    farm_id is not null
    and (
      public.is_farm_owner(farm_id)
      or public.is_farm_member(farm_id, 'can_manage_fields')
    )
  )
  with check (
    farm_id is not null
    and (
      public.is_farm_owner(farm_id)
      or public.is_farm_member(farm_id, 'can_manage_fields')
    )
  );

-- app_settings --------------------------------------------------------------
create policy "app_settings_select_member"
  on public.app_settings for select to authenticated
  using (public.is_farm_member(farm_id));

create policy "app_settings_insert_manager"
  on public.app_settings for insert to authenticated
  with check (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_settings')
  );

create policy "app_settings_update_manager"
  on public.app_settings for update to authenticated
  using (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_settings')
  )
  with check (
    public.is_farm_owner(farm_id)
    or public.is_farm_member(farm_id, 'can_manage_settings')
  );
