# Backend task list

The work plan for the NestJS and PostgreSQL backend, in the blocks of [PLAN.md](PLAN.md) section 17. Feature status lives in [CHECKLIST.md](CHECKLIST.md). Mark a task `[x]` when it is built, tested (unit and end-to-end), and, for anything a screen uses, wired into the frontend and checked in the browser.

Status key: `[ ]` to do, `[~]` in progress, `[x]` done, `[?]` waiting on an input, answer or decision.

## Next up

B0 and B1 are built, and the team deployed the API (checked from outside on 9 November 2026). It answers at `https://surreal.sogodesk.com/api/v1`, with nginx sending `/api/v1` to it and everything else to the website. Readiness reports the database up, the docs routes are closed, and the write guard accepts the site's own origin only. The live site has signed in through it since 9 November 2026, and Ajay tested the logins there the same day. Only accounts and sign in are real so far: the next block is B2, catalog and prices.

Not checked yet: the Secure cookie, rate limits behind nginx, SMTP.

The six admin logins are on the live database with passwords set ahead; the passwords are only in `.secrets/admin-logins.txt` in the API folder (git ignored). Waiting on Ajay:

- SMTP details: host, port, user, password, from address (B-D4, C-14). The sender is built and tested; with `SMTP_HOST` unset nothing is emailed.
- Settled 9 November 2026: a push or merge to `main` of the API repository now deploys production by itself (`DEPLOY_ENABLED=true`). It also applies any new migration to the live database, so push only when asked.

Going live with real sign in, agreed with Ajay on 9 November 2026 (the two website commits are pushed, with the flag still off):

1. Done: the team allowed 192.168.0.83 to reach port 5432.
2. Done: two test dealer logins on live, `dealer.one@surreal.test` and `dealer.two@surreal.test` (`npm run -s dealer:create-test`, `source=test`, passwords only in `.secrets/dealer-logins.txt`). Checked through localhost against the live database, in the browser and by script: sign in, wrong password, dashboard, account page, reload, log out. The deployed API knows both, so it is on the same database.
3. Done: real sign in went live on the site on 9 November 2026 (`df0d978`). It is now the default in the code, so no server setting is needed; a build with `NEXT_PUBLIC_API_AUTH=false` brings the preview back. Preview logins have ended.
   The API caught up the same day through automatic deploy (`238b181`, run 42618629151): `/auth/mfa/disable` now answers 401 instead of 404.
4. Done: Ajay signed in on the live site with the test logins and reported them working (9 November 2026). Two-factor is optional (B-D15), so the console opens after the password. Whether `sd_session` is marked Secure on live is still to be checked.

Only accounts and sign in become real at step 3: catalog, cart, orders and the dashboard's balance and invoices stay on sample data until their blocks are built, so no real dealer should sign in before then. Remove `source=test` logins and stores before real dealers go in.

SMTP: `npm run -s smtp:test` checks a mail server the way the API uses it. Tried on 9 November 2026 with a Microsoft 365 mailbox: the server answered, then refused with `535 5.7.139, SmtpClientAuthentication is disabled for the Tenant`, so no email was sent. Forgot-password and invite emails stay off until a mail service is chosen (B-D4, C-14). Sign-in emails must not go out from a TetriQ address, so production needs a Surreal-domain sender.

1. The team runs `deploy/db-roles.sql` for `surreal_db` and `surreal_db_staging`, rotates the `postgres` password, allows the API server through the firewall, and prepares the Windows server (`deploy/README.md`).
2. Ask Surreal, through Rohit, for the Thinkspace database export (Q-B1) and the other migration answers (Q-B2 to Q-B7).
3. Start B1 (accounts and sign in).

## Planning (5 November 2026)

