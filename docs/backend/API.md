# API endpoints

Status: **being built**; block B1 (sign in, account people) is live in the API as of 6 November 2026, the rest is the plan. Base path `/api/v1`, reached through the site's own origin (PLAN.md section 3). JSON in and out; errors as `{ error: { code, message, fields? } }`. The OpenAPI document generated from the code becomes the source of truth once B0 is built; this list is the plan for it.

Access: **Public** anyone · **Dealer** a signed-in owner or associate, scoped to their store · **Owner** a dealer with the owner role (billing) · **Staff:<module>** a staff role with view (GET) or edit (writes) on that console module.

Prices: public catalog and stone endpoints never include prices, cost or price sorts. The same endpoints called with a dealer session add the dealer's price.

## Auth and the session

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| POST `/auth/login` | Public | email, password; sets `sd_session`. Locked after 5 failures for 15 minutes | `LoginPage`, `src/lib/auth.ts` |
| POST `/auth/logout` | Signed in | ends the session | `signOut` |
| GET `/auth/me` | Signed in | user, kind, role, store, account code, permissions, staff role | `useDealer`, `useStaff` |
| POST `/auth/forgot` | Public | sends a setup or reset link; same answer whether or not the email exists | LoginPage forgot |
| POST `/auth/setup/lookup` | Public | valid, expired (with the person) or used. The token is in the body so it stays out of logs | `SetupPage`, `lookupSetupLink` |
| POST `/auth/setup/resend` | Public | a new link to the email on the account, from an expired link | Send a new link |
| POST `/auth/setup` | Public | token, password; activates and signs in | `completeSetup` |
| POST `/auth/password` | Signed in | current, new; ends other sessions | `AccountSettings` |
| POST `/auth/password/reset-link` | Signed in | emails the person a reset link; 503 `email_unavailable` when it could not be sent (no mail service yet) | `AccountSettings` Forgot your password? |
| GET `/m2o/pricing` | Signed in | M2O costs: the fee per diamond and the price per carat by size band, in cents, for all standard shapes (from Surreal's M2O page, 25 Nov 2026; kept out of the site's code because they are dealer prices) | Made to Order costs table and estimate |
| POST `/auth/mfa/setup`, POST `/auth/mfa/verify`, POST `/auth/mfa/recover`, POST `/auth/mfa/disable` | Staff | Optional two-factor: TOTP enrolment, the code at sign in, a one-use recovery code, turning it off with the password. `/auth/me` reports `off`, `ok` or `code_required` | new |
| POST `/auth/switch-store` | Dealer | for a person who belongs to two stores | new |

## Catalog

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| GET `/catalog/categories` | Public | the 8 categories with blurb, image, ground | `categories` |
| GET `/catalog/divisions` | Public | the 16 divisions in their groups | `src/content/divisions.ts` |
| GET `/catalog/products` | Public (+price for dealers) | `?category=&division=&collection=&tag=&metal=&shape=&sort=featured|az|za&page=` with the page's pins applied for the default sort | `StorePage`, `filters.ts` |
| GET `/catalog/products/:slug` | Public (+price) | product, variants (active metals only), media, carat options, looks | `ProductPage`, `QuickView` |
| GET `/catalog/hot` | Public (+price) | Hot this week, 12 pieces | `Featured` |
| GET `/storefront/banners` | Public | active hero slides in order | `Hero`, `useBanners` |
| GET `/storefront/promo` | Public | the live promo for the caller's audience, or none | `PromoPopup` |
| GET `/search` | Public (+price) | `?q=`: pieces, stones, exact stock or certificate hits, pages | `SiteSearch`, `SearchPage`, `siteSearch.ts` |

## Stones

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| GET `/stones` | Public (+price, +price sorts) | every `DiamondQuery` filter as query params (`shape`, `cmin`, `cmax`, `color`, `clarity`, `cut`, `lab`, measurements, table, depth %, polish, symmetry, fluorescence, ratio, `legacy`), sort, cursor; available stones only | `DiamondSearch`, `query.ts` |
| GET `/stones/facets` | Public | the filter choices and ranges present in the feed, like `feedOptions` | `feedOptions` |
| GET `/stones/:stockId` | Public (+price) | one stone for Quick View | `StoneDrawer` |

## Cart

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| GET `/cart` | Dealer | lines with current dealer prices and availability | `CartPage`, `MiniCart` |
| POST `/cart/lines` | Dealer | jewelry `{productSlug, metal, carat, qty, note}` or stone `{stockId, memo}`; merges by line key | `addToCart`, `addStone` |
| PATCH `/cart/lines/:key` | Dealer | qty, note, memo | `setQty`, `setNote` |
| DELETE `/cart/lines/:key` | Dealer | remove | `removeLine` |

