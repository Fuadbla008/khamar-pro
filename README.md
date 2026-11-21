# Khamar

Mobile-first livestock management for small farms in Bangladesh. One shared
workspace per farm, one money ledger, and an owner-configurable data model.

This repository implements **Phases 0, 1, 2, 2.5, 4, 5a, 5b, 5c and 6**:

| Phase | Scope |
| --- | --- |
| 0 | Supabase schema, RLS, seed data, auth, onboarding, invitation flow |
| 1 | Dashboard, animals + custom fields, single transaction ledger |
| 2 | Members/roles/permissions, farm settings, categories and field managers |
| 2.5 | Inventory items, stock movements, medicine picker source |
| 4 | Health records, vaccine/deworming templates, auto-scheduling, reminders |
| 5a | Daily production records, linked ledger income, shared CSV export engine |
| 5b | Multi-tab reports with URL filters, charts, breakdowns and scoped exports |
| 5c | Dedicated bulk export center: full CSV ZIP, date/member ZIPs and JSON backup |
| 6 | PWA/offline shell, offline drafts, route states, onboarding polish and a11y |

All modules are live; there are no remaining "coming soon" surfaces.

---

## Stack

- Next.js 16 App Router, **JavaScript** (no TypeScript), React 19
- Tailwind CSS v4 through the Turbopack loader; shadcn/ui v4 (`radix-nova`)
- Supabase (Postgres + Auth + RLS) with `@supabase/ssr`
- Server Components for reads, Server Actions for writes
- TanStack Query for client-side reads and optimistic updates
- `nuqs` for filter state in the URL
- JSZip for browser-side export archives, Dexie/IndexedDB for offline drafts
- sonner toasts, canvas-confetti for first-animal celebration
- Hand-written service worker + web app manifest for PWA/offline support
- Hind Siliguri font, Bengali source UI copy with an English/Bangla toggle,
  English-first defaults, `numeric(12,2)` money

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
- The service-role key is **server only**. It reads Auth "last sign-in"
  metadata on the members page and writes the automatic animal-purchase ledger
  row even when an animal manager has no transaction permission. The app works
  without it, but set it in production for reliable auto-ledger writes.
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
supabase/migrations/0012_production.sql
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
| `0012` | Phase 5a `production_records` table, indexes, RLS, soft-delete-only policy |

All migrations are additive/idempotent-friendly, but they must still be applied
in order. Phases 5b, 5c and 6 need no new migration. There are no `DELETE`
policies anywhere: every removal is a `deleted_at` soft delete (or
`is_active = false` for definitions). `0008` is safe to re-run at any time; it
only issues `GRANT`s and never touches data.

If an older database was set up before `0009`–`0012`, applying those four files
is mandatory before using production records, bulk exports or offline-draft
sync.

### 4. Run

```bash
npm run dev
```

Open `http://localhost:3000`. A new account is routed to `/onboarding`, where
`create_farm()` creates the farm and copies all global categories and fields
into it. An existing owner can add more farms later from the farm switcher's
`+ নতুন খামার` action or directly at `/farms/new`.

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
  `animals.purchase_price numeric(12,2)`, `health_records.cost numeric(12,2)`,
  `inventory_items.unit_price numeric(12,2)` and
  `production_records.price_per_unit` / `total_income numeric(12,2)`; never
  floats. Multiplication uses integer 2-decimal helpers so money never drifts.
  Every rendered amount goes through `formatMoney()` with the ৳ prefix and the
  owner's numeral preference from `app_settings`; English digits are the
  default and Bangla digits are opt-in. `formatDate()` follows the same
  preference for English versus Bengali months/digits.
- CSV export is a shared engine: `toCSV()` adds a UTF-8 BOM and escapes commas,
  quotes and newlines; `downloadCSV()` triggers the browser download;
  `exportFilename()` builds `{entity}_{farmSlug}_{from}_{to}.csv`. Every
  builder is a Server Action that calls `requireFarmAccess()`, so RLS applies
  to exports exactly as it does to on-screen reads. The reusable
  `<ExportButton />` offers "বর্তমান ফিল্টার", "সব ডেটা" and "তারিখ রেঞ্জ".
  Reports pass an optional `meta` line (written above the header as a single
  escaped CSV cell) and their already-loaded rows via `data`, so a report CSV
  matches the on-screen tab exactly. Report filenames use
  `report_summary`, `report_userwise`, `report_animalwise`,
  `report_categorywise` and `report_detail`.
- `is_farm_member()` is `SECURITY DEFINER` and checks `farm_members` plus an
  optional permission key. Owners implicitly pass every check. Managers/members
  use the `permissions` JSONB grants.
