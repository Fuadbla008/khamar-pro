-- Khamar core schema — Phase 0/1/2, shaped for future modules.
-- Order: profiles -> farms -> farm_members -> farm_invites -> categories
--        -> animals -> transactions -> field_definitions -> app_settings

-- Permission keys used by is_farm_member(farm_id, permission):
--   can_manage_categories, can_manage_fields, can_manage_members,
--   can_manage_animals, can_manage_transactions, can_manage_settings
-- Owner implicitly passes every check; manager passes only explicit grants.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id), -- no ON DELETE CASCADE: user records are never hard-deleted
  full_name text,
  phone text,
  avatar_url text,
  locale text not null default 'bn',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  primary_type text not null,
  address text,
  currency text not null default 'BDT',
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists farms_owner_id_idx on public.farms (owner_id);

create table if not exists public.farm_members (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  user_id uuid not null references public.profiles (id),
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  permissions jsonb not null default '{}'::jsonb check (jsonb_typeof(permissions) = 'object'),
  joined_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint farm_members_farm_user_uq unique (farm_id, user_id)
);
create index if not exists farm_members_user_id_idx on public.farm_members (user_id);

create table if not exists public.farm_invites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  code text not null unique,
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  permissions jsonb not null default '{}'::jsonb check (jsonb_typeof(permissions) = 'object'),
  expires_at timestamptz not null,
  max_uses int not null default 1 check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  created_by uuid not null references public.profiles (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint farm_invites_uses_ck check (used_count <= max_uses)
);
create index if not exists farm_invites_farm_id_idx on public.farm_invites (farm_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references public.farms (id), -- NULL = global default
  entity text not null check (entity in ('animal', 'transaction', 'inventory', 'health', 'production')),
  code text not null, -- immutable slug; farm overrides reuse the global code
  name text not null,
  name_bn text not null,
  icon text,
  color text,
  parent_id uuid references public.categories (id),
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_global boolean not null default false,
  deleted_at timestamptz,
  created_by uuid references public.profiles (id)
);
-- Unique indexes must cover the NULL farm_id case separately: PostgreSQL treats
-- NULLs as distinct, so the farm-scoped index alone would allow duplicate globals.
create unique index if not exists categories_farm_entity_code_uq
  on public.categories (farm_id, entity, code) where deleted_at is null;
create unique index if not exists categories_global_entity_code_uq
  on public.categories (entity, code) where farm_id is null and deleted_at is null;
create index if not exists categories_farm_entity_sort_idx
  on public.categories (farm_id, entity, sort_order);

create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  -- No FK to categories.code: a farm override duplicates the global code, so
  -- categories.code is not globally unique. Resolve the active category by
  -- (farm_id, entity='animal', code), falling back to the global row.
  category_code text not null,
  tag_no text not null,
  name text,
  gender text check (gender in ('male', 'female', 'unknown')),
  dob date,
  purchase_date date,
  purchase_price numeric(12, 2),
  status text not null default 'active' check (status in ('active', 'sold', 'dead', 'transferred')),
  photo_url text,
  custom_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_fields) = 'object'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- A partial UNIQUE constraint is not valid PostgreSQL syntax: a WHERE clause
-- belongs on a standalone unique index, not on a table constraint.
create unique index if not exists animals_farm_tag_uq
  on public.animals (farm_id, tag_no) where deleted_at is null;
create index if not exists animals_farm_status_idx on public.animals (farm_id, status);
create index if not exists animals_farm_category_idx on public.animals (farm_id, category_code);
create index if not exists animals_custom_fields_gin on public.animals using gin (custom_fields jsonb_path_ops);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  type text not null check (type in ('income', 'expense')),
  category_code text not null, -- see animals.category_code note
  amount numeric(12, 2) not null check (amount > 0),
  date date not null default current_date,
  paid_by uuid references public.profiles (id),
  animal_id uuid references public.animals (id),
  note text,
  attachment_url text,
  custom_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_fields) = 'object'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists transactions_farm_date_idx on public.transactions (farm_id, date desc);
create index if not exists transactions_farm_animal_idx on public.transactions (farm_id, animal_id);
create index if not exists transactions_farm_type_category_idx on public.transactions (farm_id, type, category_code);

create table if not exists public.field_definitions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references public.farms (id), -- NULL = global default
  entity text not null check (entity in ('animal', 'transaction', 'inventory', 'health', 'production')),
  key text not null, -- immutable after creation
  label text not null,
  label_bn text not null,
  type text not null check (type in ('text', 'number', 'date', 'select', 'multiselect', 'boolean', 'file')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  required boolean not null default false,
  default_value text,
  sort_order int not null default 0,
  show_in_list boolean not null default false,
  show_in_form boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists field_definitions_farm_entity_key_uq
  on public.field_definitions (farm_id, entity, key);
create unique index if not exists field_definitions_global_entity_key_uq
  on public.field_definitions (entity, key) where farm_id is null;
create index if not exists field_definitions_farm_entity_sort_idx
  on public.field_definitions (farm_id, entity, sort_order);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  key text not null,
  value jsonb not null default '{}'::jsonb,
  constraint app_settings_farm_key_uq unique (farm_id, key)
);

-- Invite codes: 8 chars, base32 alphabet with I/L/O/0/1 removed.
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text := '';
  i int;
begin
  for i in 1..8 loop
    v_code := v_code || substr(v_alphabet, floor(random() * length(v_alphabet))::int + 1, 1);
  end loop;
  return 'KHAMAR-' || v_code;
end;
$$;
