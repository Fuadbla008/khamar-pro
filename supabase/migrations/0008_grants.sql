-- Baseline table privileges for Supabase's API roles.
--
-- The tables were created by custom SQL migrations in the SQL Editor (as
-- postgres). Supabase normally installs default privileges for the `public`
-- schema, but on projects where that template step was skipped the API roles
-- end up with no table-level GRANTs. The symptom is `42501: permission denied
-- for table ...` for BOTH the anon and service_role keys, even though RLS
-- policies are defined correctly.
--
-- RLS still controls row visibility. These grants only let the API roles reach
-- the tables so RLS can be evaluated. No DELETE privilege is granted to anon or
-- authenticated: the app is soft-delete-only anyway.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Future tables created by migrations get the same baseline automatically.
alter default privileges in schema public
  grant select, insert, update on tables to anon, authenticated;

alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