- Reads happen in Server Components or TanStack Query; writes happen in Server
  Actions with Bengali validation errors. List filters are URL state via `nuqs`.
- One ledger table records both income and expense; `categories.transaction_type`
  decides which picker options are valid, and the server re-checks it. An
  animal's positive purchase price is mirrored as an `animal_purchase` expense
  with a stable `[animal:<id>]` note marker, so edits update one row instead of
  duplicating it.

### Reports (Phase 5b)

`/f/[farmId]/reports` is read-only and needs no new migration. Its filter bar
keeps everything in the URL via `nuqs`: date preset (`আজ`, `এই সপ্তাহ`,
`এই মাস`, `এই বছর`, `কাস্টম`), explicit from/to dates, paid-by members,
categories grouped by transaction type, and animals. An empty multi-select
means "all"; the `none` option matches ledger rows without a member or animal.

The five tabs are `সারাংশ`, `সদস্য ওয়ারি`, `পশু ওয়ারি`, `ক্যাটাগরি ওয়ারি` and
`বিস্তারিত`. Summary totals, the hand-rolled SVG 12-month bar chart and the
expense pie chart are all computed from integer cents
(`src/lib/utils/decimal.js`), never SQL `float`. Member and animal rows expand
in place to reveal their filtered transactions.

Reads go through five Server Actions in `src/lib/reports/actions.js`:
`getReportSummary`, `getUserWiseReport`, `getAnimalWiseReport`,
`getCategoryWiseReport` and `getTransactionDetail`. Each calls
`requireFarmAccess()` and shares `loadReportData()` in
`src/lib/reports/query.js`, so the RLS gate and the filter set are identical for
the screen and for CSV downloads. Aggregation is pure code in
`src/lib/reports/aggregate.js`; categories, members and animals come from the
farm's configuration, not from hardcoded lists.

Every report export includes a filter meta row such as
`রিপোর্ট: সদস্য ওয়ারি | তারিখ: 01/01/2026 - 31/01/2026 | খামার: X` and uses
filenames like `report_userwise_khamar1_2026-01-01_2026-01-31.csv`. Per-member
and per-animal exports reuse the same meta and the same detail columns.

### Bulk export center (Phase 5c)

`/f/[farmId]/settings/export` is the farm-wide export desk. All farm members
can open it, but Server Actions re-check `requireFarmAccess()` and role: owners
and managers can export every row, while members are scoped to their own
records (`paid_by = self` in the ledger, `created_by = self` where the table has
that column, and animal rows linked to their own paid transactions).

The page has four sections (Bengali source copy, translated in English mode):

- **সম্পূর্ণ খামার ডেটা** — one ZIP with `animals.csv`, `transactions.csv`,
  `inventory.csv`, `health.csv`, `production.csv`, `members.csv`,
  `categories.csv` and `custom_fields.json`.
- **ডেট ভিত্তিক এক্সপোর্ট** — from/to dates plus entity checkboxes, or
  "সব ডেটা", producing one ZIP of the selected entities.
- **সদস্য ভিত্তিক** — a member selector for owners/managers, fixed to self for
  members, exporting that member's paid/created records.
- **ব্যাকআপ JSON** — a migration-friendly full dump with custom-field values,
  field definitions, farm-scoped category overrides and all entity tables.

JSZip is loaded with a dynamic `import()` inside the client component so it
never enters the initial bundle. Every CSV begins with the exact meta line
`# খামার: {farm.name} | ব্যাকআপ তারিখ: {date} | ফিল্টার: {description}`; labels
are Bengali and money values use the same integer-cent formatting as reports.

### PWA, offline drafts and polish (Phase 6)

`public/manifest.json` declares the Bengali app name `খামার`, the green/cream
theme, standalone display and 192/512/maskable icons in `public/icons/`.
`public/sw.js` is a small dependency-free service worker: it precaches the app
shell, uses network-first for navigations and Supabase/RSC data, falls back to
`/~offline` with a Bengali message, and refreshes static assets while
revalidating. `@ducanh2912/next-pwa` remains installed for webpack builds, but
this repo builds with Turbopack, so the static worker is the effective PWA
implementation. A mobile-only install banner appears after the second visit.

Offline drafts use Dexie/IndexedDB (`drafts` table with `id`, `entity`,
`formData`, `createdAt`, `syncedAt`). When a form is submitted offline — or the
Server Action fails — the values are saved locally and a Bengali toast confirms
it. The top bar shows an offline badge and unsynced count; syncing only runs
after the user confirms the dialog. `/f/[farmId]/drafts` lists, edits and deletes
pending drafts.

