# Vietnam DMC — Internal Quotation & Inventory Platform

An internal B2B ERP for travel consultants, sales, operations, and finance —
not a customer-facing site. Built on Next.js 15 + React 19 + TypeScript +
Tailwind, with a custom session-cookie auth system, a **local Excel workbook
as the entire database** (behind an abstraction that makes a future
Postgres/Supabase migration a swap, not a rewrite), Framer Motion, Recharts,
and a premium Bento-grid design system.

Runs **completely offline**: `npm install && npm run dev` and you're done —
no cloud account, no API keys, no service account, no external database.
Every table lives in one file: `database/data.xlsx`, created automatically
the first time you run the app.

## Storage: one local file, no external service

All data — Users, Roles, Permissions, Hotels, Transport, Activities,
Suppliers, Customers, Quotations, Bookings, Payments, Invoices, Audit Logs —
lives in `database/data.xlsx`, one sheet per entity. There is nothing else:
no database server, no cloud spreadsheet, no credentials to configure.

- **`src/lib/excel.ts`** is the entire storage engine. It creates the
  workbook (with all 10 baseline sheets + header rows) the first time it's
  needed, auto-creates any additional sheet a repository asks for, and
  serializes every write onto a single in-process queue
  (`withSheetTransaction`) so two concurrent requests can never race each
  other into a corrupt or duplicate-ID state — the second transaction
  always sees the first one's result, because they literally cannot run at
  the same time. Every save writes to a temp file first, then
  `fs.renameSync`s it over the real workbook (atomic on the same
  filesystem), so a crash mid-write can never leave a half-written file
  behind.
- **`src/lib/repositories/excel/excelTable.ts`** (`ExcelTable<T>`) is a
  generic table wrapper — list/get/append/updateById/deleteById, plus
  `appendComputed` for anything that needs a sequentially-generated ID
  (booking numbers, quote numbers) computed *inside* the same locked
  transaction as the insert, not as a separate read beforehand. That
  distinction matters: reading "the current max ID" and inserting are two
  different operations, and doing them separately is exactly the kind of
  race that corrupts a shared file under concurrent writers. Every entity
  repository under `src/lib/repositories/excel/` is a thin set of
  row↔object mappers on top of this one class.
- Every repository keeps the exact same interface it always had
  (`list()`, `get()`, `create()`, `update()`, `getByEmail()`, ...) — the
  storage layer changed underneath them, but no server action, page, or
  component anywhere in the app needed to change. A few repositories also
  expose `getAll()` / `find()` / `findByEmail()` / `delete()` as extra
  aliases on top of that, purely so the shape matches a conventional CRUD
  repository if you're calling them from a script or a new feature.
