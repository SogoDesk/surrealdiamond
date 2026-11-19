# Thinkspace data survey and migration map

What the current site's admin (Thinkspace, a Django admin at surrealdiamond.com/admin) holds, what our frontend screens need from it, and how each export lands in our PostgreSQL database. Surveyed read only on 5 November 2026 with a Surreal staff login that Ajay signed in himself: list pages and record forms were opened, nothing was added, saved, deleted, exported or cache-busted.

Personal data (dealer names, emails, phones, addresses) is deliberately left out of this file. Counts are as of 5 November 2026.

Related: [PLAN.md](PLAN.md) (architecture), [SCHEMA.md](SCHEMA.md) (our tables), [TASKS.md](TASKS.md) (the import tasks, block M), [CHECKLIST.md](CHECKLIST.md).

## 1. What we take, at a glance

| Thinkspace area | Records | Take? | Lands in | Why |
|---|---|---|---|---|
| Products (Catalog) | 377 | **Yes** | `products` | The jewelry store, product pages, Quick View, search |
| Product variants | 1,075 rows in the product feed | **Yes** | `product_variants` | Metal and carat per piece, each with its own stock number and dealer price |
| Product images | about 1 per variant (files.jewelfeed.com) | **Yes**, downloaded and rehosted | `media_assets` | Fallback photography where our renders are missing; never hotlink |
| Product types in use | 8 of 146 | **Yes** | `categories` | Bangle 9, Bracelet 27, Earrings 71, Engagement Ring 86, Necklace 27, Pendant 93, Ring 26, Wedding Band 38 |
| Collections in use | 5 of 11 | **Yes** | `collections` | 18Kt Yellow Gold Vermeil 23, Constellation 12, Enamour Enamel 18, Laser Pierced 22, Sterling Silver 33 |
| Subcategories in use | 4 of 94 | **Yes**, as tags | `product_tags` | 2026 Catalog 143, 2026 Flyer 70, 2025 Flyer 38, Sterling Silver 56 (drives the 2026 Holiday Catalog and Flyer Program divisions) |
| Organizations (dealer stores) | about 705 | **Yes** | `organizations` | Every retailer account; 65 have no users |
| Store locations | 119 | **Yes** | `organization_addresses` | Store address, phone, email for checkout and the account page |
| Users | about 797 (788 dealers, 9 staff) | **Yes** | `users`, `memberships` | Dealer logins; Manager group (560) becomes owner (Dealer), Associate (32) becomes associate (Dealer Associate), 203 have no group |
| Placed orders | 1,557 (June 2023 to 4 Nov 2026), 166 stores | **Yes** | `orders`, `order_lines` | Order history, quick reorder, recently ordered |
| Open carts | 136 | Optional | `carts` | Only if Surreal wants live carts carried over; otherwise skip |
| Diamonds | 13,913 | **For staging only** | `stones` | RightClick is the source of truth (C-07); this export lets the diamond page run on real stones before the RightClick connection |
| Memo stones (inside Diamonds) | part of the 13,913 (source `surreal-out`) | **For staging only** | `memo_lines` | Memo date, number, price and account per stone; RightClick replaces it |
| Diamond reference values | cuts 11, colors 9, clarities 8, grades 5, labs 15 | **Yes** | reference tables / enums | Filters and validation |
| Shipping methods and costs | 2 | **Yes** | `shipping_methods` | FedEx 2-Day and FedEx Overnight, flat cost each, 4 pm Eastern cutoff |
| Form responses: M2O | 10 | Optional, archive | `requests` (type m2o) | Dealer history; field list confirms our M2O form (C-17) |
| Form responses: Jewelry Order Form | 59 | Optional, archive | `requests` (type custom) | The custom jewelry request history |
| Form responses: Memo Reconciliation | 73 | Optional, archive | `memo_reconciliations` | Past reconciliations by dealers |
| Form responses: Contact Us, Inquiry, others | 1,114 + 48 + 33 | No | | Mostly one-off messages and spam; keep the export as a file only |
| Wishlists | about 800, nearly all empty | No | | |
| Sales incentives (SPIF) | 1 (a test) | No | | |
| Slideshows | 4 | No | | Our banners use Surreal's campaign photographs |
| Pages, menus, blog, FAQ, testimonials, employees | 146 pages, 93 menu links | No (content already captured in docs/CONTEXT.md and src/content) | | Copy is rewritten in the new site |
| Price rules, promo codes, gift cards, warranties, financing, currencies | all 0 or unused | No | | |
| Payment settings | | **Never** | | Gateway keys and bank details stay out of every export and file |

## 2. Module by module

### 2.1 Jewelry catalog

**Products** (`/admin/tsj_catalog_local/adminitemview/`, 377, all brand "Surreal Diamond")