## Checkout and orders

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| GET `/checkout/defaults` | Dealer | store details from the account, shipping methods, the cutoff countdown | `CheckoutPage` prefill, `cutoff.ts` |
| POST `/checkout/holds` | Dealer | holds every stone in the cart (live RightClick check), returns any that are gone | new (B-01) |
| POST `/orders` | Dealer | places the order from the cart: store details, payment method, terms agreed; creates memo requests for memo lines; returns the number | `placeOrder` |
| GET `/me/orders` | Dealer | the store's orders, site and phone (RightClick), `?range=30|90|year|all` | `OrdersPage`, `accountOrders.ts` |
| GET `/me/orders/:number` | Dealer | detail with dealer-visible events | `OrdersPage` drawer |
| POST `/me/orders/:number/reorder` | Dealer | adds the order's lines (or one line) to the cart | quick reorder |
| GET `/me/orders.csv` | Dealer | CSV export | `OrdersPage` CSV |

## Payments

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| POST `/payments/intent` | Dealer | starts a card or ACH payment with the processor's hosted fields for an order or invoices (D1, C-10) | checkout payment step |
| POST `/payments/webhook` | Processor | the processor's callback, signature checked | new |
| GET `/me/payment-methods` | Owner | saved methods (brand, last four, expiry, default) | `PaymentMethods` |
| POST `/me/payment-methods` | Owner | saves a processor token, never a card number | `addPaymentMethod` |
| PATCH `/me/payment-methods/:id/default`, DELETE `/me/payment-methods/:id` | Owner | | `setDefaultPaymentMethod`, `removePaymentMethod` |

## Billing

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| GET `/me/billing/summary` | Owner | balance, past due, due soon, aging, memo balance, last payment | `useAccount().summary` |
| GET `/me/invoices` | Owner | `?filter=open|pastdue|soon|awaiting|paid` | `InvoicesPage` |
| GET `/me/invoices/:id` | Owner | the invoice document | `InvoiceDocument` |
| GET `/me/payments` | Owner | receipts and site payments, pending posting flagged | Payments tab |
| GET `/me/statement` | Owner | `?period=90|year|all`, running balance | Statement tab |
| POST `/me/invoices/pay` | Owner | invoice ids, method or wire sent; creates a payment pending posting | `payInvoices` |

## Memo

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| GET `/me/memo` | Dealer | open memo lines (stone and jewelry) with days on memo | `MemoReport`, `useMemoLines` |
| GET `/me/memo/requests` | Dealer | memo requests and their state | dashboard home |
| POST `/me/memo/reconciliations` | Dealer | sold line ids, confirmed, note (at least one) | `sendMemoReport` |
| GET `/me/memo/reconciliations` | Dealer | past reports | `MemoReport` history |

## Requests, inquiries, trade shows

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| POST `/requests/m2o` | Dealer | every M2O field (name, company, customer, phone, email, size or dimensions, shape or other, ratio, inscription, notes, source stone) | `MadeToOrderPage` |
| POST `/requests/custom` | Dealer | the Custom Portal fields plus up to 6 images (multipart) | `CustomPortal` (parked) |
| POST `/requests/legacy` | Dealer | when a Legacy request form is built | new |
| GET `/me/requests` | Dealer | the store's requests with status | dashboard home, `DashSearch` |
| POST `/inquiries` | Public | the contact form fields with honeypot and challenge; routes to the team; acknowledgement email | `submitInquiry` |
| GET `/trade-shows` | Dealer | Surreal's calendar (Q9) | `TradeShows` |
| POST `/me/trade-show-meetings`, DELETE `/me/trade-show-meetings/:number` | Dealer | request and withdraw | `requestShowMeeting`, `cancelShowMeeting` |

## Account and activity

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| GET `/me/account` | Dealer | store details and the people on the account | `AccountSettings` |
| POST `/me/account/people` | Owner | invite an associate | new (Authorized users) |
| PATCH `/me/account/people/:id`, DELETE `/me/account/people/:id` | Owner | role, permissions, remove | new |
| GET `/me/recent`, POST `/me/recent` | Dealer | recently viewed, newest 12 | `recent.ts` |
| GET `/me/wishlist`, PUT `/me/wishlist/:productSlug`, DELETE `/me/wishlist/:productSlug` | Dealer | | `useWishlist` |
| GET `/me/search` | Dealer | dashboard search over the store's orders, memo, requests, plus catalog and stones | `DashSearch` |

## Console (`/admin/...`)

