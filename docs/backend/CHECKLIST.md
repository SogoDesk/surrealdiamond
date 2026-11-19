# Backend checklist

Every frontend feature that needs the backend, the piece that serves it, and where it stands. The plan is [PLAN.md](PLAN.md); the work order is [TASKS.md](TASKS.md).

Status: **Done** built, tested and wired to the frontend · **API done** endpoint built and tested, frontend not switched yet · **In progress** · **To do** · **Waiting** blocked on an input (C-, Q-B) or decision (B-D) · **Set aside** not pursued for now.

Last reviewed: 9 November 2026. B0 and B1 built. The team deployed the API at `https://surreal.sogodesk.com/api/v1`, and the live site has signed in through it since 9 November 2026. A push or merge to the API's `main` now deploys production by itself, so the deployed API follows `main`. "Local" below means working with the flag on, on Ajay's Mac.

## 1. Foundation

| # | Item | Status | Notes |
|---|---|---|---|
| BE-01 | Repository `SogoDesk/surreal_api` (local folder `surreal-diamonds-api`), NestJS 12, Node 26, lint, format, tests | Done | Pushed 6 Nov 2026 |
| BE-02 | Database roles `surreal_app`, `surreal_migrator`, SSL, rotated `postgres` password | In progress | Both logins work and the database is UTF-8 (6 Nov 2026); SSL and the password change are for later, Ajay's call |
| BE-03 | Staging database `surreal_db_staging` | Waiting (the team) | Same script creates it |
| BE-04 | Network: the API server allowed through the database firewall | In progress | The deployed API reaches its database (readiness up, 9 Nov 2026). The team allowed Ajay's Mac at 192.168.0.83 the same day; a fixed address for it is requested |
| BE-05 | Prisma schema and first migration from [SCHEMA.md](SCHEMA.md) | In progress | Accounts tables and the role matrix on live; the rest arrive block by block |
| BE-06 | Config module (typed, refuses to start with a missing value), JSON logs with redaction, error filter, health routes | Done | |
| BE-07 | OpenAPI document and the generated client for the frontend | Done | `openapi.json`, `src/lib/api/` in the website |
| BE-08 | Next.js rewrite `/api/v1/*` to the API (`API_INTERNAL_URL`) | Done | Checked on localhost; set the variable before the server's build |
| BE-09 | Deploy workflow on the self-hosted runner, PM2 process `surreal-api`, migrate on deploy, health check | Done | On since 9 Nov 2026 (`DEPLOY_ENABLED=true`). Run 42618629151 on merge `238b181` built on Node 26, found no pending migrations, restarted `surreal-api` and passed readiness. Staging not set up (BE-03) |
| BE-10 | Nightly backups and a tested restore | In progress | `deploy/backup.ps1` written and tested on a throwaway cluster (9 Nov 2026), and the restore steps corrected. Not running yet: the team sets it up on the database PC and runs the restore check. Should be in place before real data, because a push can now apply migrations to live |

## 2. Accounts and sign in

| # | Item | Status | Frontend it replaces |
|---|---|---|---|
| BE-11 | Dealer sign in with argon2id, 5 failures lock 15 minutes, `?next=` same-site only | Done | `surreal-credentials`, `surreal-login-attempts`, `LoginPage` |
| BE-12 | Sessions in Postgres, httpOnly cookie, sign out everywhere on password change or disable | Done | `surreal-dealer` |
| BE-13 | Set-password and reset links (72 hours, single use, older links revoked), emailed | Built and live; the email waits on a mail service (B-D4) | `surreal-invites`, `SetupPage` |
| BE-14 | Password rules as built (12+ characters, cases, number, no email or store words) | Done | `checkPassword` |
| BE-15 | Owner and associate roles, associate permissions; billing and payment methods owner only on the server | API done | `canSeeBilling` (the payments page has no check today) |
| BE-16 | Staff sign in with named logins and optional TOTP two-factor (B-D15) | Done; six admin logins on live, one role each since 16 Nov 2026 (two Administrators) | `surreal-staff` role picker |
| BE-17 | Console access matrix enforced per route | API done; C-05 may change the values | `src/content/admin.ts` |
| BE-17a | Staff list, custom roles, activity log (client request 16 Nov 2026) | Done, live since 16 Nov 2026 | `AdminStaff`, `lib/staffAdmin.ts` |
| BE-18 | People on the account: invite, change, remove associates | API done; invite and change need a screen | `AccountSettings` |
| BE-19 | Django password hashes accepted once and rehashed | Waiting (Q-B1) | Only if Thinkspace hands over the hashes |
| BE-20 | Demo dealer on staging only | Waiting (B-D13) | `DEMO_DEALER` |