| Thinkspace field | Meaning | Our column |
|---|---|---|
| id (UUID) | product id | `products.legacy_id` |
| name | "Lab Grown Solitaire Studs" | `products.name` |
| stock_number | style code, e.g. `SD-Solitaire Studs`, `SD-LROV230W530` | `products.style_code` |
| style_number | mostly empty | `products.style_number` |
| slug, slug_type | URL | `products.slug` (re-slugged to our URL scheme) |
| item_type_id | one of the 8 types above | `products.category_id` |
| department_id, item_sub_types, styles | mostly unset | not taken |
| categories (subcategories) | 2026 Catalog, 2026 Flyer, 2025 Flyer, Sterling Silver | `product_tags` |
| collection (via Collections) | 5 collections | `product_collections` |
| description | HTML | `products.description` (cleaned to text) |
| hide_pricing, not_available | Hide Price, Disable Purchase | `products.hide_price`, `products.purchasable` |
| featured, featured_weight | featured flag and order | `merch_items` (Hot this week seed) |
| related_items | related products | `product_relations` (Complete the look, until C-08) |
| page_title, meta_description | SEO | `products.seo_title`, `products.seo_description` |
| status | Active / inactive | `products.status` |
| media (images, video, embed) | product media | `media_assets` |

**Variants** (`/admin/tsj_catalog_local/adminitemview/<id>/variants/`, one row per metal and carat)