| Method and path | Access | What | Frontend today |
|---|---|---|---|
| GET `/admin/overview` | Staff:overview | counts, receivables by account, recent requests | `AdminOverview` |
| GET `/admin/products`, PATCH `/admin/products/:id` | Staff:inventory | list with filters; status, flags, default metal | `AdminInventory` |
| PATCH `/admin/products/:id/metals` | Staff:inventory | metals on and off, default | `setMetalOption` |
| POST `/admin/products/import` | Staff:inventory | bulk upload (A1), dry run first | new |
| GET `/admin/stones` | Staff:inventory | stones with source, status, holds, cost | `AdminInventory` diamonds tab |
| GET `/admin/staff` | Staff:staff view | everyone with a console login: role and its name, status, last sign in, added by, two factor, open sessions | `AdminStaff` |
| POST `/admin/staff` | Staff:staff edit | name, email, role; sends the setup link, or returns it when it could not be emailed. Only an administrator gives Administrator | Add a staff member |
| PATCH `/admin/staff/:id` | Staff:staff edit | role, or status active/disabled (disabling ends sessions). Not yourself; administrators only for anything about Administrator; the last active administrator stays | role menu, Disable, Enable |
| POST `/admin/staff/:id/link` | Staff:staff edit | a new setup or reset link, emailed or returned | Send setup link |
| DELETE `/admin/staff/:id` | Staff:staff edit | only a login never used; otherwise disable | Remove |
| GET `/admin/roles` | Staff:staff view | built in and custom roles with access per module and how many have each | Roles, Access matrix |
| POST, PATCH, DELETE `/admin/roles(/:id)` | Administrator | custom roles only; names unique ignoring case; a role someone has cannot be deleted | Create a role, Edit |
| GET `/admin/activity` | Staff:staff view | `?show=all|signins|changes&page=`: staff sign ins, failed sign ins and changes, newest first | Activity |
| GET `/admin/merch`, PUT `/admin/merch/hot`, PUT `/admin/merch/pins/:page`, PUT `/admin/merch/sorts/:page`, PUT `/admin/merch/looks/:productId` | Staff:merchandising | Hot this week, pins, default sorts, Complete the look | `AdminMerch` |
| GET `/admin/banners`, POST, PATCH `/:id`, DELETE `/:id`, PUT `/admin/banners/order` | Staff:banners | | `AdminBanners` |
| GET `/admin/promo`, POST `/admin/promo/publish`, POST `/admin/promo/off` | Staff:promo | | `AdminPromo` |
| GET `/admin/dealers` | Staff:dealers | stores and people, status counts, search | `AdminDealers` |
| POST `/admin/dealers/import` | Staff:dealers | upload, column mapping, dry run, commit, optional setup links | import wizard |
| GET `/admin/dealers/imports` | Staff:dealers | import history | `ImportLog` |
| POST `/admin/dealers/:userId/setup-link`, POST `/admin/dealers/setup-links` | Staff:dealers | one, or every not-invited person; emails the links | `createSetupLink` |
| PATCH `/admin/dealers/:userId`, DELETE `/admin/dealers/:userId` | Staff:dealers | details, role, disable, remove | `removeCustomer` |
| POST `/admin/organizations`, PATCH `/admin/organizations/:id` | Staff:dealers | create a store (approved application), pricing group, sales rep, multiplier | new |
| GET `/admin/orders`, GET `/admin/orders/:number` | Staff:orders | filters: to confirm, to ship, shipped, delivered, cancelled | `AdminOrders` |
| POST `/admin/orders/:number/confirm` | Staff:orders (edit) | snapshots prices from the price list; captures the card | `confirmOrder` |
| POST `/admin/orders/:number/ship`, `/deliver`, `/cancel`, `/notes` | Staff:orders (edit) | carrier and tracking; reason; staff note | `shipOrder`, `deliverOrder`, `cancelOrder`, `addStaffNote` |
| POST `/admin/orders/:number/payment/capture`, `/settle`, `/wire`, `/posted` | Staff:orders (edit) | the payment steps | `capturePayment`, `settleAch`, `recordWire`, `markPosted` |
| GET `/admin/payments`, POST `/admin/payments/:id/posted` | Staff:orders | site payments to post in RightClick | payments tab |
| GET `/admin/requests`, PATCH `/admin/requests/:id` | Staff (module to add with C-05) | M2O, Custom, Legacy queue and status | not built yet (the Requests module was taken out for now) |
| GET `/admin/inquiries`, PATCH `/admin/inquiries/:id` | Staff (per team) | the inbox | not built yet |
| GET `/admin/sync`, PUT `/admin/sync/settings`, POST `/admin/sync/:job/run` | Staff:sync | schedule, call budget, last runs, run now | `AdminSync` |
| POST `/admin/sync/upload` | Staff:sync | the Excel fallback | new |
| GET `/admin/staff`, POST `/admin/staff`, PATCH `/admin/staff/:id` | Staff:staff | named staff logins and roles, the access matrix | `AdminStaff` |
| GET `/admin/audit` | Staff:staff | the audit log | new |

## Health

| Method and path | Access | What |
|---|---|---|
| GET `/health` | Public (no detail) | liveness for PM2 and monitoring |
| GET `/health/ready` | Internal | database, queue, RightClick session age |
