# Surreal Diamond: project overview

A guide to the whole project for someone joining it: what it is, what it is built with, how the website and the backend work together, and what is real today versus still sample data.

Written 19 November 2026 from the code in both repositories. Where this file and the code disagree, the code wins.

| | Website (frontend) | API (backend) |
|---|---|---|
| Folder on this machine | `SURREAL/surrealdimond` | `SURREAL/Surreal-BE/surreal_api` |
| GitHub | `SogoDesk/surrealdimond` | `SogoDesk/surreal_api` |
| Package name | `surreal-diamonds-website` | `surreal-diamonds-api` |
| What it is | Next.js site: public pages, dealer store and dashboard, staff console | NestJS API with a PostgreSQL database |
| Local address | `http://localhost:3000` | `http://127.0.0.1:4000/api/v1` |

---

## 1. What the project is

Surreal Diamond is a lab-grown diamond grower and fine jewelry house in New York. This project replaces their current dealer website (built by Think Space) with a new one. It is a **B2B site**: the customers are jewelry dealers (retail stores), not the public.

The agreed scope is **Phase 1** of the Business Requirements Document (BRD v1.1). The full brief is in [../CONTEXT.md](../CONTEXT.md). In short, Phase 1 covers:

- **Public site:** marketing pages, the jewelry catalog, the diamond search. Prices are hidden until a dealer logs in.
- **Dealer side:** log in, browse and order jewelry, search loose stones, buy or take stones on memo, cart and checkout, and a Retailer Dashboard (orders, invoices, payments, memo, account).
- **Staff console:** Surreal's own team manages inventory, featured products, banners, dealers, orders, staff and roles.
- **RightClick connection:** RightClick is Surreal's existing inventory and accounting system. It stays the source of truth for stock, memo, invoices and balances; the site mirrors it on a schedule.

### Who uses it

| Audience | Who | What they do |
|---|---|---|
| Public visitor | Anyone | Marketing pages, no prices, no ordering |
| Dealer (owner) | The store's account owner | Orders, memo, billing, manages the people on the account |
| Dealer associate | Store staff | Browse and order, limited by permissions the owner sets |
| Staff | Surreal's team | The console, limited by their role |

Staff roles are a matrix: each role has `edit`, `view` or `none` on each console module (overview, inventory, merchandising, banners, promo, dealers, sync, orders, staff). There are five built-in roles, including Administrator, and administrators can create custom ones.

---

## 2. The big picture

```
Dealer or staff browser
        |
        |  one address only (the website's)
        v
Next.js website  ---- /api/v1/* forwarded ---->  NestJS API  (127.0.0.1:4000, private)
                                                      |
                                                      v
                                              PostgreSQL database
```

The key idea is **one origin**: the browser only ever talks to the website's address. Any request to `/api/v1/...` is forwarded by the website to the API, which listens on the private network and is never exposed to the internet. This gives three things:

- No CORS setup, because the browser never calls a second domain.
- The session cookie is first-party, so browsers do not block it.
- The API port stays closed to the outside.

The forwarding is the `rewrites()` block in [next.config.ts](../../next.config.ts), switched on by the environment variable `API_INTERNAL_URL`. On the live server, nginx can do the same forwarding.

