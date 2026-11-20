# Khamar

Mobile-first livestock management for small farms in Bangladesh. One shared
workspace per farm, one money ledger, and an owner-configurable data model.

This repository implements **Phases 0, 1, 2, 2.5 and 4**:

| Phase | Scope |
| --- | --- |
| 0 | Supabase schema, RLS, seed data, auth, onboarding, invitation flow |
| 1 | Dashboard, animals + custom fields, single transaction ledger |
| 2 | Members/roles/permissions, farm settings, categories and field managers |
| 2.5 | Inventory items, stock movements, medicine picker source |
| 4 | Health records, vaccine/deworming templates, auto-scheduling, reminders |

Production and reports are intentionally left as locked "coming soon"
surfaces; the schema and config tables already have room for them.

---

## Stack

- Next.js 16 App Router, **JavaScript** (no TypeScript), React 19
- Tailwind CSS v4 through the Turbopack loader; shadcn/ui v4 (`radix-nova`)
- Supabase (Postgres + Auth + RLS) with `@supabase/ssr`
- Server Components for reads, Server Actions for writes
- TanStack Query for client-side reads and optimistic updates
- `nuqs` for filter state in the URL
- Hind Siliguri font, Bengali UI copy, `numeric(12,2)` money

---

## Local setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in the values from your hosted
Supabase project (**Project Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

- The anon key is public by design; RLS is the security boundary.
- The service-role key is **server only**. It is used just to read Auth
  "last sign-in" metadata on the members page; the app works without it.
- Never commit a real `.env.local`.

In Supabase **Authentication → Providers**, enable email/password sign-ups.
For a production deployment, also set your site URL and redirect URLs.

### 3. Apply migrations — **in this exact order**

Open the hosted project's **SQL Editor** and run one file per execution:

```text
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_seed_global.sql
supabase/migrations/0004_create_farm.sql
supabase/migrations/0005_category_transaction_type.sql
supabase/migrations/0006_member_invite_tracking.sql
supabase/migrations/0007_archive_farm.sql
supabase/migrations/0008_grants.sql
supabase/migrations/0009_profile_backfill.sql
supabase/migrations/0010_inventory.sql
supabase/migrations/0011_health.sql
```

| File | What it adds |
| --- | --- |
| `0001` | Core tables, constraints, indexes, invite-code generator |
| `0002` | RLS policies, membership helpers, profile trigger, last-owner guard, invite redeem/leave |
| `0003` | Global category + field-definition seed rows |
| `0004` | Atomic `create_farm()` (farm + owner + config copies) |
| `0005` | `categories.transaction_type`, backfill, updated `create_farm()` |
| `0006` | `farm_members.invite_id`, atomic `create_invite()`, updated `redeem_invite()` |
| `0007` | `archive_farm()` and a guard adjustment for archiving |
| `0008` | Table-level GRANTs for `anon` / `authenticated` / `service_role` (fixes 42501 permission denied) |
| `0009` | Backfill missing profiles, harden `create_farm()` so a missing profile can't block farm creation |
| `0010` | Phase 2.5 inventory tables, stock-recompute trigger, RLS, global inventory categories |
| `0011` | Phase 4 health records/templates, `animals.status='sick'`, RLS, global vaccine seeds |

All migrations are additive/idempotent-friendly, but they must still be applied
in order. There are no `DELETE` policies anywhere: every removal is a
`deleted_at` soft delete (or `is_active = false` for definitions). `0008` is
safe to re-run at any time; it only issues `GRANT`s and never touches data.

### 4. Run

```bash
npm run dev
```

Open `http://localhost:3000`. A new account is routed to `/onboarding`, where
`create_farm()` creates the farm and copies all global categories and fields
into it.

---

## Verification

```bash
npm run lint
npm run build
```

`npm run build` is the strongest available check (there is no test or typecheck
script). Note that `cacheComponents: true` requires pages reading `params`,
`searchParams`, `cookies()` or `headers()` to wrap those reads in `<Suspense>`.

---

## Architecture

**Code is the engine; data is the configuration.**

- No category, role label, or custom field is hardcoded in application code.
  Global seeds live in SQL (`0003`); the farm owner edits farm-scoped copies
  from `/f/[farmId]/settings/categories` and `/settings/fields`.
- A farm-scoped row with the same `code`/`key` overrides its global template.
  Editing a global row creates a farm override instead of mutating the shared
  row; keys/codes are immutable after creation.
- Custom field values live in `custom_fields` JSONB. Field definitions drive
  zod validation and rendering at runtime. Hard cap: **25 fields per entity**.
  The "formula" field type is deliberately not implemented yet.
- All money lives in `transactions.amount numeric(12,2)`,
  `animals.purchase_price numeric(12,2)` and
  `health_records.cost numeric(12,2)`; never floats. Every rendered amount
  goes through `formatMoney()` with the ৳ prefix and the owner's Bangla-digit
  preference from `app_settings`.
- `is_farm_member()` is `SECURITY DEFINER` and checks `farm_members` plus an
  optional permission key. Owners implicitly pass every check. Managers/members
  use the `permissions` JSONB grants.
- Reads happen in Server Components or TanStack Query; writes happen in Server
  Actions with Bengali validation errors. List filters are URL state via `nuqs`.
- One ledger table records both income and expense; `categories.transaction_type`
  decides which picker options are valid, and the server re-checks it.

---

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing/auth gate |
| `/login`, `/register`, `/join/[code]` | Auth + invite redemption |
| `/onboarding` | Create the first farm |
| `/f/[farmId]/dashboard` | KPIs, vaccine/sick reminders, last 10 transactions, coming-soon chips |
| `/f/[farmId]/animals` | List/filter, quick sick/dead actions, new, detail, edit |
| `/f/[farmId]/animals/[animalId]` | Details + "স্বাস্থ্য" timeline tab |
| `/f/[farmId]/health` | Health timeline, tabs, due filter, new/edit records |
| `/f/[farmId]/transactions` | Ledger with filters, add/edit sheet or dialog |
| `/f/[farmId]/inventory` | Stock by category, movements, add/edit items |
| `/f/[farmId]/members` | Roles, permissions, invite codes, join log |
| `/f/[farmId]/settings` | Farm info, Bangla digits, archive |
| `/f/[farmId]/settings/categories` | Category manager |
| `/f/[farmId]/settings/fields` | Custom field manager |

The farm layout provides the responsive shell: collapsible sidebar, top bar
with farm switcher and `Ctrl/⌘+K` command palette on desktop; bottom tabs,
quick-add FAB and "আরও" drawer on mobile.

---

## Known limitations

- Live end-to-end verification requires a hosted Supabase project; only lint
  and production build have been run in this repository.
- File-type custom fields store a URL string; there is no storage upload yet.
- Farm archive is irreversible from the UI.
- Configurable entities are `animal`, `transaction`, `inventory` and `health`.
  Health templates are global seeds only; there is no template editor UI yet.
- Goat template offsets (90/365 for PPR and Goat Pox, 45/90 for deworming) are
  practical defaults; the brief did not specify them.
