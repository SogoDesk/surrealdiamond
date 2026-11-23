# Task list 1

## DIAMOND SEARCH & PRODUCT DISPLAY

- [x] 1. Move the price next to the carat weight and shape details.
- [x] 2. Move the Purchase and Get on Memo (STM) options to the top of the product display. Both should be clearly visible together, above the fold.
- [ ] 3. Add the Legacy logo to the buttons used for Legacy stone selection. ![ASSETS NEEDED FROM NEHA](tag-assets-needed.svg)
- [ ] 4. Integrate the M2O pricing chart into the design (chart to be shared by Surreal) - @Sudhiksha please follow-up Neha for charts, images. ![ASSETS NEEDED FROM NEHA](tag-assets-needed.svg)

## FILTERS

- [x] 5. Remove the up/down arrows from filter input fields and add a separate "Apply Filter" button.
- [x] 6. Shape filter should support Round, Radiant, Emerald, Oval, Cushion, Pear and Princess.
- [x] 7. Default search criteria: F colour and above, VS2 clarity and above.
- [x] 8. Hide the filter bar while scrolling.

## JEWELLERY PRODUCT PAGE & CART

- [x] 9. Show the quantity and carat weight fields on one line.
- [x] 10. Simplify Special Instructions by removing the engraving and delivery-date prompts.
- [x] 11. Replace Buy Now with Add to Cart. After adding, show a popup with "Go to Cart" and "Continue Shopping".
- [x] 12. Merge the Metal, Diamond and General details sections into a single section titled "Details".
- [ ] 13. Add a short-term memo (STM) disclaimer on the cart page. Surreal to provide the wording. ![ASSETS NEEDED FROM NEHA](tag-assets-needed.svg)
- [ ] 14. Keep secondary product images simple. Complex image sets make inventory updates harder to maintain. ![TO BE DISCUSSED](tag-to-be-discussed.svg)

## SITE-WIDE & NAVIGATION

- [x] 15. Improve load speed for the top bar, or keep it opaque while scrolling.
- [x] 16. Link the Jewelry button to the All Jewelry page.
- [x] 17. Rename "Quick Answers" to "Frequently Asked Questions".
- [ ] 18. Where the brand font is hard to read, switch to a plain, readable font. Surreal will send notes on which headers this applies to. ![ASSETS NEEDED FROM NEHA](tag-assets-needed.svg)

## RETAILER DASHBOARD

- [x] 19. Add a small, underlined Log Out link.
  - Done 23 Nov 2026: under the store name at the top of the dashboard, on phones too.
- [x] 20. Add a "Forgot your password?" request link.
  - Done 23 Nov 2026: in Account settings, under the current password. It shows an error until a mail service is set up to send the email.
- [ ] 21. Remove sidebar links that already exist elsewhere on the site, and add Brand Images and Spiff Program catalogs. ![ASSETS NEEDED FROM NEHA](tag-assets-needed.svg)
  - Part done 23 Nov 2026: Diamond search, Made to Order, Diamond Legacy, Custom jewellery and Cart are out of the sidebar. Brand Images and Spiff Program catalogs wait for the files.
- [x] 22. Default invoice payment method: bill to account (standard wholesale workflow).
  - Done 23 Nov 2026: Bill to account is chosen by default at checkout, with card, ACH and wire still offered. A billed order shows as an open invoice on Net 30 Days terms (to confirm with Surreal).
- [ ] 23. Order status and shipment tracking should update from the system's shipping paperwork.

## OTHER FRONTEND BUGS

- [x] 1. Fix the spelling of Jewelry in the top navbar and make it proper.
  - 23 Nov 2026: now spelled Jewellery everywhere the site shows it (pages, menus, titles, console). Page addresses stay /jewelry so links keep working.
- [x] 2. Top navbar: when scrolling up and down, the last bar of the navbar shows separately. It should not show as a separate bar, and the navbar should show up faster on each page.
- [x] 3. Top navbar: remove Appointments so the search bar is not cut off, and move the cart icon before the Dealer Options and Retailer Dashboard buttons.

## ADDED ON REQUEST

- [x] Jewellery listing pages: show the products on the first screen instead of the categories, collections and programs.
  - Done 23 Nov 2026: a compact top (smaller title, one line pricing note) and one row of category pills, with Collections and Programs as pills that open their tiles. The first row of products now shows on a 1440 × 900 laptop and on a phone. The description stays on laptops and is hidden on phones.

## NOTE

**Item 7 is fixed** (still worth confirming the reading with Neha). Here is what its words mean.

**Colour** (how colourless the diamond is)

| D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|
| BEST | | | | | | LOWEST |

- D is the best. J is the lowest.
- "F colour and above" = F and the better ones = **D, E, F**.

**Clarity** (how clean the diamond is inside)

| FL | IF | VVS1 | VVS2 | VS1 | VS2 | SI1 |
|---|---|---|---|---|---|---|
| BEST | | | | | | LOWEST |

- FL is the best. SI1 is the lowest.
- "VS2 clarity and above" = VS2 and the better ones = **FL, IF, VVS1, VVS2, VS1, VS2**.

**So the fix is:** when the Diamonds page opens, D, E, F and FL to VS2 are already selected.