## 3. Catalog and prices

| # | Item | Status | Frontend it replaces |
|---|---|---|---|
| BE-21 | Categories, divisions, collections, tags | To do | `categories`, `src/content/divisions.ts` |
| BE-22 | Products, variants (active metals only, R-12), media, carat options | To do | `src/content/catalog.ts`, `surreal-metals` |
| BE-23 | Listing with filters, sort and pins; public without prices, dealer with prices | To do | `StorePage`, `filters.ts` |
| BE-24 | Product page and Quick View data, Complete the look | To do | `ProductPage`, `QuickView`, `merch.looks` |
| BE-25 | Pricing groups, price lists, stone price rules, dealer price of any variant or stone | Waiting (Q8 list) | `src/lib/pricing.ts` (formula) |
| BE-26 | Retailer mode multiplier | Set aside (item 32) | assessed only |
| BE-27 | Shop the Set from matching data | Waiting (C-08) | pairs by category today |
| BE-28 | Bulk product upload with dry run (A1) | To do | none yet |

## 4. Stones

| # | Item | Status | Frontend it replaces |
|---|---|---|---|
| BE-29 | Stone list with every filter, sorts (price sorts dealer only), cursor paging | To do | `src/content/diamonds.ts` (260 samples), `query.ts` |
| BE-30 | Facets: the choices and ranges present in the feed | To do | `feedOptions` |
| BE-31 | Legacy stones (`legacy=1`) | Waiting (C-04) | `Stone.legacy` (no Legacy flag in Thinkspace) |
| BE-32 | Holds: conditional update in a transaction, expiry, release on cancel | To do | `useUnavailable` |
| BE-33 | Live RightClick check and hold before an order or memo is confirmed | Waiting (C-07) | |
| BE-34 | Next day and lead time per stone | Waiting (C-18) | |

## 5. Cart, checkout, orders, payments

| # | Item | Status | Frontend it replaces |
|---|---|---|---|
| BE-35 | Cart per person, line keys as built, qty 1 to 99, memo for stones only | To do | `surreal-cart` |
| BE-36 | Checkout: store details validation, terms, cutoff computed on the server, order number from a sequence | To do | `placeOrder`, `cutoff.ts` |
| BE-37 | Orders with store and user, provisional prices, confirmed prices at the Confirm step | To do | `surreal-orders` (no dealer key, no prices today) |
| BE-38 | Order workflow: confirm, ship, deliver, cancel, staff notes, dealer-visible events | To do | `surreal-order-work`, `AdminOrders` |
| BE-39 | Phone orders from RightClick on the dashboard | Waiting (C-07) | `samplePhoneOrders` |
| BE-40 | Card and ACH through Surreal's processor (hosted fields, tokens only), wire recorded by finance | Waiting (D1, C-10) | checkout payment step |
| BE-41 | Saved payment methods (tokens) | Waiting (C-10) | `surreal-payment-methods` |
| BE-42 | Orders written into RightClick | Waiting (C-07) | |
| BE-43 | Shipping methods: FedEx 2-Day and Overnight | To do | Thinkspace settings |

## 6. Memo and billing

| # | Item | Status | Frontend it replaces |
|---|---|---|---|
| BE-44 | Memo requests from checkout | To do | `surreal-memo` |
| BE-45 | Open memo lines (stone and jewelry) from RightClick, daily price | Waiting (C-07) | `sampleMemo` |
| BE-46 | Memo reconciliation with `MR-` numbers | To do | `surreal-memo-reports`, B-D12 |
| BE-47 | Invoices, credits, statement, aging from RightClick | Waiting (C-07, C-19, B-D11) | `src/lib/invoices.ts` samples |
| BE-48 | Pay invoices on the site, pending posting until finance posts | Waiting (C-10) | `surreal-invoice-payments` |
| BE-49 | Per-dealer balance cached 15 minutes | Waiting (C-07) | |

## 7. Requests, inquiries, trade shows, email