Every route has loading skeletons, error boundaries and a Bengali 404; nav
links prefetch on hover/focus. The first dashboard visit shows a three-step
tutorial, the first animal triggers a short confetti burst, empty lists use SVG
illustrations, buttons use a subtle press scale, and sonner carries all Bengali
toasts. Money formatting is centralized, dates use English by default, and
dark-mode tokens are used throughout.

### Invites and roles

Invite links (`/join/[code]`) now work during signup. `/register?next=/join/CODE`
passes the code to `signUpAction`, which calls `redeem_invite()` and opens the
inviter's farm dashboard immediately. If email confirmation is required, the
code is kept in a 7-day httpOnly `khamar_pending_invite` cookie and redeemed on
the next successful login. The manual join page remains as a fallback.

Only `manager` and `member` can be assigned by the invite and member-role
flows. The owner row is created only by `create_farm()`; `updateMemberAction()`
also rejects editing the caller's own membership or any owner row even if the
UI is bypassed.

### Additional farms

Owners see `+ নতুন খামার` in the farm switcher when their current farm role is
`owner`. It opens `/farms/new`, which loads the same active global animal
categories as onboarding and calls `createFarmAction`/`create_farm()`. Each new
farm gets its own owner membership, copied categories/fields and isolated data.

### Animal purchases and status

Creating an animal with a positive purchase price also writes an `expense`
transaction with category `animal_purchase`, the price as its amount, the
purchase date, and a stable `[animal:<id>]` note marker. Editing the animal
updates that linked ledger row; clearing the price soft-deletes it. The write
uses `createAdminClient()` when the service-role key is configured, with a
user-client fallback. If the ledger write fails, the animal change is rolled
back and a Bengali error is returned. No migration or new column is needed: the
note marker is the link.

Quick status buttons are available in the desktop animal table, mobile cards
and the animal detail page for `active`, `sick`, `sold`, `dead` and
`transferred`. Sick/dead changes also create health-record audit rows; the
other statuses only update the animal. The destructive dead action asks for
confirmation, and all status changes revalidate animals, health and dashboard.

### Language, theme and number defaults

The source copy is Bengali, but the default experience is English.
`LanguageProvider` stores `khamar-language` (`en` by default) and applies
`ENGLISH_TRANSLATIONS` from `src/lib/i18n/dictionary.js` through a small
post-hydration DOM translator in `src/lib/i18n/translate-dom.js`. The toggle is
available in the app top bar, settings, landing/auth/join pages, onboarding,
`/farms/new` and route-state pages. It translates exact static text,
placeholders, titles, ARIA labels and the document title. User-entered values
and dynamic strings are left as authored.

Dark is the default theme. The root layout emits the `dark` class and a
pre-hydration script; an explicit saved `khamar-theme=light` still wins.

English digits and dates are also the default. Both server and client readers
treat `banglaDigits` as `false` unless explicitly opted in; `formatDate()` uses
`en-US` by default and `bn-BD` only when enabled. `/f/[farmId]/settings` saves
`app_settings.display.bangla_digits` and revalidates dashboard, animals,
transactions, reports, members and drafts.

---

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing/auth gate |
| `/login`, `/register`, `/join/[code]` | Auth; invite is redeemed automatically during signup or the next login |
| `/onboarding` | Create the first farm |
| `/farms/new` | Create an additional farm (owner) |
| `/f/[farmId]/dashboard` | KPIs, vaccine/sick reminders, last 10 transactions, report downloads, "রিপোর্ট দেখুন" link |
| `/f/[farmId]/animals` | List/filter, quick status toggles, new, detail, edit, CSV export |
| `/f/[farmId]/animals/[animalId]` | Details, status toggles + "স্বাস্থ্য" timeline tab |
| `/f/[farmId]/health` | Health timeline, tabs, due filter, new/edit records, CSV export |
| `/f/[farmId]/production` | Daily production records by type, linked income, CSV export |
| `/f/[farmId]/reports` | Five-tab reports with URL filters, charts, breakdowns, scoped CSV exports |
| `/f/[farmId]/transactions` | Ledger with filters, add/edit sheet or dialog, CSV export |
| `/f/[farmId]/inventory` | Stock by category, movements, add/edit items, CSV export |
| `/f/[farmId]/members` | Roles, permissions, invite codes, join log, CSV export; only manager/member assignable |
| `/f/[farmId]/drafts` | Offline draft list, inline edit, delete and sync |
| `/f/[farmId]/settings` | Farm info, language, English-first digits, archive |
| `/f/[farmId]/settings/categories` | Category manager |
| `/f/[farmId]/settings/fields` | Custom field manager |
| `/f/[farmId]/settings/export` | Bulk CSV/ZIP exports and full JSON backup |
| `/~offline` | Bengali offline fallback for the service worker |

