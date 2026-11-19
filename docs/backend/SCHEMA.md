# Database schema (PostgreSQL)

Status: **proposed**, 5 November 2026. This is the design the Prisma schema will follow; column names here are the database names (snake_case). Built from the frontend's data shapes (every type in `src/lib` and `src/content`, 26 browser-storage keys) and the Thinkspace survey ([DATA-MIGRATION.md](DATA-MIGRATION.md)).

## Conventions

- **Ids**: `uuid` primary keys (UUID v7, so they sort by creation). Human-facing numbers (orders, requests, inquiries) are separate columns from `number_sequences`, never derived from the clock or random numbers.
- **Money**: `integer` cents (`bigint` for totals and balances), US dollars only, column names end in `_cents`.
- **Time**: `timestamptz`, stored in UTC; business rules (cutoff, promo dates) use `America/New_York`.
- **Every table** has `created_at` and, where rows change, `updated_at`.
- **Imported rows** keep the source id in `legacy_id` (Thinkspace) or `rightclick_ref` (RightClick), unique per table, so imports and syncs update instead of duplicating.
- **Enums** are Postgres enums where the list is fixed by the business (status values), and plain text checked by the API where Surreal's lists may still change (shapes, grades, labs: C-03, C-04).
- **Extensions**: `citext` (case-insensitive emails), `pg_trgm` (search), `pgcrypto`.
- **Scoping**: every dealer-owned row carries `organization_id`; the API filters by the session's store on every query.