- **Permissions are still code, not data.** `src/lib/rbac.ts`'s `PERMISSIONS`
  catalog is the single source of truth for every permission check
  (`requireAuth`, `hasPermission`) — a security-sensitive decision that
  shouldn't be re-derived from a spreadsheet cell someone could edit at
  runtime. `ExcelPermissionRepository` mirrors that catalog into the
  Permissions sheet (so it's visible if you open the workbook directly) but
  always reads from and validates against the code catalog, never the sheet.
- **Customers and Invoices** get their own sheets and full CRUD
  repositories (`ExcelCustomerRepository`, `ExcelInvoiceRepository`) as
  scaffolding for future features — nothing in the current UI reads or
  writes them yet (TravelQuery carries guest contact info inline today, and
  Bookings/Payments are what the app actually uses for money in/out). They
  exist so a future "link a query to a returning customer" or "generate an
  invoice" feature doesn't need another storage migration.
- **One important deployment caveat**: this reads and writes a file on
  local disk, which requires a writable, persistent filesystem. That's
  exactly what `npm run dev` and a normal self-hosted `next start` on a VM
  give you. It will **not** work on a serverless platform with a read-only
  or ephemeral filesystem (e.g. Vercel's default deployment model) — the
  workbook would either fail to write or reset on every cold start there.
  Self-host it (a VM, a container with a persistent volume, `pm2`, etc.) if
  you deploy this anywhere beyond your own machine.

## What's implemented right now

- **Auth**: self-hosted, no third-party auth vendor. `src/lib/session.ts`
  signs an httpOnly cookie (Web Crypto HMAC-SHA256, 12h TTL, carries only a
  user id — never role/permissions, so a role change applies immediately
  instead of waiting for the cookie to expire). `src/lib/password.ts` hashes
  with bcrypt (12 rounds), stored in the Users sheet's `passwordHash`
  column. `src/lib/csrf.ts` double-submit-cookie protects the login form
  (Server Actions already get Next's built-in Origin-header CSRF check). 5
  failed logins locks an account for 15 minutes (`src/lib/auth.ts`). Every
  login/logout/failure/permission-denial is written to the Audit Logs sheet.
  The login flow is exactly `userRepository.getByEmail(email)` →
  `verifyPassword()` → sign a session cookie — unchanged in shape from
  before the storage migration.
- **First-run bootstrap**: a brand-new `database/data.xlsx` has no roles and
  no users, so nobody could log in. `ensureBootstrapData()` in
  `src/lib/auth.ts` runs the first time anyone calls `login()`: it seeds the
  four default roles and one Super Admin account (from `SUPER_ADMIN_EMAIL` /
  `SUPER_ADMIN_PASSWORD`), then never touches either sheet again once
  they're non-empty.
- **RBAC — fully dynamic, not hardcoded**: `src/lib/rbac.ts` is only the
  *catalog* of permission keys the app understands. Which permissions a role
  actually grants is data, stored in the Roles sheet and editable at
  `/roles` — create a role, rename one, add/remove permissions, and it takes
  effect on every affected user's very next request. Users and their role
  assignments are managed at `/users`. Every server action calls
  `requireAuth(permission)` before touching data, which re-resolves the
  caller's permission set from the Users/Roles repositories on every call
  (React `cache()`-deduped within one request, never trusted from the
  session cookie). Supplier cost / profit / margin are hidden from roles
  without `quotation.view_supplier_cost` / `quotation.view_pricing`
  throughout, and never appear in the PDF or any send.
- **Bookings & Accounts — the dashboard's only source of truth**: confirming
  a quotation (`confirmBookingAction`, gated by `booking.manage`) is the
  single place a `Booking` record is created — it snapshots the quotation's
  cost/selling/profit at that exact moment, so a later rate-sheet change
  never rewrites an already-confirmed booking's history. `Payment` records
  (gated by `accounts.manage`) are recorded against a booking from either
  its detail page or the global `/accounts` ledger, tagged `Received` (from
  the customer) or `Paid` (to a supplier). `ComputedStatsRepository`
  (`src/lib/repositories/computedStatsRepository.ts`) is what actually
  powers the dashboard: every figure — today's queries, pending/confirmed
  counts, upcoming trips, monthly revenue (sum of `Received` payments this
  month), monthly profit (sum of confirmed bookings' profit this month),
  6-month sales performance, top destinations, popular hotels, recent
  activity — is computed fresh from the sheets on every request. Nothing is
  hardcoded, so a fresh workbook genuinely starts at $0 and empty lists
  until real bookings and payments exist. Revenue/profit widgets are hidden
  from roles without `quotation.view_pricing`.
- **Dashboard**: Bento grid, animated counters, Recharts sales-performance
  chart, all reading from the repository layer.
- **New Inquiry**: RHF + Zod, generates sequential `VNQ-YYYY-NNNNNN` IDs
  (computed atomically inside the write transaction — see the storage
  section above for why that matters).
- **Inventory** (Hotels / Transport / Activities / Suppliers): every one has
  a full add flow (Hotels also has live duplicate-hotel detection), gated by
  `inventory.manage_*` permissions, cost hidden from Sales. Hotels,
  Transport, and Activities also have an optional "Available From / To"
  date-range field (rate validity window) that shows a computed day count.
- **Quotation Builder** (`/queries/[id]/quotation/[quotationId]`): tabbed
  Basic Details / Hotels / Transport / Activities / Pricing / Internal
  Comments / Documents. Line items pull cost & selling price **from the
  inventory record server-side** — never trusted from the client.
  `src/lib/pricing.ts` is the single source of truth for
  cost → markup → discount → GST → final price → profit → margin, and the
  source the Booking snapshot is taken from.
- **Documents tab**: PDF (React PDF, customer-safe fields only, enforced at
  the call site), and a **Draft a Message** panel for Email/WhatsApp — it
  composes the subject/body (with a link to the PDF) and gives you Copy or
  Open-in-Mail/WhatsApp buttons; the app itself never sends anything through
  any API, there's no Resend or WhatsApp Business account involved at all.
  Every draft is logged to Message Drafts (Sent History) for an audit trail.
  Also has a **Confirm Booking** action once a quotation is ready.
- **Global search**: the command palette (⌘K / Ctrl+K) does real, debounced
  search across Inquiries, Hotels, and Suppliers (`src/lib/search.ts`), in
  addition to jumping to any nav section.
- **Reports / Settings / Profit / Upcoming Trips / Bookings / Accounts /
  Users / Roles / Audit Logs**: working pages backed by real data.
- Dark mode via `next-themes`, collapsible sidebar, glassmorphism topbar.

## Getting started

```bash
npm install
cp .env.example .env.local
```

### 1. Auth (the only required setup step)

No external account needed — just two values in `.env.local`:

1. Generate a session secret: `openssl rand -base64 48` → paste into
   `SESSION_SECRET`
2. Set `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — these seed your first
   login the moment you use them (see "First-run bootstrap" above). Super
   Admins bypass every permission check; the flag can't be granted through
   the Users GUI, only by editing the Users sheet directly.
3. `npm run dev`, go to `/login`, sign in with those credentials
4. Change the password immediately from `/users` — the default one is not
   safe to leave in place anywhere real

Once logged in, manage everyone else from `/users` (create accounts, assign
roles, deactivate) and `/roles` (create/edit/delete roles, toggle exactly
which permissions each one grants) — both fully GUI-driven, no code changes,
and both persisted straight to `database/data.xlsx`.

### 2. Run it

```bash
npm run dev
```

The first request creates `database/data.xlsx` automatically — you don't
need to touch it, but you're welcome to open it directly in Excel/Numbers/
Google Sheets to inspect the raw data (close it before the app writes again,
the same way you would with any file another program has open).

Try it end to end: **New Inquiry** → open it → **Create Quotation** → add
hotel/transport/activity lines from inventory → **Pricing** tab → set
markup/discount/GST, watch profit & margin compute live → **Documents** tab
→ Download PDF / **Draft a Message** (copy it or open your own mail/
WhatsApp) / **Confirm Booking** → find it under **Bookings**, record a
payment, watch **Accounts** and the **Dashboard** update. Then try **⌘K**
and search for an inquiry ID, hotel name, or supplier.

## Project structure

```
database/data.xlsx                      — the entire database (auto-created, gitignored)
src/lib/excel.ts                        — storage engine: workbook creation, sheet auto-creation, locked transactional writes, atomic saves
src/lib/repositories/types.ts           — storage-agnostic interfaces (12 business + 4 identity/config entities)
src/lib/repositories/excel/excelTable.ts — generic table wrapper every repository is built on
src/lib/repositories/excel/             — one file per entity: row↔object mappers on top of ExcelTable
src/lib/repositories/index.ts           — composition root, wires up every repository + ComputedStatsRepository
src/lib/repositories/computedStatsRepository.ts — the entire dashboard, computed live, nothing hardcoded
src/lib/rbac.ts                         — permission catalog + DEFAULT_ROLE_SEEDS (roles themselves are data, not code)
src/lib/auth.ts                         — login(), logout(), requireAuth(), ensureBootstrapData()
src/lib/session.ts                      — signed httpOnly session cookies (Web Crypto HMAC)
src/lib/password.ts                     — bcrypt hashing + strength validation
src/lib/csrf.ts                         — CSRF token (login form) + Origin check (export routes)
src/lib/audit.ts                        — audit log writer
src/lib/pricing.ts                      — server-authoritative pricing engine (also the Booking snapshot source)
src/lib/email.ts / whatsapp.ts          — send integrations (simulated without credentials)
src/lib/pdf/QuotationDocument.tsx       — customer-facing React PDF template
src/lib/search.ts                       — global search across queries/hotels/suppliers
src/middleware.ts                       — session-cookie route protection (Edge runtime — never touches the Excel file directly; that's Node-only, handled entirely in requireAuth() on the server)
src/components/layout/                  — Sidebar, Topbar, CommandPalette
src/components/dashboard/               — BentoCard, AnimatedCounter, chart
src/app/login/                          — login page + server action
src/app/api/quotations/[quotationId]/pdf/ — PDF generation endpoint
src/app/(app)/dashboard/                — Bento grid dashboard, computed from real data
src/app/(app)/queries/                  — list, new, detail, quotation builder + send actions + confirmBookingAction
src/app/(app)/bookings/                 — booking list, detail, payment history + recording
src/app/(app)/accounts/                 — global payments ledger
src/app/(app)/hotels|transport|activities|suppliers/ — inventory + add forms
src/app/(app)/users|roles|audit-logs/   — identity & RBAC admin screens
src/app/(app)/reports|settings|profit|trips/upcoming/ — supporting pages
```

## Roadmap (not yet built)

- Customers and Invoices have sheets + full repositories but no UI yet —
  the app doesn't currently link a query to a standalone customer record or
  generate a formal invoice document (Bookings/Payments cover money in/out
  today)
- Refunds/partial-cancellation handling on Bookings (currently Cancel just
  flips status — it doesn't reverse recorded Payments)
- Version history, drag-and-drop itinerary builder, currency conversion,
  CSV/Excel export of reports, auto-save drafts
- Multiple package types per quotation (Standard/Premium/Luxury side by
  side) — currently one package per Quotation record
- Edit/deactivate flows for inventory items (currently create + list; no
  update UI yet, though `update()` exists on every repository)
- Audit logging is currently wired into auth (login/logout/lockout),
  User/Role management, Bookings/Payments, and permission denials;
  extending it to inventory-item mutations is straightforward (same
  `logAudit()` call) but not yet done for those action files
- Multi-instance / multi-process deployment: the write queue in
  `src/lib/excel.ts` serializes writes *within one Node.js process*. Running
  multiple app instances against the same `database/data.xlsx` (e.g. behind
  a load balancer) isn't safe as-is — that would need either sticky
  sessions to one instance, or moving the lock into something
  cross-process (a lockfile, or eventually a real database).

## Notes from the build environment

This storage migration (Google Sheets → local Excel) was built without
network access in the sandbox, so `npm install` / `next build` could not be
run here — please run both locally before deploying. Every repository
method's field names and call sites were traced by hand against the actual
domain types and every caller across the app (not guessed at), and I found
and fixed a real concurrency bug along the way: the original sequential-ID
generation (booking numbers, quote numbers) read the "current max" and
inserted as two separate steps, which two simultaneous `create()` calls
could race — fixed by moving ID computation inside the same locked
transaction as the insert (`ExcelTable.appendComputed`). Still, a local
build is the only way to catch anything a type checker would have.

- **Email/WhatsApp are draft-only, by design** — the app composes the
  message and hands off to `mailto:`/`wa.me` links plus a copy-to-clipboard
  button; it never calls any email or messaging API itself, so there are no
  external accounts or credentials involved for this feature at all. The
  entire app — including auth and storage — now runs with zero external
  accounts of any kind.
