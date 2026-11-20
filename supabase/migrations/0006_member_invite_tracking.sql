-- Additive member/invite upgrades for Phase 2.
-- 1. Track which invite brought a member in, so the owner can see who joined
--    with which code and when ("কবে কে জয়েন করেছে").
-- 2. Atomic invite creation with a uniqueness retry loop.
-- 3. Redeem_invite now records the invite id on the new membership.

alter table public.farm_members
  add column if not exists invite_id uuid references public.farm_invites (id);

create index if not exists farm_members_invite_id_idx on public.farm_members (invite_id);

-- ---------------------------------------------------------------------------
-- Atomic invite generator. SECURITY DEFINER so the uniqueness retry is not
-- constrained by RLS; authorization is checked explicitly in the function.
-- ---------------------------------------------------------------------------
create or replace function public.create_invite(
  p_farm_id uuid,
  p_role text default 'member',
  p_permissions jsonb default '{}'::jsonb,
  p_max_uses int default 1,
  p_expires_in_days int default 7
)
returns public.farm_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.farm_invites%rowtype;
  v_code text;
  v_attempts int := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.is_farm_owner(p_farm_id)
    or public.is_farm_member(p_farm_id, 'can_manage_members')
  ) then
    raise exception 'Not allowed to manage members';
  end if;

  if p_role not in ('owner', 'manager', 'member') then
    raise exception 'Invalid role';
  end if;

  loop
    v_code := public.generate_invite_code();
    v_attempts := v_attempts + 1;
    begin
      insert into public.farm_invites (
        farm_id, code, role, permissions, expires_at, max_uses, created_by
      )
      values (
        p_farm_id,
        v_code,
        p_role,
        coalesce(p_permissions, '{}'::jsonb),
        now() + make_interval(days => greatest(coalesce(p_expires_in_days, 7), 1)),
        greatest(coalesce(p_max_uses, 1), 1),
        auth.uid()
      )
      returning * into v_invite;
      exit;
    exception when unique_violation then
      if v_attempts >= 10 then
        raise exception 'Could not generate a unique invite code';
      end if;
    end;
  end loop;

  return v_invite;
end;
$$;

revoke all on function public.create_invite(uuid, text, jsonb, int, int) from public;
grant execute on function public.create_invite(uuid, text, jsonb, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Redeem_invite with invite tracking. The rest of the logic is unchanged.
-- ---------------------------------------------------------------------------
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

  insert into public.farm_members (farm_id, user_id, role, permissions, invite_id)
  values (v_invite.farm_id, auth.uid(), v_invite.role, v_invite.permissions, v_invite.id)
  on conflict (farm_id, user_id) do nothing;

  return query select v_invite.farm_id, v_invite.role, v_invite.permissions;
end;
$$;

revoke all on function public.redeem_invite(text) from public;
grant execute on function public.redeem_invite(text) to authenticated, service_role;