The live site is currently at `https://surreal.sogodesk.com` (a staging address on the team's server) and will move to `https://surrealdiamond.com` at cut-over.

---

## 3. What is real and what is sample

This is the most important thing to understand before changing anything.

The website was built first as a **preview**: every screen works, but the data lives in sample files and in the browser's own storage. The backend is replacing that, one block at a time.

| Area | Today | Where the data comes from |
|---|---|---|
| Sign in, sessions, password setup and reset | **Real** | API and database |
| People on a dealer's account | **Real** | API and database |
| Staff list, roles, activity log | **Real** | API and database |
| Staff two-factor (optional) | **Real** | API and database |
| Jewelry catalog | Sample | [src/content/catalog.ts](../../src/content/catalog.ts) |
| Loose stones | Sample | [src/content/diamonds.ts](../../src/content/diamonds.ts) |
| Prices | Sample model | [src/lib/pricing.ts](../../src/lib/pricing.ts) |
| Cart and placed orders | Browser storage | [src/lib/cart.ts](../../src/lib/cart.ts) |
| Invoices, payments, statement | Sample, seeded from the dealer's email | [src/lib/invoices.ts](../../src/lib/invoices.ts) |
| Memo | Browser storage plus a sample | [src/lib/memo.ts](../../src/lib/memo.ts) |
| Featured products, banners, pop-up | Browser storage | [src/lib/merch.ts](../../src/lib/merch.ts), [src/lib/promo.ts](../../src/lib/promo.ts) |
| RightClick sync | A plan and a console page only | [src/lib/sync.ts](../../src/lib/sync.ts) |

Consequences:

- A change made in the console's inventory or merchandising pages is saved **in that browser only**. Another person, or another browser, does not see it.
- Because only sign in is real, **no real dealer should use the site yet**. The live database holds test logins and the staff logins.
- A build with `NEXT_PUBLIC_API_AUTH=false` switches sign in back to the preview's test accounts ([src/content/testAccounts.ts](../../src/content/testAccounts.ts)).

### Backend progress by block

From [../backend/TASKS.md](../backend/TASKS.md):

| Block | What | State |
|---|---|---|
| B0 | Foundation: config, logging, errors, database, deploy | Built |
| B1 | Accounts and sign in | Built (a few items open) |
| B2 | Catalog and prices | Not started |
| B3 | Stones | Not started |
| B4 | Cart, checkout, orders, payments | Not started |
| B5 | Memo, billing, requests, inquiries, email | Barely started (the sign-in email sender only) |
| B6 | Console, merchandising, activity | Staff, roles and activity done; the rest not started |
| B7 | RightClick and supplier feeds | Not started |
| B8 | Import of the old Think Space data, testing, cut-over | Not started |

Open items waiting on other people include the mail server details (so forgot-password and invite emails are not sent yet), the dealer price list, and the export of the old site's data.

---

## 4. The website (this repository)

### Built with

| Piece | Choice |
|---|---|
| Framework | Next.js 16 (App Router, `src/` folder), React 19, TypeScript |
| Styling | Tailwind CSS v4 plus CSS modules beside each component; brand colours in `src/app/globals.css` |
| Animation | GSAP 3 |
| Fonts | Urbanist (text and headings) and Italiana (large display figures), through `next/font` |
| Spreadsheet reading | `read-excel-file`, for the console's Excel and CSV imports |
| API types | `openapi-typescript`, generated from the API's `openapi.json` |

The top-level [README.md](../../README.md) still describes older fonts; the font setup in [src/app/layout.tsx](../../src/app/layout.tsx) is the current one. The visual rules are in [DESIGN.md](../../DESIGN.md).

### Folder map

```
src/app          one folder per page (the URL structure)
src/components   the screens and their parts, grouped by area
src/content      sample data and fixed copy (catalog, stones, site facts, test accounts)
src/lib          the logic and data stores behind the screens
src/lib/api      the only code that talks to the backend
src/hooks        small React hooks
public/media     photos, renders and videos
docs             planning and reference documents (this folder)
```

### Pages

| Area | URLs |
|---|---|
| Public | `/`, `/about`, `/contact`, `/apply`, `/privacy`, `/terms`, `/search` |
| Jewelry | `/jewelry`, `/jewelry/[category]`, `/jewelry/[category]/[product]`, `/jewelry/order-form` |
| Diamonds | `/diamonds`, `/diamonds/made-to-order`, `/legacy`, `/legacy/stones`, `/custom` |
| Buying | `/cart`, `/checkout` |
| Sign in | `/login`, `/account/setup` (set a password from an emailed link) |
| Retailer Dashboard | `/dashboard`, `/dashboard/orders`, `/dashboard/invoices`, `/dashboard/invoices/[id]`, `/dashboard/payments`, `/dashboard/memo`, `/dashboard/account`, `/dashboard/trade-shows` |
| Staff console | `/admin`, `/admin/inventory`, `/admin/merchandising`, `/admin/banners`, `/admin/promo`, `/admin/dealers`, `/admin/orders`, `/admin/staff`, `/admin/sync` |

Each `page.tsx` is thin: it renders a component from `src/components`. For example the diamond search screen is [src/components/diamonds/DiamondSearch.tsx](../../src/components/diamonds/DiamondSearch.tsx), the product page is [src/components/product/ProductPage.tsx](../../src/components/product/ProductPage.tsx), and the dashboard frame is [src/components/dashboard/DashboardShell.tsx](../../src/components/dashboard/DashboardShell.tsx).

### How the preview data works

[src/lib/localStore.ts](../../src/lib/localStore.ts) is a small typed wrapper over the browser's `localStorage`. The cart, memo requests, console settings and similar stores are all built on it. Every component reading a store re-renders when it changes, including in other tabs.

Each file in `src/lib` starts with a comment that says what it holds and what will replace it. Read that comment first when working on a screen.

### How the website talks to the backend

All of it is in `src/lib/api`:

| File | Job |
|---|---|
| [client.ts](../../src/lib/api/client.ts) | `apiFetch()`: the one function every API call goes through. Adds the headers, sends the cookie, turns error answers into `ApiRequestError` |
| [schema.d.ts](../../src/lib/api/schema.d.ts) | TypeScript types for every endpoint. **Generated, never edited by hand** |
| [auth.ts](../../src/lib/api/auth.ts) | Sign-in calls: login, logout, forgot, setup, change password, two-factor |
| [staffAdmin.ts](../../src/lib/api/staffAdmin.ts) | Console calls: staff, roles, activity |
| [SessionSync.tsx](../../src/lib/api/SessionSync.tsx) | On every full page load, asks the API who is signed in and updates the screens |
| [applySession.ts](../../src/lib/api/applySession.ts) | After a sign in, sets the dealer and staff copies of the session |

Two details matter:

- **The session is an httpOnly cookie** called `sd_session`. JavaScript cannot read it. The stores in [src/lib/dealer.ts](../../src/lib/dealer.ts) and [src/lib/staff.ts](../../src/lib/staff.ts) hold only what the screens display (name, store, role). They grant nothing: the API checks every permission itself.
- **Every call carries the header `x-requested-with: surreal-web`.** The API refuses any data-changing request without it.

### Environment variables

In `.env.local` (not committed):

| Variable | Meaning |
|---|---|
| `API_INTERNAL_URL` | Where the API is, for example `http://127.0.0.1:4000`. Unset: nothing is forwarded |
| `NEXT_PUBLIC_API_AUTH` | `false` brings back preview sign in. Anything else, or unset: real sign in |

Both are read at **build time**, so on a server they must be set before `next build`.

---

## 5. The backend (`Surreal-BE/surreal_api`)

### Built with

| Piece | Choice |
|---|---|
| Runtime | Node.js 26 |
| Framework | NestJS 12 (Express), ES modules, TypeScript 6 |
| Database | PostgreSQL (18 on the live server, 17 is enough locally) |
| Database access and migrations | Prisma 7 |
| Input validation | Zod 4 |
| API documentation | OpenAPI through `@nestjs/swagger` |
| Passwords | argon2id |
| Two-factor | Authenticator-app codes (`otplib`), QR drawn with `qrcode` |
| Email | `nodemailer` over SMTP |
| Logging | Pino |
| Rate limiting | `@nestjs/throttler` |
| Security headers | Helmet |
| Tests | Vitest and Supertest |
| Lint and format | oxlint and Prettier |

### Folder map

```
src/main.ts        starts the server
src/app.setup.ts   prefix /api/v1, cookies, security headers, no-cache, OpenAPI page
src/app.module.ts  wires the modules together
src/config         reads and validates the environment at start
src/common         shared pieces: error shape, validation, pagination, money, dates
src/prisma         the database client
src/auth           sign in, sessions, lockout, links, two-factor, access rules
src/accounts       the people on a dealer's account
src/staff          staff list, roles
src/audit          the activity log
src/health         health checks
src/openapi        builds and exports openapi.json
src/cli            commands run on the server (create staff, set role, set password)
prisma             schema.prisma and the migrations
deploy             deploy script, PM2 config, database roles, backups
test               end-to-end tests
```

### How a request travels

1. The browser calls `/api/v1/auth/login` on the website's address.
2. The website (or nginx) forwards it to the API on `127.0.0.1:4000`.
3. `app.setup.ts` applies the basics: JSON body up to 1 MB, cookies parsed, security headers, and `Cache-Control: no-store` so nothing personal is cached.
4. **Rate limit** per address (login allows 20 a minute, forgot-password 5).
5. **Same-origin check** (`src/auth/guards.ts`): any request that changes data must carry the `x-requested-with: surreal-web` header and, if the browser states an origin, come from the site's own address (`SITE_ORIGIN`).
6. **Access check**: the session cookie is looked up, then the route's rule is applied (see below).
7. The body is validated with a Zod schema.
8. The controller calls a service, which reads or writes the database through Prisma.
9. The answer goes back as JSON. Errors always have one shape: `{ "error": { "code", "message", "fields" } }`, where `fields` maps a form field to its message.

### Access rules

Every route is **closed by default**: it needs a signed-in person unless it is marked public. So forgetting a marker locks a route instead of opening it. The markers are in `src/auth/access.ts`:

| Marker | Who gets in |
|---|---|
| `@Public()` | Anyone |
| `@DealerOnly()` | A signed-in dealer or associate |
| `@OwnerOnly()` | The store's owner |
| `@RequirePermission(x)` | A dealer whose permissions include `x` |
| `@StaffOnly()` | Staff |
| `@StaffModule('orders')` | Staff whose role has `view` (for reading) or `edit` (for changing) on that console module |

Dealer data is always filtered by the store in the session, never by an id sent from the browser, so one dealer cannot ask for another's data.

### Sign in and sessions

- **Passwords** are hashed with argon2id. Rules: at least 12 characters, upper and lower case, a number, and not the email or store name.
- **Sessions live in the database.** The cookie holds a random token; the database stores only its SHA-256 hash, so a copy of the database cannot sign anyone in. Disabling a person or changing a password ends their sessions at once.
- **Session length:** dealers stay signed in for 30 days while they keep returning; staff sign in again every 12 hours.
- **Lockout:** five wrong passwords (or two-factor codes) lock that email for 15 minutes.
- **Setup and reset links:** emailed links with a one-time token, also stored only as a hash. Until a mail server is configured (`SMTP_HOST`), nothing is emailed; on a developer's machine the link is written to the log instead.
- **Two-factor for staff** is optional and per person. The secret is stored encrypted with `MFA_ENCRYPTION_KEY`. Once someone turns it on, no console route answers until their session passes a code. Ten recovery codes are issued once.

### Endpoints that exist today

All under `/api/v1`.

| Group | Endpoints |
|---|---|
| Health | `GET /health`, `GET /health/ready` (checks the database) |
| Sign in | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot`, `POST /auth/setup/lookup`, `POST /auth/setup/resend`, `POST /auth/setup`, `POST /auth/password`, `POST /auth/switch-store` |
| Two-factor | `POST /auth/mfa/setup`, `/auth/mfa/verify`, `/auth/mfa/recover`, `/auth/mfa/disable` |
| Dealer account | `GET /me/account`, `POST /me/account/people`, `PATCH /me/account/people/:userId`, `DELETE /me/account/people/:userId` |
| Console: staff | `GET /admin/staff`, `POST /admin/staff`, `PATCH /admin/staff/:userId`, `POST /admin/staff/:userId/link`, `DELETE /admin/staff/:userId` |
| Console: roles | `GET /admin/roles`, `POST /admin/roles`, `PATCH /admin/roles/:roleId`, `DELETE /admin/roles/:roleId` |
| Console: activity | `GET /admin/activity` |

The full planned list, including everything not built yet, is in [../backend/API.md](../backend/API.md).

### The database

Defined in `prisma/schema.prisma`. Conventions: ids are UUID v7, money is whole cents, times are UTC, table names are snake_case.

| Table | Holds |
|---|---|
| `organizations` | A dealer store |
| `organization_addresses` | Store, shipping and billing addresses |
| `users` | Dealers and staff in one table; `kind` tells them apart |
| `memberships` | Which person belongs to which store, as owner or associate, with permissions |
| `staff_roles` | The five built-in roles plus custom ones |
| `admin_permissions` | The access matrix: one row per role and console module |
| `sessions` | Signed-in sessions (token hash only) |
| `auth_tokens` | Setup and reset links (token hash only) |
| `login_attempts` | Failure counts for the lockout |
| `staff_mfa` | Encrypted two-factor secrets and recovery code hashes |
| `audit_events` | The activity log: staff sign ins and console changes |

Only the accounts area exists so far. Products, stones, orders, invoices and memo tables arrive with blocks B2 to B5; the design for them is in [../backend/SCHEMA.md](../backend/SCHEMA.md).

**Two database logins**, on purpose:

- `surreal_app`: what the running API connects as. It can read and write rows but cannot change tables.
- `surreal_migrator`: owns the tables and is used only to apply migrations.

### Database safety

- New migrations are created against the local database (`npm run prisma:migrate`) and applied to live by the deploy.
- Tests use the local `surreal_test` database and refuse any database that is not on this machine.
- Destructive Prisma commands (`migrate dev`, `migrate reset`, `db push`, `db execute`) are refused unless the target is this machine.
- A daily backup script runs on the database PC and keeps the newest 14 dumps.

---

## 6. Keeping the two repositories in step

The website's API types are generated from the backend, so the two must be updated together when an endpoint changes:

1. Change the endpoint in the API.
2. In the API folder, run `npm run openapi`. This rewrites `openapi.json`. The API's CI fails if this file does not match the code.
3. In the website folder, run `npm run api:types`. This rewrites `src/lib/api/schema.d.ts`.
4. Use the new types through `apiFetch()`.

**Path to fix first on this machine:** the `api:types` script in [package.json](../../package.json) reads `../surreal-diamonds-api/openapi.json`. Here the API folder is `../Surreal-BE/surreal_api`, so the script fails as written. Either run it with the right path:

```bash
npx openapi-typescript ../Surreal-BE/surreal_api/openapi.json -o src/lib/api/schema.d.ts
```

or create a link named `surreal-diamonds-api` beside this repository that points at the API folder.

---

## 7. Running everything locally

**API** (needs Node 26 and the PostgreSQL 17 binaries):

```bash
cd Surreal-BE/surreal_api
npm install
cp .env.example .env            # then set MFA_ENCRYPTION_KEY: openssl rand -base64 32
npm run db:local -- init        # once: a local database on port 5433
npm run db:local -- start
npm run prisma:migrate          # create the tables
npm run start:dev               # http://127.0.0.1:4000/api/v1/health
```

Create a first staff login with `npm run staff:create -- --email you@example.com --name "Your Name" --role administrator`. It prints a one-time setup link.

**Website:**

```bash
cd surrealdimond
npm install
# .env.local:  API_INTERNAL_URL=http://127.0.0.1:4000
npm run dev                     # http://localhost:3000
```

To work on screens without the API, set `NEXT_PUBLIC_API_AUTH=false` in `.env.local` and sign in with the test accounts.

Check before pushing: `npm run build` and `npm run lint` in the website; `npm run typecheck`, `npm run lint`, `npm test` and `npm run test:e2e` in the API.

---

## 8. Branches, checks and deployment

Both repositories deploy **production on every push to `main`**. Both run on the team's private Windows server under PM2, through self-hosted GitHub Actions runners.

| | Website | API |
|---|---|---|
| Automatic checks (CI) | None | On every push and pull request: types, lint, unit tests, end-to-end tests, build, and `openapi.json` matches the code |
| Deploy trigger | Push to `main` | Push to `main` (production) or `staging` (staging) |
| Deploy script | `C:\deploy\Surreal\deploy.ps1` on the server | `deploy/deploy.ps1` in the repository |
| What a deploy does | Builds and restarts the site | Builds, **applies new database migrations to the live database**, restarts, waits for `/health/ready` |
| Staging | None | Supported by the workflow, but the `staging` branch does not exist yet |

Things to keep in mind:

- The website has no automatic checks, so a broken build reaches production unless it is caught locally first.
- In the API, CI and deploy run separately, so a failing check does not stop the deploy.
- A push to the API's `main` can change the live database's tables. Push there only when that is intended.
- Work on a branch and merge to `main` only when the change is ready to go live.

---

## 9. Working on a typical change

Most current work is on screens that still run on sample data. For a change such as "move the price next to the carat weight" or "add an Apply Filter button":

1. Find the page's folder in `src/app`, then the component it renders in `src/components`.
2. Read the comment at the top of the `src/lib` file behind that screen to see where its data comes from.
3. Styles are in the `.module.css` file beside the component.
4. No backend change is needed unless the screen is one of the real ones (sign in, account people, staff and roles).

A change to a real screen usually needs both repositories, in the order given in section 6.

---

## 10. Where to read more

| Topic | File |
|---|---|
| Business scope, roles, rules | [../CONTEXT.md](../CONTEXT.md) |
| Requirement-by-requirement status | [../CHECKLIST.md](../CHECKLIST.md) |
| Website work plan | [../TASKS.md](../TASKS.md) |
| Test accounts and how to test by role | [../TESTING.md](../TESTING.md) |
| RightClick sync approach | [../RIGHTCLICK.md](../RIGHTCLICK.md) |
| Original architecture proposal (partly replaced) | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Backend plan and decisions | [../backend/PLAN.md](../backend/PLAN.md) |
| Backend tables | [../backend/SCHEMA.md](../backend/SCHEMA.md) |
| Backend endpoints, built and planned | [../backend/API.md](../backend/API.md) |
| Backend work plan and status | [../backend/TASKS.md](../backend/TASKS.md) |
| Moving data from the old site | [../backend/DATA-MIGRATION.md](../backend/DATA-MIGRATION.md) |
| Design system | [../../DESIGN.md](../../DESIGN.md) |
| Server setup, deploys, backups | `deploy/README.md` in the API repository |

## Glossary

| Term | Meaning |
|---|---|
| BRD | Business Requirements Document, the agreed scope |
| Dealer | A jewelry store that buys from Surreal |
| Memo | Stock a dealer holds without buying it yet; they pay when it sells or return it |
| STM | Short-term memo |
| M2O | Made to Order: a stone grown to a dealer's specification |
| Legacy | Surreal's Diamond Legacy programme, with its own stone search |
| RightClick | Surreal's inventory and accounting system (by CFI), the source of truth for stock and billing |
| Think Space | The company behind the current site being replaced |
| Console | The staff admin area at `/admin` |
| Preview | The website running on sample data and browser storage, without the backend |
