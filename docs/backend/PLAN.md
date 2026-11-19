# Surreal Diamond backend plan: NestJS and PostgreSQL

Status: **decided and in progress**. Proposed 5 November 2026; the same day Ajay chose a separate repository, Prisma and our own sign in (B-D1 to B-D3), and B0 started in `surreal-diamonds-api` (see [TASKS.md](TASKS.md)).

This is the plan for the API and database behind the Next.js site in this repository. It replaces the hosted-services proposal in [../ARCHITECTURE.md](../ARCHITECTURE.md) where the two disagree: the backend is our own **NestJS** API with **PostgreSQL**, self-hosted on the team's private server next to the frontend, instead of Vercel, Neon and Clerk. The rest of ARCHITECTURE.md (RightClick as the source of stock, the B2B access rules, the data areas) still holds.

The tracking files for this plan:

| File | What it holds |
|---|---|
| [PLAN.md](PLAN.md) | This file: architecture, modules, rules, deployment, decisions |
| [SCHEMA.md](SCHEMA.md) | The database, table by table |
| [API.md](API.md) | Every endpoint, grouped by module, with the screen it serves |
| [DATA-MIGRATION.md](DATA-MIGRATION.md) | The Thinkspace survey: what exists, what we take, how it maps |
| [CHECKLIST.md](CHECKLIST.md) | Every frontend feature and the backend piece that serves it, with status |
| [TASKS.md](TASKS.md) | The work plan in blocks, checkboxes to tick as we go |

## 1. Goals

1. Replace every sample file and browser-storage store in the frontend with real data, screen by screen, without changing the design.
2. One API for the three audiences already built: the public site, the dealer side (store, cart, checkout, dashboard) and the staff console.
3. Keep RightClick as the source of truth for stones, memo, invoices and customer balances (C-07). We mirror it on a schedule, check it live before selling, and write orders, memos and holds back.
4. Bring the existing Thinkspace data across: catalog, dealers, users, order history ([DATA-MIGRATION.md](DATA-MIGRATION.md)).
5. Run on the team's private server, deployed the same way as the frontend.

Out of scope here: Phase 2 (Enterprise Level Integration), and anything the BRD leaves to Surreal's existing systems.

## 2. Stack

| Layer | Choice | Version (5 Nov 2026) | Why |
|---|---|---|---|
| Runtime | Node.js LTS | 26 (Lithium) | Current LTS; the same runtime as the frontend server |
| Framework | NestJS, Express adapter, ES modules | 12.3 | Modules, guards, DI and testing out of the box; v12 scaffolds as ES modules with TypeScript 6 |
| Database | PostgreSQL, `surreal_db` on the team server | server version to confirm (16 or newer) | Relational data: dealers, orders, memo, stones |
| ORM and migrations | Prisma (driver adapter `@prisma/adapter-pg`) | 7.10 | Schema in one file, versioned SQL migrations, typed client, seed scripts |
| Validation | Zod with our own pipe and OpenAPI helpers (`src/common/validation/zod.ts`) | Zod 4.6 | One schema validates input and documents it; `nestjs-zod` does not support NestJS 12 yet |
| API docs | OpenAPI from `@nestjs/swagger` | 12.1 | The frontend generates its types from it (`openapi-typescript` 7.13) |
| Passwords | argon2id (`argon2`) | 0.45 | Current standard; Django PBKDF2 hashes verified once on import (section 5) |
| Sessions | Server sessions in Postgres, httpOnly cookie | | Instant sign-out when staff disable a dealer |
| Staff two-factor | TOTP (`otplib`) | 13.6 | Optional authenticator app codes for console logins (B-D15) |
| Jobs and queue | `pg-boss` plus `@nestjs/schedule` | 12.38 | A job queue inside Postgres: no Redis to run on the server |
| Email | Nodemailer over SMTP | 10.3 | Works with whichever sender Surreal chooses (B-D4) |
| Files | S3-compatible storage, or the server's disk (B-D5); `sharp` for image sizes | sharp 0.35 | Public media and private uploads kept apart |
| Spreadsheets | `exceljs`, `csv-parse` | | Thinkspace imports, RightClick fallback upload, console exports |
| Logs and health | `nestjs-pino`; our own health controller | | JSON logs with personal data redacted; `/health` and `/health/ready` for PM2, the deploy and monitoring |
| Security middleware | `helmet`, `@nestjs/throttler` | | Headers and rate limits |
| Tests and lint | Vitest and oxlint (the NestJS 12 defaults), Supertest against `surreal_test` | | Unit tests for rules, end-to-end tests per module |
| Process manager | PM2 on the private server | | As the frontend runs today |

