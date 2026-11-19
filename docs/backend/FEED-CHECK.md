# Test feed check: FEED UPLOAD.csv

Checked 9 November 2026. Contains cost and margin, so this stays in the git-ignored docs. Never commit the CSV.

**Result: the data is good enough to build on and to run the diamond page in testing. It is not yet a live inventory feed.** Six things below have to be settled first.

## What the file is

5,512 stones, 20 columns, one location (`MAIN`), all IGI. 1.00 to 20.12 ct, colors D to H plus one `PINK`, clarity IF to SI1. Shapes: RD 1,712, OV 1,485, CC 499, RC 430, PR 409, EC 390, PS 344, HS 243.

It looks exported by hand from Excel: `#N/A` cells, prices with long decimals, a misspelled header (`interchage_video_link`). No date, status or delivery method.

## What checked out

- Every row has 20 columns. Every number parses and none is zero or negative.
- All 5,512 certificate numbers are unique, 9 digits.
- The description agrees with the columns on every row (certificate, shape, color, clarity, carat).
- Depth % equals depth / width on every row, within 1.1 points.
- Carat fits the measurements: 1 row in 5,512 is more than 25% from its shape's norm.
- No price is over 3 times the median for its shape, color, clarity and size.
- 24 of 24 sampled video links work: MP4, seekable, playable from another site. 1.5 to 26 MB, about 7.5 MB on average.
- The one video opened showed a princess cut, matching its row, with no branding in the two frames viewed.

## To settle before live

| # | Problem | Evidence | What we do |
|---|---|---|---|
| 1 | `SBD` codes are not unique | 153 codes are shared by 310 stones. The code is `SBD` plus the certificate's last 5 digits on every row, so collisions grow with stock. `SBD43785` is both 817643785 (cushion 4.40) and 722543785 (round 1.52) | Key every stone on its certificate number, not `stock_id`. SCHEMA.md has `stock_id` unique and API.md has `/stones/:stockId`: both change. Surreal must say which id RightClick uses |
| 2 | Price meaning is not stated | `price1` is `cost / 0.77` on every row. It cannot be per stone: a 20.12 ct pear would be $506. Per carat it is $10,191, and the median stone is $318 | Treat as per carat, per stone = `price1 x carat`, rounded once. Surreal to confirm, and that `price1` is what dealers pay |
| 3 | Cost and margin are in the file | `interchange_cost` on every row | Only ever through the API. Cost is staff only, and `stones.raw` must not leave the API. The CSV cannot go into the site's code or browser data |
| 4 | No Legacy flag | No column | `/legacy/stones` would be empty, so Start a Legacy dead-ends. Surreal to give the rule |
| 5 | No status | No sold, held or memo; everything is `MAIN` | Being in the file means available. Selling safely still needs RightClick's live check (C-07). No real dealer orders on this data |
| 6 | No delivery method | A one-off file | Console upload first (already the plan's fallback), then an automatic feed once Surreal says how it arrives |

## Smaller fixes, ours to make

| Field | In the feed | Handling |
|---|---|---|
| Shape | `RD OV CC RC PR EC PS HS`; 1,894 `OV` and `PR` values have a trailing space | Trim. Round, oval, cushion, radiant, princess, emerald, pear, heart: read from the codes and proportions, Surreal to confirm |
| Grades | `I` 1,092, `EX`, `VG` | Ideal, Excellent, Very Good |
| Cut | Blank on most fancy shapes and 1 round; 25 fancy shapes carry `EX` | Already optional. Keep as supplied |
| Symmetry | Blank on 18 stones | Site requires it today: make optional and show nothing |
| Color | 1 `PINK` stone (LG-771624314) | The D to J scale cannot hold it. Skip and report until Surreal decides |
| Fluorescence | No column | Hide the filter and the row. Do not assume None |
| Video | 2,320 links (42%), 1,912 `0`, 1,280 `#N/A` | `0` and `#N/A` mean none. New player in Quick View, loaded only when a stone is opened. All on `dnalinks.in`; rehosting would be about 17 GB |
| Certificate link | None | Build from `LG` + number on igi.org. IGI's bot check blocks testing it from here, so address and numbers are unconfirmed |
| Stone photo | None | Keep the shape illustration |
| Ratio | Rounds can read 0.97 to 1.00; hearts about 0.89 | Fine. Computed in the database |

## Differences from Thinkspace

Thinkspace held 13,913 stones (5 November survey), with D to K, GCAL as well as IGI, and shapes this file lacks. This file has 40% of that, nothing under 1 ct and no memo stones. The filters read their choices from the data, so they adapt, but Surreal should say what was left out.

Showing real stones also changes exposure: API.md lets visitors see stones without a price, while the old site gates them behind a login. With real certificate numbers that is Surreal's call.

## What it takes to use it

No `stones` table exists on live, and the site's list is a 260-stone sample built into its code.

1. **Database:** migration for `stones` and `import_batches`, keyed on certificate number. A push applies it to live.
2. **Importer:** `stones:import` with a dry run. Validates every row and writes a report. All or nothing. Stones missing from a new file become `unavailable`. Refuses a file much smaller than the last one.
3. **API:** `GET /stones` (filters, sort, cursor paging), `/stones/facets`, `/stones/:certificate`. No price for visitors, per-stone price for dealers, cost never.
4. **Website:** `/diamonds`, Quick View with video, Legacy and site search on the API. 14 files import the sample stones, and cart, checkout, mini cart, orders, memo and invoices look stones up by id, so those need care while the cart lives in the browser (B4).
5. **Label:** change "Sample feed" to a test notice until Surreal signs off.
6. **Later:** console upload, automatic feed, RightClick check.

## Questions for Surreal

1. Is `price1` per carat, and is it what dealers pay?
2. 153 stock codes are shared by different stones, for example SBD43785 on certificates 817643785 and 722543785. Which id do you and RightClick use for a stone?
3. Please confirm the shape codes: RD, OV, CC, RC, PR, EC, PS, HS.
4. Which stones are Diamond Legacy?
5. Is this all the inventory? The current site lists 13,913 stones; this file has 5,512, with nothing under 1 ct, no GCAL and no memo stones.
6. How will the real feed reach us (link, SFTP, RightClick), and how often?
7. Can you add fluorescence? Is the site free to use the `dnalinks.in` videos, and are there photos for the 58% of stones without one?
8. Should visitors see stones and certificate numbers without logging in?
9. How should the one PINK stone be shown?