- [x] Backend plan, schema, endpoint list, checklist and this task list (`docs/backend/`)
- [x] Thinkspace admin surveyed read only: modules, counts, fields, export routes ([DATA-MIGRATION.md](DATA-MIGRATION.md))
- [x] Frontend data inventory: 26 browser stores, every data shape, every form and business rule
- [x] Curated renders checked against Thinkspace SKUs (29 of 69 style codes match)
- [x] Decisions B-D1 to B-D3 taken: separate repository, Prisma, our own sign in (5 November 2026)

## B0. Foundation

- [x] API repository `SogoDesk/surreal_api` (private), in the local folder `surreal-diamonds-api` beside this one, git author Ganapathi-AJ
- [x] NestJS 12.3 on Node 26 as scaffolded by the v12 CLI: ES modules, strict TypeScript 6, oxlint, Prettier, Vitest
- [x] Typed config (`src/config/env.ts`): every key validated at start with one readable error; `.env.example` with no secrets
- [?] Database roles `surreal_app` and `surreal_migrator`, SSL required, `postgres` password rotated (B-D10): `deploy/db-roles.sql` written and tested on the local cluster; the team runs it on the server
- [?] `surreal_db_staging` created (B-D9): the same script creates it
- [?] Firewall: allow the API server's address to the database; SSH tunnel for developers (documented in `deploy/README.md`)
- [x] Local development: a private Postgres 17 cluster in the repository (`npm run db:local -- init|start|stop|reset`, port 5433, `surreal_dev` and `surreal_test`)
- [x] Prisma 7.10 with the pg driver adapter; first migration `init_accounts` (extensions `citext`, `pg_trgm`, `pgcrypto`; 11 enums; organizations, addresses, users, memberships, admin permissions, sessions, auth tokens, login attempts, staff two-factor)
- [x] Common layer: one error shape and filter (Prisma errors mapped), Zod pipe with OpenAPI helpers, pagination, money in cents (exact decimal math), New York dates and the 4 pm cutoff, request ids
- [x] Logging with `nestjs-pino`: cookies, auth headers and query strings kept out
- [x] Health routes `/api/v1/health` and `/api/v1/health/ready` (503 when the database is down)
- [x] OpenAPI at `/api/v1/docs` when `OPENAPI_UI` is on (refused in production) and `openapi.json` exported without a database (`npm run openapi`); CI fails if it is out of date
- [x] Next.js: `/api/v1/*` rewritten to `API_INTERNAL_URL` (inactive when unset, so the site can ship first); typed client in `src/lib/api/` (`npm run api:types`); checked end to end on localhost
- [x] Deploy workflow and `deploy/deploy.ps1`: build, migrate as `surreal_migrator`, copy, PM2 restart, wait for readiness; staging from `staging`, production from `main`; `DEPLOY_ENABLED=true` since 9 November 2026 and production proved on a real merge. The team's fixes: the API runs on its own Node 26 (`C:\deploy\node26`, system Node 24 stays for other apps), `npm ci` runs only when `package-lock.json` changes, and the API stops during that install, so a failed install leaves it down
- [x] CI workflow: types, lint, unit and end-to-end tests on Postgres 17, build, OpenAPI check
- [~] Daily `pg_dump`, newest 14 kept, a copy of each dump to a second place (stronger than the planned weekly copy): `deploy/backup.ps1`, see below; the team schedules it and runs the restore check on the database PC
- [x] The Windows server for production: runner labelled `surreal-api`, `C:\deploy\surreal-api\production` with its `.env` (`NODE_ENV=production`), PM2 process `surreal-api`. Staging folder not set up. `MFA_ENCRYPTION_KEY` backup still to be confirmed by the team. `deploy/README.md` updated for Node 26, the PM2 restart and `SITE_ORIGIN` (with the backup commit)
- [x] Safeguards for working on live: destructive Prisma commands and tests refused unless the target is this machine; new migrations created locally, applied with `prisma:deploy`
- [x] Migrations applied to the live database as `surreal_migrator` (6 November 2026), after the team rebuilt it as UTF-8
- [~] Windows backup for Task Scheduler: `deploy/backup.ps1` and setup steps in `deploy/README.md` section 4, written 9 November 2026. Logic tested with PowerShell 7 and PostgreSQL 17 on a throwaway cluster (13 scenarios). The README's old restore steps were wrong and are replaced with tested ones (section 5). Pushed as `cb4c7b0` the same day. Still to do: the team sets it up on the database PC, which is also the first run on Windows PowerShell, PostgreSQL 18 and the folder lock; choose the second place for copies. Nothing alerts anyone when a run fails, so email it once a mail service exists
- [x] First production deploy, by the team (seen 9 November 2026 at `https://surreal.sogodesk.com/api/v1`). Staging not set up