ARCHITECTURE.md proposed Drizzle; Prisma was chosen (B-D2) because its schema file doubles as living documentation and its migration history is easy to review.

## 3. How it fits together

```
Dealer / staff browser
        │  https://surrealdiamond.com
        ▼
Next.js site (PM2: surreal-web)  ── /api/v1/* rewritten ──►  NestJS API (PM2: surreal-api, 127.0.0.1:4000)
                                                                │
                     ┌──────────────────────┬───────────────────┼────────────────────┬──────────────────┐
                     ▼                      ▼                   ▼                    ▼                  ▼
            PostgreSQL surreal_db    RightClick API       Supplier feeds        SMTP sender     File storage
            (team server)            (fixed outbound IP)  (every 30 min)        (Surreal domain) (public, private)
```

**One origin.** The browser only ever talks to `surrealdiamond.com`. Next.js rewrites `/api/v1/*` to the API on the private network (`API_INTERNAL_URL`), so there is no CORS, the session cookie is first-party, and the API port is never exposed to the internet. Server components and server actions call the API directly on the internal URL and forward the visitor's cookie. If the API later needs its own public host (for a payment processor callback or a partner), `api.surrealdiamond.com` can be added in front of the same process.

**Versioned routes.** Everything lives under `/api/v1`. Responses are JSON; list endpoints page with `?page=&pageSize=` (or a cursor for the stone list) and return `{ items, total }`.

**Errors.** One shape everywhere: `{ error: { code, message, fields? } }` with the HTTP status. Validation errors list each field, so the forms already built can show them inline.

## 4. Modules

Each NestJS module owns its tables and its endpoints. Endpoint detail is in [API.md](API.md); tables in [SCHEMA.md](SCHEMA.md).

| Module | Owns | Serves (frontend) |
|---|---|---|
| `auth` | sign in, sign out, sessions, password reset, set-password links, staff two-factor | `/login`, `/account/setup`, the console sign-in |
| `organizations` | dealer stores, addresses, pricing group, sales rep, status | dashboard Account, checkout store details, console Dealers |
| `users` | dealer users, associates and their permissions, staff users and roles | dashboard Authorized users, console Dealers and Staff |
| `catalog` | categories, divisions, collections, tags, products, variants, metals, media, related pieces | `/jewelry`, `/jewelry/[category]`, product pages, Quick View, Hot this week |
| `stones` | the diamond inventory mirror, filters, facets, holds | `/diamonds`, `/legacy/stones`, stone Quick View |
| `pricing` | price lists, pricing groups, the dealer price of any variant or stone, retailer mode multipliers | every price shown to a signed-in dealer |
| `cart` | the dealer's cart across devices | mini cart, `/cart` |
| `orders` | checkout, orders, order lines, status events, quick reorder, the next day cutoff | `/checkout`, dashboard Orders, homepage quick reorder, console Orders |
| `payments` | payment intents with Surreal's processor, ACH and wire instructions, recording payments | checkout payment step, dashboard Billing (B-05, decision D1) |
| `memo` | memo lines, memo requests, reconciliations | dashboard Memo, Get on memo in Quick View |
| `billing` | invoices, statements, aging, payments pending posting | `/dashboard/invoices` |
| `requests` | Made to Order, Legacy and Custom requests with their files | `/diamonds/made-to-order`, Legacy, Custom |
| `inquiries` | contact and Become a Dealer messages, routing, acknowledgements | `/contact`, the contact drawer |
| `merch` | Hot this week, pins and sort per page, banners, promotions | homepage, store pages, console Merchandising, Banners, Promo |
| `content` | the few staff-edited texts (trade shows, dashboard resources) | dashboard resource pages |
| `search` | one search across pieces, stones and pages | header search, `/search` |
| `activity` | recently viewed, per dealer | homepage dealer band |
| `sync` | RightClick client and queue, supplier feeds, upload fallback, job runs | console RightClick sync, every stone and memo screen |
| `imports` | Thinkspace and Excel imports with dry runs and batch records | console Dealers import, the migration (DATA-MIGRATION.md) |
| `files` | uploads, image sizes, signed access to private files | product media, request uploads, banners |
| `notifications` | email templates, the outbox, recipients per event | every confirmation and staff alert |
| `audit` | who changed what in the console | console, every staff write |
| `health` | liveness and readiness | PM2, monitoring |