The farm layout provides the responsive shell: collapsible sidebar, top bar
with farm switcher and `Ctrl/⌘+K` command palette on desktop; bottom tabs,
quick-add FAB and "আরও" drawer on mobile.

---

## Deployment

The app runs on any Node host that supports Next.js 16 (Vercel, a VPS with
`npm start`, or a container). The service worker and install prompt require
HTTPS, except on `localhost`.

1. Create a hosted Supabase project and apply **all** migrations in the order
   listed above. Enable email/password auth and set the production site URL and
   redirect URLs.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` as build/runtime environment variables. The
   service-role key is server-only.
3. Deploy with `npm run build` + `npm start` (or let Vercel run the build).
   `public/manifest.json`, `public/sw.js` and `public/icons/` are copied
   verbatim by Next.js.
4. After the first deploy, open the app once over HTTPS, confirm the install
   banner appears on a mobile device after the second visit, and check
   DevTools → Application → Manifest/Service Workers.
5. For bundle checks, run `npm run build -- --analyze`. The current Turbopack
   build reports about 578 KB uncompressed / 489 KB compressed first-load JS
   on `/`, and 938 KB–1.18 MB uncompressed / 645 KB–736 KB compressed on
   authenticated farm routes. JSZip (~171 KB), Dexie (~98 KB) and
   canvas-confetti (~10 KB) are dynamically imported and appear only in lazy
   chunks, not in any route's first-load chunk list.

---

## Backup and restore

**Take a backup:** open `/f/[farmId]/settings/export` and download either the
full CSV ZIP (portable, one file per entity) or the **ব্যাকআপ JSON** dump
(migration-friendly, includes configuration). Keep both if possible: CSV is easy
to inspect in a spreadsheet; JSON preserves custom fields, field definitions,
category overrides and row relationships. Store backups outside the browser and
outside Supabase.

**Restore/migrate:** there is no one-click restore UI. Create a fresh database,
apply migrations `0001`–`0012` in order, recreate the Auth users, then import
the JSON using SQL/Supabase tooling while respecting foreign keys and
`farm_id`/owner mapping. RLS is permissive only for farm members, so perform the
import with a trusted server-side role, never the anon key. Soft-deleted rows
(`deleted_at`) are included in the JSON dump and should be restored as-is to
preserve history.

**Offline drafts:** pending drafts live only in the browser's IndexedDB. They
are not part of a server backup. Sync them from the top-bar badge before
clearing site data or switching devices.

---

## Known limitations

- Live end-to-end verification requires a hosted Supabase project; only lint
  and production build have been run in this repository. Verify that migrations
  through `0012` are actually applied, since the app does not check migration
  state at runtime.
- The site-wide English layer is client-side and dictionary-based: exact Bengali
  literals are translated after hydration. New copy, dynamic strings and
  user-entered data may remain Bengali until added to
  `src/lib/i18n/dictionary.js`.
- The animal-purchase ledger link is a note marker (`[animal:<id>]`), not a
  database foreign key. Setting `SUPABASE_SERVICE_ROLE_KEY` is recommended so
  animal-only managers can still create the linked ledger row.
- File-type custom fields store a URL string; there is no storage upload yet.
- Farm archive is irreversible from the UI.
- Configurable entities are `animal`, `transaction`, `inventory`, `health` and
  `production`. Health templates are global seeds only; there is no template
  editor UI yet. Production types are enum labels (like health types); the
  owner-managed part is the custom fields on production records.
- Goat template offsets (90/365 for PPR and Goat Pox, 45/90 for deworming) are
  practical defaults; the brief did not specify them.
- iOS does not fire `beforeinstallprompt`; users must use Safari's "Add to Home
  Screen" action manually.
- JSON backup download is available, but there is no automated restore wizard.
- Offline draft sync covers the supported create forms; uploads and unusual
  inline edits are not replayed automatically.
- The 200 KB first-load JavaScript target is **not met**: current first-load JS
  is roughly 489 KB compressed on `/` and 645–736 KB on farm routes, dominated
  by the Next.js/React runtime, Supabase, TanStack Query, Radix and navigation
  UI. The Phase 6 heavy dependencies are lazy-loaded, but reaching that target
  would require a separate framework/runtime slimming effort.