## B1. Accounts and sign in

- [x] Tables: organizations, organization_addresses, users, memberships, admin_permissions, sessions, auth_tokens, login_attempts, staff_mfa
- [x] Password hashing (argon2id), rules as in `src/lib/auth.ts`, lockout after 5 failures for 15 minutes (counted in one SQL statement, so parallel tries cannot slip past)
- [x] `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; session cookie (HttpOnly, SameSite=Lax, Secure on staging and production); site header and origin check on writes; rate limits per address
- [x] Set-password and reset links: create, look up, resend, complete; older links revoked; single use; 72 hour and 1 hour expiry. Email itself waits for B5: links reach the log on a developer's machine only
- [x] Access rules: every route closed unless marked public; signed in, dealer, owner, permission, staff, staff module (view or edit); store scoping from the session
- [x] Staff: TOTP enrolment and verification with encrypted secrets, recovery codes, 12 hour sessions. Optional per person since 9 November 2026 (B-D15): off until the person turns it on from the console, and once on no console route answers before a code; turning it off needs the password on a session that passed its code
- [x] Role matrix in a migration (45 rows, from `src/content/admin.ts`, C-05 may change it); `npm run staff:create` for the first administrator. No test accounts on live: tests create their own on the local database
- [x] People on the account: list, invite, change role and permissions, remove (owner only, own store only, always one owner left)
- [?] Django `pbkdf2_sha256` verification and rehash (Q-B1)
- [x] Frontend switched behind `NEXT_PUBLIC_API_AUTH`: LoginPage, SetupPage, AccountSettings, sign out, `SessionSync` in the layout, `StaffGate` (password, QR enrolment, code, recovery codes) and change password in the console. Checked in the browser against a local API; with the flag off a production build behaves as the site does today
- [ ] Remove the preview path (`surreal-dealer` as a source of truth, `surreal-staff`, `surreal-credentials`, `surreal-login-attempts`, `surreal-invites`, test accounts, demo dealer) once the API is deployed and the flag is on in production
- [x] End-to-end tests against the API for docs/TESTING.md T-02 to T-14 and T-20 to T-24 (T-15 and T-16 need billing and the screens; T-30 to T-39 are the import, B6): 83 end-to-end and 52 unit tests
- [x] Six admin logins on live, passwords set ahead, role administrator (`staff:create --set-password`)
- [ ] A screen for inviting people and changing permissions (the API routes exist)
- [ ] Staff cannot yet reset someone's lost two-factor from the console: B6

## B2. Catalog and prices

- [ ] Tables: categories, divisions, collections, tags, products, product_variants, carat_options, media_assets, product_media, product_relations, render_mappings
- [ ] Seed from `src/content/catalog.ts`, `divisions.ts`, `grounds.ts`, `featuring.ts` (82 curated pieces) for local and staging
- [ ] File storage service (B-D5): public and private, image sizes with `sharp`
- [ ] `GET /catalog/*` with filters, sorts, pins; prices only for dealers
- [ ] Pricing: pricing_groups, price_lists, price_list_items, stone_price_rules; one price function used by every endpoint
- [?] Surreal's price list (Q8)
- [ ] Console: product list, flags, metals on and off, default metal (`PATCH /admin/products/:id/metals`)
- [ ] Bulk product upload with dry run (A1)
- [ ] Frontend: StorePage, ProductPage, QuickView, Featured, the console's Inventory switch to the API; remove `surreal-metals`

## B3. Stones

Console built 16 November 2026 (website 13711e2, local): Add a stone and Upload stones check everything and say "not saved yet". The upload reads the test feed as is: 5,511 ready, 1 skipped (PINK), 157 with a note (repeated stock IDs). The same reader (`src/lib/inventoryImport.ts`) is the spec for the server importer. Add a piece and Upload pieces likewise wait for B2.

Test feed received 9 November 2026 (5,512 stones) and checked: [FEED-CHECK.md](FEED-CHECK.md). It changes this block: stones key on certificate number because `SBD` codes repeat, and the first load can come from this feed instead of the Thinkspace export.

- [ ] Tables: stones, stone_holds, suppliers
- [ ] `GET /stones` with every filter of `DiamondQuery`, sorts, cursor paging; `GET /stones/facets`; `GET /stones/:stockId`
- [ ] Indexes for the common filters; search on stock id and certificate number
- [ ] Holds: reserve in one conditional update, expiry job, release on cancel
- [ ] Staging seed from the Thinkspace diamond export (13,913 stones)
- [ ] Frontend: DiamondSearch, StoneDrawer, Legacy stones, search; remove the 260-stone sample

## B4. Cart, checkout, orders, payments

- [ ] Tables: carts, cart_lines, orders, order_lines, order_events, shipping_methods, number_sequences, payments, payment_allocations, payment_methods
- [ ] Cart endpoints with merge by line key, stone lines held on add or at checkout (decide which)
- [ ] Checkout: validation as `CheckoutPage`, terms, server-side cutoff (4 pm Eastern weekdays), `SD-YYMMDD-NNNN` numbers
- [ ] `POST /orders`: one transaction for the order, its lines, stone holds and memo requests
- [ ] Dealer orders: list with ranges, detail with dealer-visible events, reorder, CSV
- [ ] Console order workflow: confirm (price snapshot), ship, deliver, cancel, notes, payment steps
- [?] Card and ACH with Surreal's processor, webhook, saved tokens (D1, C-10)
- [ ] Order confirmation emails (with B5's outbox)
- [ ] Frontend: CartPage, MiniCart, CheckoutPage, OrdersPage, DashboardHome, DealerHome, AdminOrders; remove `surreal-cart`, `surreal-orders`, `surreal-order-work`, `surreal-payment-methods`

## B5. Memo, billing, requests, inquiries, email

- [x] Sign-in links over SMTP (`SmtpAuthLinkSender`, house-style template, TLS required off this machine), tested against a real SMTP conversation. They go out directly, not through a stored queue, so no working link sits in the database
- [ ] Email for everything else: outbox table, queue job with retries, templates, recipients per event
- [?] Sending domain and provider (B-D4, C-14)
- [ ] Memo requests, memo lines, reconciliations (`MR-` numbers), the memo page endpoints
- [ ] Billing endpoints on the invoices, credits, payments and balances tables (filled by B7; sample seed on staging until then)
- [ ] Pay invoices: payment pending posting, console list to post
- [ ] Requests: M2O (every field), Custom (with private uploads), Legacy; dealer list; status events
- [ ] Inquiries: store, route by team, acknowledgement, honeypot, rate limit, challenge
- [ ] Trade shows and meeting requests
- [ ] Frontend: MemoReport, InvoicesPage, InvoiceDocument, PaymentMethods, MadeToOrderPage, ContactPage and ContactDrawer (replace the server action stub), TradeShows; remove `surreal-memo`, `surreal-memo-reports`, `surreal-invoice-payments`, `surreal-m2o`, `surreal-custom`, `surreal-show-meetings`

## B6. Console, merchandising, activity

- [ ] Merchandising: Hot this week, pins, sorts, looks
- [ ] Banners and the pop-up promo (versions)
- [ ] Dealers: list, status counts, import wizard on the server (mapping, dry run, commit, setup links), history; Add a dealer (form built 16 November 2026)
- [x] Staff: named logins, roles, access matrix view, audit log view (16 November 2026). API 21b3b03: `staff_roles` table replacing the `staff_role` enum (data kept in place, five built in roles seeded), `audit_events`, `/admin/staff` (list with last sign in, two factor, open sessions; add with setup link; role; disable and enable; new link; remove a never used login), `/admin/roles` (custom roles, administrators only; built in roles fixed), `/admin/activity` (staff sign ins, failed sign ins and every change). `/auth/me` gives the role's name and access, so custom roles lock the console from the server. When email cannot be sent, the setup link comes back to the administrator to pass on. 17 new end to end tests, 111 in all. Website 0eb66ba wires the console to it; preview mode keeps browser storage. Website 513b956 fixes a stale session copy after signing in from the login or setup page.
  - Live since 16 November 2026: the team gave `surreal_db` back to `surreal_migrator` with `deploy/restore-ownership.sql`; API deploy 43873917534 applied `staff_roles_and_audit` (every role and all 45 access rows kept, `surreal_app` granted on the new tables); website deploy 43874347336 put the screens live.
- [x] `npm run -s staff:role -- --email <email> --role <role>` (API b88eadd, local): changes a role and nothing else. Used on 16 November 2026: Aaditya and Rohit Administrator, Sujith Manager, Info Sales, Shubham Accounts / Finance, Vinay HR. Test logins table in the API's git-ignored `.secrets/role-test-logins.md`
- [ ] Overview figures
- [ ] Requests and inquiries queues (after C-05)
- [ ] Recently viewed and wishlist per person
- [ ] Site search and dashboard search
- [ ] Audit log on every console write
- [ ] Frontend: AdminMerch, AdminBanners, AdminPromo, AdminDealers, AdminStaff, AdminOverview, PromoPopup, Hero; remove `surreal-merch`, `surreal-promo`, `surreal-customers`, `surreal-customer-imports`, `surreal-recent`, `surreal-wishlist`

## B7. RightClick and supplier feeds

- [?] RightClick access: API user, key, password, serial; our fixed address allow-listed (C-07)
- [ ] Client with the stored session, renewal on expiry, error back off
- [ ] Queue `rightclick`, one worker, 20 calls a minute; call log
- [ ] Jobs: changes, stones, jewelry, invoices, receipts, orders, memo, customers, tables, session (RIGHTCLICK.md schedule, staggered)
- [ ] Live check and hold before an order or memo is confirmed; orders and memos written into RightClick
- [ ] Per-dealer balance and statement on demand, cached 15 minutes
- [ ] Console RightClick sync on `sync_settings` and `sync_runs`; run now; Excel upload fallback
- [?] Supplier feeds: one adapter per feed (feed details from Surreal)
- [ ] Frontend: AdminSync; remove `surreal-sync-settings`

## B8 and M. Thinkspace import, UAT, cut-over

- [?] Export route agreed with Surreal and Thinkspace (Q-B1)
- [ ] Import framework: a CLI command per importer, dry run report, `legacy_id`, `import_batches`
- [ ] Reference data: metals, shapes, colors, clarities, grades, labs, shipping methods
- [ ] Catalog: 377 products, 1,075 variants (the product feed CSV plus the product list), types, collections, tags, flags, related pieces
- [ ] Images downloaded from files.jewelfeed.com, resized, stored
- [ ] Curated pieces matched: automatic for direct SKU matches, a sheet for the rest (Q-B7)
- [?] Stores, addresses, users, memberships (Q-B4, Q-B6)
- [ ] Order history: 1,557 orders with lines matched by SKU and stock id
- [?] Optional archives: M2O, Jewelry Order Form, memo reconciliations (Q-B2)
- [ ] Staging rehearsal: full import, Surreal's two testers run UAT (C-15)
- [ ] Invitation waves (or silent move if hashes arrive), counts watched in the console
- [ ] Production import, test accounts removed, Thinkspace URLs redirected, DNS cut-over (M4)