Shared code lives in `common/` (guards, decorators, the error filter, money and date helpers, pagination) and `prisma/` (the client and transaction helper).

## 5. Accounts, sign in and roles

**Who signs in.** Two kinds of user in one `users` table:

- **Dealers**: people at a retail store. A store is an `organization`; a person belongs to it through a `membership` with the role **Dealer** (full ordering and billing) or **Associate** (permissions set by the store's dealer, as the dashboard's Authorized users screen offers). Every dealer query is scoped to the store in the session, never to an id sent by the browser.
- **Staff**: Surreal employees with one of the five console roles (Administrator, Accounts / Finance, HR, Sales, Manager). The console's access matrix in `src/content/admin.ts` becomes a permission table, checked on the server for every console route (C-05 confirms the matrix).

**Sessions.** On sign in the API creates a random 256-bit token, stores only its SHA-256 in `sessions`, and sets it as the `sd_session` cookie (HttpOnly, Secure, SameSite=Lax, path `/`). Dealer sessions slide for 30 days; staff sessions last 12 hours and require a TOTP code. Disabling a user or changing a password deletes their sessions at once. Changing data needs the same origin plus a custom request header, on top of SameSite, against cross-site requests.

**Passwords.** argon2id. Sign in is rate limited per email and per address, with a short lockout after repeated failures. Password reset and first-time setup use single-use links (only a hash stored, 72 hours for setup as the console's links work today, 1 hour for resets).

**Bringing dealers across.** Two paths, depending on Thinkspace (Q-B1 in DATA-MIGRATION.md):

1. **With password hashes** from a Thinkspace database export: the API recognises Django's `pbkdf2_sha256$...` format, checks it once at the dealer's next sign in, and stores an argon2id hash instead. Dealers notice nothing.
2. **Without hashes**: every imported dealer gets a set-password email, sent in waves (most recently active first), with the console showing who has set up and who has not. This is the flow the console's Dealers import already demonstrates.

**No public sign up.** Become a Dealer stays an inquiry; staff approve it in the console, which creates the store and sends the invitation.

## 6. Prices

- All money is stored as integer cents, US dollars only.
- **Dealer price**: what a signed-in dealer pays. For jewelry it comes from the variant's price in the store's price list (the default list is seeded from Thinkspace's variant prices, which are the prices dealers pay today). For stones it comes from RightClick or the supplier feed, through the same price list rules (markup by range, as Thinkspace's diamond markup, today 0%).
- **Pricing groups** (Q8): each store belongs to a group; a group can override a list price or apply a percentage. One default group until Surreal says otherwise.
- **Who sees a price**: signed-in dealers only. Visitors get the same catalog and stone endpoints without any price, and price sorts are refused for them (the frontend shows "Log in for price").
- **Hidden prices**: a product flagged Hide price, or a memo line ("Memo price confirmed by Surreal"), carries no figure. The API never sends a hidden figure to the browser: hiding is decided on the server.
- **Provisional until confirmed**: the checkout says prices are confirmed when Surreal accepts the order. Lines get the current dealer price when the order is placed, and the console's Confirm step rewrites them from the store's price list and records `prices_confirmed_at`.
- **Cost** is staff-only and never leaves the API in a dealer response.
- **Retailer mode** (change request item 32, assessment only so far): a retail figure computed on the server as the dealer price times a multiplier (2.5 by default, per-store override). Built only once Surreal confirms; the tables allow for it from day one.
- Once confirmed, an order's prices never change, whatever happens to the price list later.
- Card payments may carry a convenience fee that Accounts confirms; the amount rule is an input from Surreal (C-10).

## 7. Stones, holds and never selling twice

- `stones` mirrors RightClick and the supplier feeds. Each stone has its source, its status (`available`, `held`, `on_memo`, `sold`, `unavailable`) and when it was last seen.
- **Reserving** a stone (checkout or a memo request) is a single conditional update inside a transaction: `UPDATE stones SET status = 'held', held_by = ..., held_until = ... WHERE id = ... AND status = 'available'`. If no row changes, someone else got it and the dealer is told at once (B-01, R-18).
- Before an order or memo is confirmed, the `sync` module checks the stone live in RightClick and places a hold there (RIGHTCLICK.md, step 5). If RightClick says it is gone, the order stops with a clear message.
- Holds that are not confirmed expire (15 minutes at checkout, configurable), and a scheduled job releases them.
- Jewelry is mostly made or finished to order; pieces carry `purchasable` and `hide_price` flags rather than a stock count, until Surreal wants RightClick's jewelry on hand shown.

## 8. RightClick and supplier feeds

Built to the plan in [../RIGHTCLICK.md](../RIGHTCLICK.md):

- One RightClick client with the session stored encrypted in the database and renewed only on expiry.
- One `pg-boss` queue named `rightclick`, one worker, a token bucket of 20 calls a minute (RightClick blocks above 30).
- The schedule as recommended there (stock movements every 5 minutes, the full stone list every 30, open invoices and payments every 15, open memo lines every 15, reference tables nightly), each job staggered, each run recorded in `sync_runs` with calls used, rows changed and errors.
- Per-dealer balance and statement only when a dealer opens Billing, cached 15 minutes.
- All calls leave from the server's fixed public address, which Surreal or CFI must allow-list, since RightClick ties a session to the calling address.
- Supplier feeds: one adapter per feed, every 30 minutes; stones missing from a feed become `unavailable`.
- Fallback: an Excel or CSV upload in the console feeds the same importer.
- The console's RightClick sync page reads `sync_settings` and `sync_runs` instead of browser storage.

## 9. Files and images

- **Public**: product images, banners, marketing downloads. Stored once at full size, with derived sizes made by `sharp` (WebP). Served by the web server or a CDN with long cache headers.
- **Private**: custom request uploads, M2O sketches, memo reconciliation files, import files, receipts. Served only through an API route that checks the session, with short-lived signed links.
- Thinkspace images (files.jewelfeed.com) are downloaded and rehosted during the import, never hotlinked.
- Where: an S3-compatible bucket (AWS S3, or MinIO on the server) or a folder on the server's disk behind the same interface (B-D5). Database rows hold only keys and metadata.

## 10. Email

- Templates in the repository, in the house style: order confirmation (dealer and Surreal), memo request received, M2O, Legacy and Custom request received, inquiry acknowledgement and team alert, invitation and set-password, password reset, staff two-factor setup.
- Every email goes through an `email_outbox` table and a queue job, so a provider outage delays mail instead of losing it, and the console can show what was sent.
- Recipients per event are settings (today Thinkspace sends form alerts to Surreal's orders and sales mailboxes).
- Sender: Surreal's own domain with SPF, DKIM and DMARC records (C-14). The provider is decision B-D4.

## 11. The console

The nine console modules now in the frontend (`src/content/admin.ts`: Overview, Inventory, Merchandising, Banners, Promotions, Dealers, RightClick sync, Orders, Staff) each get endpoints under `/api/v1/admin/...`, guarded by the permission matrix. Every staff write lands in `audit_log` with the user, the action, the record and the before and after values.

## 12. Search

Postgres full text search plus trigram matching (`pg_trgm`) across product names, style codes and SKUs, stone stock ids and certificate numbers, and the static page index the frontend already keeps (`src/lib/siteSearch.ts`). One endpoint serves the header search and `/search`. A dedicated search service only if volume ever calls for it.

## 13. Environments and deployment

| Environment | Database | API | Who |
|---|---|---|---|
| Local | The live database on the office network for day-to-day work, with the API running on Ajay's Mac until it is deployed (Ajay's decision, 6 Nov 2026); Postgres 17 on the developer's machine for tests and for creating migrations | `localhost:4000`, the site on `localhost:3000` rewriting to it | the team |
| Staging | `surreal_db_staging` on the team server (to be created) | staging process on the private server | the team, Surreal's two testers (C-15) |
| Production | `surreal_db` on the team server | Deployed by the team at `https://surreal.sogodesk.com/api/v1` (seen 9 Nov 2026), with nginx sending `/api/v1` to the API and everything else to the website | everyone |

**Repository.** The API lives in its own private repository, `SogoDesk/surreal_api`, checked out as `surreal-diamonds-api` beside this one (B-D1). A push to this repository's `main` deploys the site to production, and keeping the API separate means backend work never triggers a frontend release, and each side deploys on its own.

**Deploy.** A GitHub Actions workflow on the same self-hosted runner pattern the site uses: install, build, `prisma migrate deploy`, restart the PM2 process, then call `/api/v1/health` and fail the run if it does not answer. Production deploys from `main` only; staging from `staging`.

**Configuration.** One `.env` per environment on the server (never in git): database URL, session secret, RightClick credentials, SMTP, storage, processor keys. A typed config module refuses to start if a value is missing.

**Backups.** Nightly `pg_dump` kept 14 days plus a weekly copy off the server; a restore tested on staging before go-live.

## 14. Security notes

- **The database account.** The connection shared for this project uses the `postgres` superuser with a simple password on a public host name. Before any real data goes in: create `surreal_app` (read and write on our schema only) and `surreal_migrator` (schema changes), give both long random passwords, require SSL, and rotate the `postgres` password, since it has been shared in chat.
- **Where the database really is (6 Nov 2026).** `surreal_db` is PostgreSQL 18 on a Windows PC in the office (photos from Ajay), on a server shared with other projects' databases, created as WIN1252. `www.sogodesk.com` is a different machine: an Amazon EC2 server in Hyderabad (nginx, SSH) that drops port 5432 from outside. How the two connect is to be confirmed with the team; a developer's machine on the office network reaches the PC directly at its LAN address.
- **Encoding.** WIN1252 rejects names outside Western European characters (tested: Polish, Japanese, the rupee sign and emoji all fail with an error). Recreate `surreal_db` as UTF-8 before any data goes in; encoding cannot be changed afterwards. Stay inside `surreal_db`: the `postgres` login can also reach the other projects.
- Personal data (dealer names, emails, phones, addresses) is redacted from logs; import files stay outside the repository.
- Public forms (contact, Become a Dealer) get rate limits, a honeypot and a challenge such as Cloudflare Turnstile: Thinkspace holds 1,114 Contact Us responses, many of them spam.
- RightClick credentials and the processor's keys are stored encrypted at rest and only in the production `.env` and database.
- The API checks the role and the store on every route; hiding a button in the frontend is never the only guard.

## 15. Frontend integration, in order

The pages keep their design; only their data source changes. Each step swaps a sample file or a browser store for API calls, behind a small typed client generated from the OpenAPI document.

1. Sign in and the dealer session (`surreal-dealer`, `surreal-staff`, `src/lib/auth.ts`).
2. Catalog: store, product pages, Quick View, Hot this week (`src/content/catalog.ts`, `featuring.ts`, `src/lib/merch.ts`).
3. Stones: the diamond page and Legacy stones (`src/content/diamonds.ts`).
4. Cart, checkout and orders (`src/lib/cart.ts`, `accountOrders.ts`, `orderStatus.ts`).
5. Memo and reconciliation (`src/lib/memo.ts`, `memoLines.ts`).
6. Billing: invoices, payments, statement (`src/lib/invoices.ts`).
7. Requests and inquiries (M2O, Legacy, Custom, contact).
8. Console modules: Dealers and Staff, then Inventory, Merchandising, Banners, Promotions, Orders, RightClick sync.
9. Recently viewed and the remaining per-browser settings.

[CHECKLIST.md](CHECKLIST.md) tracks each screen through this list.

## 16. Decisions needed

| # | Decision | Proposed | Who |
|---|---|---|---|
| B-D1 | Where the API code lives | **Decided 5 Nov 2026**: separate repository `surreal-diamonds-api` | Ajay |
| B-D2 | ORM | **Decided 5 Nov 2026**: Prisma 7 | Ajay |
| B-D3 | Sign in | **Decided 5 Nov 2026**: our own NestJS auth (replaces Clerk, ARCHITECTURE.md D4) | Ajay |
| B-D4 | Email sender | SMTP from Surreal's domain through a transactional provider (Amazon SES, Resend or Postmark) | Surreal, C-14 |
| B-D5 | File storage | S3-compatible bucket; the server's disk if the team prefers to keep everything on the box | the team |
| B-D6 | Commerce and payment | Still ARCHITECTURE.md D1. With a self-hosted backend, Option B (our own orders and Surreal's processor through its hosted payment fields) fits best | Surreal, after C-10 |
| B-D7 | Content pages | Copy stays in the code for Phase 1; only trade shows, dashboard resources and banners are staff-edited tables (replaces Sanity, D6) | Ajay |
| B-D8 | How the site reaches the API | Same origin through Next.js rewrites; the API on the private network only | the team |
| B-D9 | Staging database | `surreal_db_staging` on the same server | the team |
| B-D10 | Database roles | `surreal_app` and `surreal_migrator` instead of `postgres` | the team |
| B-D11 | Invoice aging buckets | Follow RightClick (current, 30, 60, 90, 120+); the Invoices page today shows 1 to 30, 31 to 60, 61 to 90, over 90 and gains a 120+ column | Ajay |
| B-D12 | Memo reconciliation numbers | `MR-` instead of `RC-`, which RightClick phone orders also use | Ajay |
| B-D13 | The demo dealer (signs in without a password) | Staging only; never created in production | Ajay |
| B-D14 | Whether the store carries all 377 Thinkspace pieces or only the curated ones (Q-B7) | All 377, Thinkspace photos where Surreal's imagery is missing, curated pieces first in the default sort | Surreal |
| B-D15 | Staff two-factor | **Decided 9 Nov 2026**: optional per person, off until they turn it on in the console; a stolen password alone opens the console for anyone who leaves it off | Ajay |

## 17. Milestones

| Block | What | Ends with |
|---|---|---|
| B0 | Foundation: repository, CI, config, database roles, Prisma, health, errors, logging | The API answers `/health` on staging |
| B1 | Accounts: users, stores, sessions, roles, permissions, invitations | Dealers and staff can sign in on staging |
| B2 | Catalog and prices | The store and product pages run on the database |
| B3 | Stones and holds, with the Thinkspace stone export as staging data | The diamond page runs on real stones |
| B4 | Cart, checkout, orders, payments | A dealer can place an order end to end on staging |
| B5 | Memo, billing, requests, inquiries, email | Every dealer form saves and sends its email |
| B6 | Console endpoints, audit log, merchandising, banners, promotions | Staff run the store from the console |
| B7 | RightClick and supplier feeds | Live stock, memo and invoices from RightClick |
| B8 | Thinkspace import, UAT, cut-over | Production with the real data |

Task by task in [TASKS.md](TASKS.md).