| Thinkspace field | Our column |
|---|---|
| variant id (UUID) | `product_variants.legacy_id` |
| metal (14K White Gold, 14K Yellow Gold, ...) | `product_variants.metal` (mapped to our metal codes, src/lib/metals.ts) |
| total carat weight | `product_variants.carat_total` |
| price | `product_variants.list_price_cents` (the price dealers pay today; the brand's price type is "cost") |
| cost | `product_variants.cost_cents` (staff only) |
| retail_price | mostly empty | `product_variants.retail_price_cents` |
| stock_number, e.g. `ER0073W450` | `product_variants.sku` (this is the SKU on orders) |
| availability, active | `product_variants.active` |

**The product feed** (`/facebook/feed/items/?brand=surreal-diamond`): a CSV Thinkspace already publishes daily, 1,075 rows, one per variant, columns `id, title, google_product_category, description, product_type, link, image_link, availability, inventory, condition, price, sale_price, brand, mpn, color`. `id` is the variant UUID, `mpn` the variant SKU, `image_link` the variant image on files.jewelfeed.com. This is the quickest catalog export: products and variants with images in one file. Product level fields it lacks (type, collections, tags, flags, related) come from the product list export.

**Variant options**: 175 option names and 54,588 values exist (Thinkspace's shared library across many stores). Surreal's pieces use Metal and Total carat weight; ring size is a product setting. We keep only metal, carat and ring size.

### 2.2 Diamonds

**Diamonds** (`/admin/tsj_gemstone/diamond/`, 13,913). Thinkspace fills this from its supplier feed setting "Surreal (lab)", so it mirrors Surreal's inventory system rather than owning it.

| Thinkspace field | Our column |
|---|---|
| stock_number (SBD..., SD...) | `stones.stock_id` |
| lot_num | `stones.lot_number` |
| carat_weight | `stones.carat` |
| cut (shape): Round, Oval, Pear, Emerald, Princess, Radiant, Cushion, Marquise, Asscher, Heart, Trilliant | `stones.shape` |
| color D to K, clarity FL to SI2 | `stones.color`, `stones.clarity` |
| cut_grade, polish, symmetry (Ideal, Excellent, Very Good, Good, Fair) | `stones.cut_grade`, `stones.polish`, `stones.symmetry` |
| fluorescence (None to Very Strong), fluorescence_color | `stones.fluorescence` |
| depth_percent, table_percent, length, width, depth | `stones.depth_pct`, `stones.table_pct`, `stones.length_mm`, `stones.width_mm`, `stones.depth_mm` (ratio computed) |
| girdle, culet | `stones.girdle`, `stones.culet` |
| certifier (lab; in use IGI and GCAL), cert_num, cert_image | `stones.lab`, `stones.certificate_number`, `stones.certificate_url` |
| image, video, embed | `stones.image_url`, `stones.video_url` (mostly empty today) |
| carat_price, price, cost | `stones.price_per_carat_cents`, `stones.price_cents`, `stones.cost_cents` (off_rap not taken) |
| manmade | always Yes (lab grown) |
| source: `surreal` (in stock) or `surreal-out` (on memo) | `stones.status` (`available` or `on_memo`) |
| owner (an account number, e.g. 1006, on memo stones) | `memo_lines.organization_id`, through `organizations.rightclick_customer_code` (Q-B3) |
| data (JSON): memo_date, memo_num, memo_price, memo_amount, memo_company, account_ID | `memo_lines` |
| comment (e.g. "Lab Grown - BR .30 E, VS1, IGI#...") | kept in `stones.raw` |

Diamond markup in Thinkspace is a single 0% rule, so the price dealers see equals `price`. There is no Legacy flag and no next day delivery flag on Thinkspace stones: both come from RightClick or Surreal's sheet (C-03, C-04).

### 2.3 Dealers and users

**Organizations** (`/admin/ts_company/organization/`, about 705): name, slug, logo, group (always `b2b`), website, number (empty on every record), assigned sales rep (one of Surreal's staff), sales incentive flag, and nested store locations.

**Locations** (`/admin/ts_company/location/`, 119): name, organization, address, address 2, city, state, postal code, country, phone, email, website, map link, hours label, pick up flags. These become store addresses.

**Users** (`/admin/auth/user/`, about 797): username, first and last name, email, active (695 active, 102 inactive), staff flag (9 staff), groups (Admin, Associate, Manager), date joined, last login (361 signed in during 2026, 138 in 2025, 214 never), and an account record with organization, full name, email and phone.

| Thinkspace | Ours |
|---|---|
| organization | `organizations` (store), `legacy_id` kept |
| location | `organization_addresses` |
| user (not staff) | `users` (kind dealer) + `memberships` (organization, role) |
| group Manager | role `owner` (Dealer in the BRD) |
| group Associate | role `associate` (Dealer Associate) |
| no group | role `owner` if the user is the store's only user, else `associate` (confirm with Surreal, Q-B4) |
| user (staff) | `users` (kind staff); roles assigned by Surreal in our console, not carried over |
| organization.sales | `organizations.sales_rep_user_id` |
| (RightClick customer code) | `organizations.rightclick_customer_code`, from RightClick's customer list, since Thinkspace's "number" is empty |
| active = false | `users.status = disabled` |
| last login | used to order the invitation waves (recently active dealers first) |

**Passwords.** The admin does not show password hashes, and Django stores them as `pbkdf2_sha256$...`. If Thinkspace can hand over a database export with `auth_user.password`, our login can check those hashes once and rehash them, so dealers keep their current password. Without it, every dealer gets a set-password link (the flow built in the console's Dealers import). See PLAN.md section 5.

**How memo stones link to a dealer.** Memo stones carry an account number (`owner`, `account_ID`), not a website user, and the organization's "number" field is empty everywhere. The mapping from account number to dealer store is not in the admin; it is most likely the RightClick customer number. Open question Q-B3 in CHECKLIST.md.

### 2.4 Orders

**Orders** (`/admin/tsj_commerce_local/order/`, 1,557 placed, 1 returned). Status is "Order Placed" on all of them: fulfilment is tracked in RightClick, not here.

| Thinkspace field | Our column |
|---|---|
| id | `orders.legacy_id`, shown as the order number for old orders |
| created, confirmed | `orders.placed_at`, `orders.confirmed_at` |
| status, status history | `orders.status` (`placed`), `order_events` |
| organization, location, email, submitted by | `orders.organization_id`, `orders.placed_by_user_id` |
| customer_id (labelled PO #) | `orders.po_number` |
| notes | `orders.notes` |
| requested (delivery date) | `orders.requested_delivery_date` |
| shipping_method, shipping cost, shipping address fields | `orders.shipping_method_id`, `orders.shipping_cents`, `orders.ship_*` |
| items_subtotal, discount, tax, total, paid | `orders.subtotal_cents`, `orders.discount_cents`, `orders.tax_cents`, `orders.total_cents` |
| payment_method (empty on the samples) | `orders.payment_method` |
| line: item_type `tsj_gemstone.Diamond` or `tsj_catalog_local.ItemView` | `order_lines.kind` (`stone` or `jewelry`) |
| line: item_id, sku, name, quantity, unit price, line price, special instructions, notes | `order_lines.*` |
| line data: `itemvariant` (variant UUID), `type: cost` | `order_lines.variant_id` |

**Carts** (`/admin/tsj_commerce_local/cart/`, 136 open: 98 with products, 38 at checkout). Optional import.

**Shipping**: FedEx 2-Day and FedEx Overnight, each a flat cost for any order value, both labelled "orders placed before 4pm EST". Tax: one class, no rate in use.

### 2.5 Forms (the dealer requests)

Form definitions live on the old pages; the admin keeps the responses with their fields as JSON.

| Form | Responses | Fields (besides name, email, phone, company) | Ours |
|---|---|---|---|
| M2O Custom Diamond Order Form | 10 | Shape, Exact Size Requested, Length/width ratio, Girdle Inscription, Customer Name (for booklet), Notes/Comments | `requests` type `m2o`; compare with src/content/m2o.ts for C-17 |
| Jewelry Order Form | 59 | Item Type, Metal, Gold Color, Two Tone (specify), Center Stone Shape, Center MM Size / Ct Weight, Finger Ring Size, Style, Design Matching Bands, CAD Requested, PO, Deadline, Special Instructions, Upload Any Images, Active Surreal Account, Tell Us About You | `requests` type `custom` |
| Memo Reconciliation Form | 73 | reconciliation (yes/no), no_sales (yes/no), diamonds_sold (stock ids, comma separated), discrepancies (text) | `memo_reconciliations` |
| Legacy Order Form | 0 | | `requests` type `legacy` |
| Contact Us, We Want to Hear From You, Website Content Request | 1,114, 8, 7 | first and last name, email, phone, message | `inquiries` (not imported) |
| Inquiry | 48 | item selection, type, message | `inquiries` (not imported) |
| April Promotion Signup | 12 | store name | not taken |

Notifications for these forms go to Surreal's orders and sales mailboxes; our notification settings take the same recipients (C-14).

## 3. How to export

The Thinkspace admin has no export button: list actions offer only "Delete selected". Three ways, best first:

1. **Ask Thinkspace for a database export** (preferred). A Postgres or CSV dump of the tables above gives every field, including password hashes, in one go. Ask through Surreal.
2. **The product feed CSV** for products and variants with images (section 2.1). Download it once per import run.
3. **Manual export from the admin pages**, module by module, as Ajay planned. A small read-only exporter run in a signed-in browser can page through each list and record form and save JSON files (the same GET requests used for this survey); it never posts. We can write it on request.

Whatever the route, files go into a dated folder outside the repository (`imports/2026-11-xx/`), never committed, since they hold dealer personal data and prices.

## 4. Import order and rules

1. Reference data: metals, shapes, colors, clarities, grades, labs, shipping methods.
2. Catalog: categories, collections, tags, products, variants, then images (downloaded, resized, stored).
3. Organizations, then addresses, then users and memberships (no passwords unless hashes arrive).
4. Orders and order lines, matched to organizations, users, variants (by SKU) and stones (by stock id; unmatched stones keep their stock id and name only).
5. Staging only: diamonds and memo lines, until RightClick is connected.
6. Optional archives: M2O, custom and memo reconciliation responses.

Rules for every importer:

- **Idempotent**: each row keeps its Thinkspace id in `legacy_id`; a rerun updates, never duplicates.
- **Dry run first**: every import prints what it would add, update and skip, plus every row it could not map, before writing.
- **Batch record**: each run is logged in `import_batches` with the file, counts and who ran it.
- **No secrets, no bank data**: payment settings and anything with account numbers stay out.
- **Money in cents**, USD; dates stored in UTC, shown in Eastern time.

## 5. Things to confirm

| # | Question | Who |
|---|---|---|
| Q-B1 | Can Thinkspace provide a database export, including `auth_user.password` hashes? | Surreal, Thinkspace |
| Q-B2 | Carry over open carts and the archived form responses, or start clean? | Surreal |
| Q-B3 | How memo account numbers (e.g. 1006) map to dealer stores; is it the RightClick customer number? | Surreal, CFI |
| Q-B4 | Users with no group (203): dealer or associate? | Surreal |
| Q-B5 | Thinkspace "Embeds" gives some retailers a hosted diamond search on a subdomain (e.g. `/sub/`). Does that need to keep working after the switch? | Surreal |
| Q-B6 | Inactive dealers (102) and organizations with no users (65): import as disabled, or leave out? | Surreal |
| Q-B7 | The new store shows all 377 Thinkspace pieces (Thinkspace photos where we have no render yet), or only the pieces with Surreal's new imagery? | Surreal |

## 6. Matching our curated pieces to Thinkspace

The frontend's 82 products (`src/content/catalog.ts`) are built around Surreal's renders, and their ids are our own slugs. Thinkspace has 377 products with their own ids. They have to be linked, so the curated pages get Thinkspace's variants, SKUs and prices, and old orders point at the right piece.

Checked on 5 November 2026: of the 69 distinct style codes at the start of our render file names, **29 match a Thinkspace variant SKU or product URL directly** (for example `LE2004W442` is the variant of "Oval Halo Pave Ring", `LR0001W430` of "Round 3 Stone Ring", `CA24MR0005` of `SD-MR0005`). The other 40 are mostly `LG...` codes (for example `LGPD80437`, `LGBD70166`) that look like manufacturer style numbers and appear nowhere in Thinkspace's feed.

Plan: the catalog import fills `render_mappings` automatically for the 29, then produces a sheet of the rest (our piece, its renders, the closest Thinkspace candidates by type and name) for Surreal or Ajay to confirm. Until a piece is confirmed it keeps its curated data and shows no Thinkspace price.