| # | Item | Status | Frontend it replaces |
|---|---|---|---|
| BE-50 | M2O request storing every field and the source stone | To do (C-17 may change fields) | `surreal-m2o` (5 of 12 fields kept today) |
| BE-51 | Custom request with private image uploads | Waiting (C-20, N-31) | `surreal-custom`, parked form |
| BE-52 | Legacy request | Waiting (C-11) | not built |
| BE-53 | Inquiries stored, routed by team, acknowledged; honeypot, rate limit, challenge | To do | `submitInquiry` (stores nothing today) |
| BE-54 | Trade shows and meeting requests | Waiting (Q9) | `surreal-show-meetings` |
| BE-55 | Email outbox, templates, recipients per event | In progress: sign-in links built; SMTP details waiting (B-D4, C-14) | no email sent anywhere today |
| BE-56 | Console queues for requests and inquiries | Waiting (C-05) | modules removed for now |

## 8. Storefront and console

| # | Item | Status | Frontend it replaces |
|---|---|---|---|
| BE-57 | Hot this week, pins, default sorts | To do | `surreal-merch` |
| BE-58 | Banners | To do | `surreal-merch.banners` |
| BE-59 | Pop-up promo with versions | To do | `surreal-promo` |
| BE-60 | Console Dealers: list, import with mapping and dry run, setup links, history | To do | `surreal-customers`, `surreal-customer-imports` |
| BE-61 | Console Inventory: products and stones, metals, flags | To do | `AdminInventory` |
| BE-62 | Console Staff: named staff, roles, matrix, audit log | To do | `AdminStaff` (display only today) |
| BE-63 | Console Overview figures | To do | `AdminOverview` |
| BE-64 | Recently viewed and wishlist per person | To do | `surreal-recent`, `surreal-wishlist` |
| BE-65 | Header search and `/search`, dashboard search | To do (C-06 for Surreal's search) | `siteSearch.ts`, `DashSearch` |

## 9. RightClick and feeds

| # | Item | Status | Notes |
|---|---|---|---|
| BE-66 | RightClick client, stored session, fixed outbound address, 20 calls a minute queue | Waiting (C-07) | RIGHTCLICK.md |
| BE-67 | The ten scheduled jobs with staggering, back off, `sync_runs` | Waiting (C-07) | |
| BE-68 | Console RightClick sync page on real settings and runs | To do | `surreal-sync-settings` |
| BE-69 | Supplier feeds | Waiting (feed details) | |
| BE-70 | Excel or CSV upload fallback | To do | |

## 10. Thinkspace migration

| # | Item | Status | Notes |
|---|---|---|---|
| BE-71 | Survey of the Thinkspace admin | Done | [DATA-MIGRATION.md](DATA-MIGRATION.md), 5 Nov 2026 |
| BE-72 | Export route agreed (database export, product feed, manual export) | Waiting (Q-B1) | |
| BE-73 | Importers with dry run, `legacy_id`, batch records | To do | |
| BE-74 | Catalog import: 377 products, 1,075 variants, images rehosted | To do | |
| BE-75 | Curated pieces linked to Thinkspace (29 of 69 codes match directly; mapping sheet for the rest) | To do (Q-B7) | |
| BE-76 | Stores, addresses, users and memberships | Waiting (Q-B4, Q-B6) | |
| BE-77 | Order history (1,557 orders) | To do | |
| BE-78 | Staging stone and memo seed from the Thinkspace diamonds | Waiting (Q-B3 for memo) | |
| BE-79 | Archived requests and reconciliations | Waiting (Q-B2) | optional |
| BE-80 | Invitation waves and the go-live cut-over | To do | |

## 11. Open questions and decisions

Decisions B-D1 to B-D14 are in [PLAN.md](PLAN.md) section 16; Thinkspace questions Q-B1 to Q-B7 in [DATA-MIGRATION.md](DATA-MIGRATION.md) section 5. Client inputs that block backend work:

| Input | Blocks |
|---|---|
| C-05 role-to-page access | BE-17, BE-56 |
| C-07 RightClick access (API user, key, serial, allow-listed address) | BE-33, BE-39, BE-42, BE-45, BE-47, BE-49, BE-66, BE-67 |
| C-10 card processor | BE-40, BE-41, BE-48 |
| C-14 sending domain | BE-13 emails, BE-55 |
| C-17 M2O specification | BE-50 final fields |
| C-18 lead times | BE-34 |
| C-19 invoice template and data | BE-47 |
| Q8 price list | BE-25 |