Human numbers, one sequence each (replacing the browser's `Date.now()` numbers, which can collide):

| Entity | Format | Note |
|---|---|---|
| Order | `SD-YYMMDD-NNNN` | as the frontend shows today; NNNN counts per day |
| Memo request | `MO-NNNNNN` | |
| Memo reconciliation | `MR-NNNNNN` | the frontend uses `RC-`, which clashes with RightClick phone orders; switch the prefix |
| M2O, Custom, Legacy request | `M2O-NNNNNN`, `CU-NNNNNN`, `LG-NNNNNN` | |
| Inquiry | `IN-NNNNNN` | |
| Trade show meeting | `TS-NNNNNN` | |
| Site payment | `PMT-NNNNNN` | |

## 1. Accounts and access

### `organizations` (dealer stores)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| legacy_id | text unique | Thinkspace organization id |
| rightclick_customer_code | text unique | the account code in the frontend (`Customer.account`); links memo, invoices, balances |
| name | text | store name |
| slug | text unique | |
| status | enum `org_status`: active, disabled, pending | pending = an approved application not yet set up |
| pricing_group_id | uuid → pricing_groups | |
| sales_rep_user_id | uuid → users | Thinkspace "Sales" |
| retail_multiplier | numeric(4,2) null | retailer mode, item 32; null = group default |
| tax_exempt | boolean | Q11 |
| resale_certificate_media_id | uuid null → media_assets | Q11 |
| website, phone | text | |
| notes | text | staff only |

### `organization_addresses`

id, organization_id, kind (`store`, `shipping`, `billing`), label, line1, line2, city, state, postal_code, country (default `US`), phone, email, is_default, legacy_id (Thinkspace location).

### `users`

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| legacy_id | text unique | Thinkspace user id |
| kind | enum `user_kind`: dealer, staff | |
| email | citext unique | the login |
| full_name, first_name, last_name, phone | text | |
| status | enum `user_status`: not_invited, invited, active, disabled | matches the console's Not invited / Setup link sent / Active |
| staff_role | enum `staff_role` null: administrator, finance, hr, sales, manager | staff only, one role per person |
| password_hash | text null | argon2id, or a Django `pbkdf2_sha256$...` hash from Thinkspace until first sign in |
| password_algo | enum: argon2id, django_pbkdf2 | |
| password_updated_at, invited_at, activated_at, last_login_at | timestamptz | |
| source | enum: thinkspace, import, staff, test | test rows are removed before go-live |

### `memberships` (a person at a store)

id, user_id, organization_id, role (enum `member_role`: `owner`, `associate`, as the frontend names Dealer and Dealer Associate), permissions (jsonb: `orders`, `memo`, `billing`, `payment_methods`; owners have all), created_at. Unique (user_id, organization_id).

### `admin_permissions` (the console access matrix)

role (`staff_role`), module (`overview`, `inventory`, `merchandising`, `banners`, `promo`, `dealers`, `sync`, `orders`, `staff`), access (enum: edit, view, none). Seeded from `src/content/admin.ts`; C-05 confirms it.

### `sessions`

id, user_id, token_hash (sha256, unique), organization_id (the store this session acts for), mfa_verified_at, created_at, last_seen_at, expires_at, ip, user_agent. Deleted on sign out, password change or disable.

### `auth_tokens` (set-password, reset, invite links)

id, user_id, purpose (enum: setup, reset), token_hash unique, created_by_user_id, created_at, expires_at (setup 72 hours as built; reset 1 hour), used_at. Creating a new link revokes the user's older ones.

### `login_attempts`

email (citext primary key), failures, locked_until, last_failure_at. Five failures lock for 15 minutes (as `src/lib/auth.ts`).

### `staff_mfa`

user_id (primary key), totp_secret (encrypted), enabled_at, recovery_code_hashes (text[]).

## 2. Catalog

### `categories`

id, slug (`engagement`, `wedding-bands`, `earrings`, `necklaces`, `pendants`, `rings`, `bracelets`, `sterling-silver`), label, blurb, image_slug, ground_hex (`src/content/grounds.ts`), sort_order, legacy_type (the Thinkspace type it maps from).

### `divisions` (the 16 menu entries)

id, slug, label, group (enum: types, collections, programs), href, image_slug, photo, motif, note, pending (boolean), sort_order, category_id null, collection_id null, tag_id null. A division points at a category, a collection or a tag, so its page lists the right pieces.

### `collections`, `tags`

`collections`: id, slug, name, description, active, legacy_id (Constellation, Enamour Enamel, Laser Pierced, Vermeil, Sterling Silver).
`tags`: id, slug, name, legacy_id (2026 Catalog, 2026 Flyer, 2025 Flyer, Sterling Silver).
Joins: `product_collections` (product_id, collection_id), `product_tags` (product_id, tag_id).

### `products` (an article)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| slug | text unique | the frontend's `Product.id`, used in `/jewelry/<category>/<slug>` |
| legacy_id | text unique | Thinkspace product UUID |
| name, detail | text | detail is the short design line |
| description | text | from Thinkspace, cleaned |
| category_id | uuid → categories | |
| style_code | text | Thinkspace product stock number (e.g. `SD-LROV230W530`) |
| style_number | text | Surreal's style number when confirmed (the frontend derives it from render names today) |
| center_shape | text null | engagement pieces |
| default_metal | text | R-13, C-02 |
| featured | boolean, featured_weight integer | |
| hide_price | boolean | Thinkspace "Hide Price" |
| purchasable | boolean | Thinkspace "Disable Purchase" inverted |
| status | enum: active, draft, archived | |
| seo_title, seo_description | text | |

### `product_variants` (metal and carat)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| product_id | uuid → products | |
| legacy_id | text unique | Thinkspace variant UUID |
| sku | text unique | the variant stock number (e.g. `ER0073W450`), the SKU on orders and RightClick |
| metal | text | `wg`, `yg` today; the column allows `rg`, `pt`, `ss` (sterling), `vm` (vermeil) |
| karat | text null | `14k`, `18k` |
| carat_total | numeric(5,2) | |
| list_price_cents | integer | the default dealer price (Thinkspace variant price) |
| retail_price_cents | integer null | |
| cost_cents | integer null | staff only |
| active | boolean | R-12: only metals the piece exists in |
| sort_order | integer | |

`carat_options` (category_id, carat, sort_order) keeps the made to order sizes per category that the frontend offers today.

### `media_assets` and `product_media`

`media_assets`: id, storage_key, visibility (public, private), mime, width, height, bytes, alt, legacy_url (e.g. files.jewelfeed.com), checksum, created_by_user_id.
`product_media`: product_id, variant_id null, media_id, role (enum: render, angle, photo, video, poster), metal null, sort_order. The current renders in `public/media/renders` are registered here too, so the frontend reads one list.

### `product_relations`

product_id, related_product_id, kind (enum: look, related, matching_set), sort_order. Covers Complete the look (up to 4, `merch.looks`), Thinkspace related products, and Shop the Set once C-08 arrives.

### `render_mappings` (migration helper)

render_slug, product_id, variant_id null, matched_by (sku, slug, manual), confirmed_by_user_id. Links our 82 curated pieces to Thinkspace products (DATA-MIGRATION.md section 6).

## 3. Diamonds

### `stones`

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| stock_id | text unique | `SD...`, `SBD...` |
| source | enum: surreal, supplier | |
| supplier_id | uuid null → suppliers | |
| rightclick_ref | text unique null | RightClick item key |
| legacy_id | text | Thinkspace diamond id (staging seed only) |
| lot_number | text | |
| shape | text | `round`, `oval`, ... (11 in Thinkspace, 10 in the frontend) |
| carat | numeric(6,2) | |
| color, clarity | text | D to K, FL to SI2 in Thinkspace |
| cut_grade, polish, symmetry | text null | cut grade null for fancy shapes |
| fluorescence, fluorescence_color | text | |
| length_mm, width_mm, depth_mm | numeric(6,2) | |
| ratio | numeric(5,3) generated | length / width |
| table_pct, depth_pct | numeric(5,2) | |
| girdle, culet | text | |
| lab, certificate_number, certificate_url | text | IGI, GCAL |
| image_url, video_url | text | |
| legacy_program | boolean | Diamond Legacy stone |
| next_day | boolean | from RightClick or Surreal's rule (C-18) |
| lead_time | text | C-18 |
| price_cents | integer | the dealer (asset) price before group rules |
| price_per_carat_cents | integer | |
| memo_price_cents | integer null | daily from RightClick |
| cost_cents | integer null | staff only |
| status | enum `stone_status`: available, held, on_memo, sold, unavailable | |
| held_by_organization_id | uuid null | |
| held_until | timestamptz null | |
| last_seen_at | timestamptz | the last sync that listed it |
| raw | jsonb | the source row, for support |

Indexes: (status, shape, carat), color, clarity, lab, legacy_program, price_cents; trigram on stock_id and certificate_number.

### `stone_holds`

id, stone_id, organization_id, user_id, reason (checkout, memo), status (active, converted, released, expired), rightclick_hold_ref, created_at, expires_at. The history behind `stones.status = held`.

### `suppliers`

id, name, feed_kind, feed_url, every_minutes, active, last_run_at.

## 4. Prices

- `pricing_groups`: id, name, is_default, description.
- `price_lists`: id, pricing_group_id, name, valid_from, valid_to, active.
- `price_list_items`: id, price_list_id, variant_id, price_cents. Unique (price_list_id, variant_id).
- `stone_price_rules`: id, pricing_group_id, min_cents, max_cents, percent. Mirrors Thinkspace's diamond markup table (one 0% rule today).

The price a dealer sees = the group's list item, else the variant's `list_price_cents`; for stones `price_cents` adjusted by the group's rule. Retailer mode multiplies by `organizations.retail_multiplier` on display only.

## 5. Cart and orders

### `carts` and `cart_lines`

`carts`: id, user_id unique, organization_id, updated_at. One cart per person, so associates and owners each keep theirs.

`cart_lines`: id, cart_id, line_key (as the frontend builds it: `productId|metal|carat|size` or `stone|<stockId>`), kind (jewelry, stone), product_id, variant_id, stone_id, metal, carat, size, qty (1 to 99), note, memo (stones only), added_at. Unique (cart_id, line_key).

### `orders`

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| number | text unique | `SD-YYMMDD-NNNN`; Thinkspace orders keep their old id as the number |
| legacy_id | text unique | Thinkspace order id |
| source | enum: site, thinkspace, rightclick | rightclick = phone orders mirrored for the dashboard |
| organization_id | uuid | |
| placed_by_user_id | uuid | |
| status | enum `order_status`: received, confirmed, shipped, delivered, cancelled | as `src/lib/orderStatus.ts` |
| pay_state | enum `pay_state`: authorized, captured, initiated, settled, awaiting, received, voided, refunded | |
| payment_method | enum: card, ach, wire | |
| store_name, contact_name, email, phone | text | the checkout's store details, as typed |
| ship_line1, ship_city, ship_state, ship_zip | text | |
| po_number, deadline, notes | text | |
| shipping_method_id | uuid null | |
| before_cutoff | boolean | computed on the server, never trusted from the browser |
| subtotal_cents, shipping_cents, tax_cents, discount_cents, total_cents | bigint | |
| prices_confirmed_at | timestamptz null | prices are provisional until Surreal confirms |
| confirmed_at, shipped_at, delivered_at, cancelled_at | timestamptz | |
| carrier, tracking | text | FedEx, UPS, USPS, Other |
| cancel_reason | text | one of the five reasons |
| amount_collected_cents, pay_ref, paid_at, posted_at | | wire short or long, processor reference, posted in RightClick |
| rightclick_order_ref | text | once written to RightClick |
| placed_at | timestamptz | |

### `order_lines`

id, order_id, kind (jewelry, stone), product_id, variant_id, stone_id, sku, name, metal, carat, size, qty, note, memo, unit_price_cents (provisional at placement, rewritten at confirmation), line_total_cents.

### `order_events`

id, order_id, at, actor_user_id null, actor_label ("Name, Role", "Surreal", "Accounts"), text, dealer_visible (boolean, as `OrderEvent.dealer`).

### `shipping_methods`

id, code, label, cost_cents, cutoff_time (`16:00` Eastern), active. Seeded with FedEx 2-Day and FedEx Overnight.

### `number_sequences`

key, period (e.g. `260105` for daily order numbers), last_value. Incremented in the same transaction that inserts the row.

## 6. Payments

- `payments`: id, number (`PMT-...`), organization_id, order_id null, kind (card, ach, wire, check, zelle), method_label ("Visa ending 4242"), amount_cents, status (pending, completed, failed, refunded), pending_posting (boolean), processor_ref, paid_at, posted_at, posted_by_user_id, source (checkout, invoice_payment, rightclick), created_by_user_id.
- `payment_allocations`: payment_id, invoice_id, amount_cents.
- `payment_methods`: id, organization_id, kind (card, ach), processor_customer_ref, processor_method_ref, brand, last4, expiry, holder_name, bank_name, account_type, is_default, created_by_user_id. Tokens only: no card or account numbers ever reach our database (C-10).

## 7. Billing (mirrored from RightClick)

- `invoices`: id, organization_id, rightclick_invoice_no (null while awaiting issue), source (order, memo, account), order_id null, memo_reconciliation_id null, invoice_date, due_date, terms, po_number, reference, shipping_cents, tax_cents, total_cents, applied_cents, balance_cents, state (open, awaiting, paid), synced_at.
- `invoice_lines`: id, invoice_id, description, ref, qty, unit_cents.
- `credits`: id, organization_id, rightclick_ref, credit_date, amount_cents, applied_cents, reason.
- `account_balances`: organization_id (primary key), balance_cents, past_due_cents, aging (jsonb with RightClick's buckets: current, 30, 60, 90, 120+), credit_limit_cents, memo_balance_cents, fetched_at. A 15 minute cache of the per-dealer RightClick call.

## 8. Memo

- `memo_requests`: id, number (`MO-...`), organization_id, user_id, stone_id, order_id null (when asked for at checkout), status (requested, confirmed, declined, cancelled), memo_line_id null (once RightClick has the memo), requested_at.
- `memo_lines`: id, organization_id, memo_number, stock_id, kind (stone, jewelry), stone_id null, product_id null, title, shape, carat, cut, color, clarity, memo_date, memo_price_cents, status (open, reported_sold, invoiced, returned), source (rightclick, site, thinkspace), rightclick_ref unique, synced_at.
- `memo_reconciliations`: id, number (`MR-...`), organization_id, user_id, confirmed (boolean), note, status (received, processed), processed_by_user_id, processed_at, sent_at, legacy_id.
- `memo_reconciliation_lines`: reconciliation_id, memo_line_id.

## 9. Requests and inquiries

- `requests`: id, number, type (enum: m2o, custom, legacy), organization_id, user_id, status (received, in_review, quoted, cad_sent, approved, in_production, shipped, closed, cancelled; each type uses a subset), contact_name, company, phone, email, payload (jsonb, every field of that type's form, validated by the type's schema so C-17 changes need no migration), source_stone_id null (M2O "grow one like it"), legacy_id, created_at, updated_at.
- `request_files`: request_id, media_id (private).
- `request_events`: id, request_id, at, actor_user_id, actor_label, text, dealer_visible.
- `inquiries`: id, reference (`IN-...`), type (dealer, appointment, order, programs, account, feedback, other), team (sales, finance, manager, admin), first_name, last_name, name, email, phone, company, location, heard, method, preferred_date, order_ref, program, message, organization_id null, user_id null, status (new, in_progress, closed, spam), assigned_to_user_id, acknowledged_at, ip_hash, user_agent, created_at.
- `trade_shows`: id, name, city, dates_text, starts_on, ends_on, booth, active (empty until Q9).
- `trade_show_meetings`: id, number (`TS-...`), trade_show_id null, show_name, days, time_of_day, people, notes, organization_id, user_id, status (requested, confirmed, withdrawn), sent_at.

## 10. Storefront and merchandising

- `merch_items`: list (`hot` for Hot this week, `pins:all`, `pins:<category>`), product_id, position. Ordered lists the console edits.
- `page_settings`: page (`all` or a category slug), default_sort (featured, az, za).
- `banners`: id, label, href, desktop_path, mobile_path, focus, focus_mobile, zoom, active, house (Surreal's own six: can be switched off, not deleted), position, starts_at, ends_at.
- `promos`: id, version, active, layout, tone, image, eyebrow, title, emphasis, message, code, cta, href, fineprint, delay_seconds, audience, repeat, start_date, end_date, published_at, published_by_user_id. Every publish inserts a row; the newest is live.
- `content_blocks`: key, title, body (jsonb), updated_by_user_id, updated_at. Only for the few texts staff edit (trade show list intro, dashboard resources).

## 11. Per-dealer activity

- `recently_viewed`: user_id, product_id, viewed_at. Keep the newest 12 per user.
- `wishlist_items`: user_id, product_id, added_at. Unique (user_id, product_id).

## 12. Sync

- `sync_settings`: job_id (`changes`, `stones`, `jewelry`, `invoices`, `receipts`, `orders`, `memo`, `customers`, `tables`, `session`), every_minutes, enabled; plus on-demand estimates, as `src/lib/sync.ts`.
- `sync_runs`: id, job_id, started_at, finished_at, status (ok, partial, failed), calls_used, rows_added, rows_updated, rows_removed, cursor (the "since" value for the next run), error.
- `rightclick_session`: one row: token (encrypted), created_at, expires_at, outbound_ip.
- `rightclick_calls`: at, endpoint, status, duration_ms, job_id. Kept 30 days, for the call budget card and for CFI if they ask.

## 13. Imports, email, audit

- `import_batches`: id, kind (dealers, catalog, variants, stones, orders, thinkspace_users, thinkspace_orders, rightclick_upload), file_name, media_id (private copy of the file), dry_run, added, updated, skipped, errors (jsonb, row by row), run_by_user_id, started_at, finished_at. Replaces the console's 20-entry import history.
- `email_outbox`: id, template, to_addresses, cc_addresses, subject, payload (jsonb), status (queued, sent, failed), attempts, last_error, sent_at, related_type, related_id.
- `notification_recipients`: event (`order.placed`, `inquiry.sales`, `inquiry.finance`, `m2o.received`, ...), emails (text[]).
- `audit_log`: id, at, actor_user_id, actor_label, action, entity_type, entity_id, before (jsonb), after (jsonb), ip. Every console write.

## 14. Which browser store each table replaces

| Browser key | Tables |
|---|---|
| `surreal-dealer`, `surreal-staff` | `sessions`, `users`, `memberships` |
| `surreal-credentials`, `surreal-login-attempts` | `users.password_hash`, `login_attempts` |
| `surreal-customers`, `surreal-invites`, `surreal-customer-imports` | `users`, `memberships`, `organizations`, `auth_tokens`, `import_batches` |
| `surreal-cart` | `carts`, `cart_lines` |
| `surreal-orders`, `surreal-order-work` | `orders`, `order_lines`, `order_events`, `payments` |
| `surreal-memo`, `surreal-memo-reports` | `memo_requests`, `memo_lines`, `memo_reconciliations` |
| `surreal-invoice-payments`, `surreal-payment-methods` | `payments`, `payment_allocations`, `payment_methods` |
| `surreal-show-meetings` | `trade_show_meetings` |
| `surreal-m2o`, `surreal-custom` | `requests`, `request_files` |
| `surreal-metals` | `product_variants.active`, `products.default_metal` |
| `surreal-merch` | `merch_items`, `page_settings`, `banners`, `product_relations` (looks) |
| `surreal-promo` | `promos` |
| `surreal-recent`, `surreal-wishlist` | `recently_viewed`, `wishlist_items` |
| `surreal-sync-settings` | `sync_settings`, `sync_runs` |
| `surreal-promo-closed`, `surreal-promo-visit`, `surreal-mode` | stay in the browser (per visitor) |
