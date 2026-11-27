# Catalogue sources (v0.9 and v0.10)

Every product template added in v0.9 was checked on **2026-11-23** against a supplier or standard page. Only numbers
printed on those pages are used. The same metadata (supplier, product code, material, date) is stored on each preset in
`src/lib/catalogue/products.ts`, and `tests/v09-catalogue.test.ts` checks that it is present.

Templates are original outlines and 3D renders made by Sheetfit. No supplier photos, logos or template artwork are used.

## Added templates

| Id | Product | Size (as published) | Sides | Material | Supplier / code | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `keyring-square-57` | Square keyring | 57 mm ("57mm wide"); Swing Design lists 5524 as 2.25 × 2.25 in | 2 | Unisub FRP | The Transfer Press, 20UNI05524 | [page](https://www.thetransferpress.co.uk/unisub-keyring-square-c2x17076070) |
| `keyring-rect-32x76` | Rectangle keyring | 32 × 76 mm | 2 | Unisub FRP | The Transfer Press, 20UNI05525 | [page](https://www.thetransferpress.co.uk/unisub-keyring-rectangle-c2x17076612) |
| `keyring-oval-63x35` | Oval keyring | 63 × 35 mm | 2 | Unisub aluminium | The Transfer Press, 20UNI05917 | [page](https://www.thetransferpress.co.uk/unisub-aluminium-keyring-oval-c2x17079630) |
| `pet-tag-circle-31` | Circle pet tag | 31 mm diameter | 1 | White aluminium | The Transfer Press, 20UNI05773 | [page](https://www.thetransferpress.co.uk/unisub-pet-tag-circle-c2x17039184) |
| `pet-tag-heart-31` | Heart pet tag | 31 × 31 mm overall | 1 | White aluminium | The Transfer Press, 20UNI05770 | [page](https://www.thetransferpress.co.uk/unisub-pet-tag-heart-c2x17039150) |
| `pet-tag-bone-38x25` | Bone pet tag | 38 × 25 mm at the widest and longest parts | 1 | White aluminium | The Transfer Press, 20UNI05771 | [page](https://www.thetransferpress.co.uk/unisub-pet-tag-bone-c2x17039165) |
| `id-tag-alu` | Aluminium ID tag | 3.17 × 5.08 cm | 2 (one-sided code 20UNI05588) | Aluminium | The Transfer Press, 20UNI05916 | [page](https://www.thetransferpress.co.uk/unisub-aluminium-id-tag-c2x21695591) |
| `luggage-tag-44x88` | Luggage tag | 44 × 88 mm | 2 | Glossy plastic | The Transfer Press, 20UNI05556 | [page](https://www.thetransferpress.co.uk/unisub-luggage-tags-c2x35720796) |
| `luggage-tag-70x100` | Luggage tag | 70 × 100 mm; Swing Design lists 5503 as 4 × 2.75 in | 2 | Glossy plastic | The Transfer Press, 20UNI05503 | same |
| `luggage-tag-75x140` | Luggage tag | 75 × 140 mm; Swing Design lists 5505 as 5.5 × 3 in | 2 | Glossy plastic | The Transfer Press, 20UNI05505 | same |
| `luggage-tag-round-100` | Round luggage tag | 100 mm round | 2 | Glossy plastic | The Transfer Press, 20UNI05507 | same |
| `plate-mini` | Mini licence plate | 7.4 × 14.9 cm | 1 | Glossy Unisub aluminium | The Transfer Press, 20UNI04565 | [page](https://www.thetransferpress.co.uk/unisub-american-style-licence-plate-c2x19798365) |
| `name-badge-2x3` | Name badge | 2 × 3 × 0.090 in | 1 | Sublimation FRP | Conde Systems (Unisub), U5530 | [page](https://www.conde.com/proddetail.asp?prod=U5530) |
| `name-badge-1.5x3` | Name badge | 1.5 × 3 × 0.090 in | 1 | FRP | Conde Systems (Unisub), U5786 | [page](https://www.conde.com/proddetail.asp?prod=U5786) |
| `name-badge-1.25x3` | Name badge | 1.25 × 3 × 0.090 in | 1 | The page names both FRP and aluminium (medium confidence) | Conde Systems (Unisub), U5502 | [page](https://www.conde.com/proddetail.asp?prod=U5502) |
| `name-badge-1x3` | Name badge | 1 × 3 × 0.090 in | 1 | FRP | Conde Systems (Unisub), U5501 | [page](https://www.conde.com/proddetail.asp?prod=U5501) |
| `sticker-die-2/3/4` | Die-cut sticker | 2, 3, 4 in square (size options offered) | 1 | Sticker media (print-and-cut) | Sticker Mule size options | [page](https://www.stickermule.com/products/die-cut-stickers) |
| `sticker-kiss-round-3`, `sticker-kiss-square-3` | Kiss-cut sticker | 3 in; shape, bleed and safe area are starting values (medium confidence) | 1 | Sticker media | as above | same |

## Changed templates

| Id | Change | Source |
| --- | --- | --- |
| `card-cr80` | Now two-sided (front and back pair) with a 3.18 mm corner radius cut guide. ISO/IEC 7810 ID-1 is 85.60 × 53.98 mm with "rounded corners with a radius of 2.88–3.48 mm"; 3.18 mm is the middle of that range. The note says plainly that only sublimation-coated PVC cards take sublimation. | [ISO/IEC 7810](https://en.wikipedia.org/wiki/ISO/IEC_7810) |
| `keychain-round`, `keychain-rect`, `pet-tag`, `luggage-tag`, `card-business` | Marked two-sided, as their source product names state ("2-Sided"). Moved to the new "Keyrings and tags" and "ID cards and badges" groups. | existing sources |

Group changes are display-only: ids, sizes and saved projects are unchanged.

## Requested but not added as dimensioned presets

These were researched but no page gave usable numbers, so no size was invented. Use a custom box (Products panel, bottom)
or, for ribbon, the lanyard roll layout with your supplier's numbers.

| Requested | Why not |
| --- | --- |
| White polyester sublimation **lanyard ribbon roll** (width, roll length) | No supplier page could be read with a width or length. Conde's search lists neck-ribbon width filters (7/8 in, 1½ in, 3/8 in) but no product page opened; JDS and Coastal returned HTTP 403; the Koncept PDF could not be text-extracted. Implemented as a **roll layout** with user-entered values instead (see below). |
| Badge reels with sublimation inserts | The supplier page (craftybucks.com) rate-limited every request (HTTP 429). No insert size verified. |
| Sublimation-coated PVC ID cards and PVC sheets | No supplier page stating a sublimation coating and a size was found. The CR80 template uses the ISO size and says to check the blank. |
| Heart keyring (Unisub 5520) | The page gives one dimension ("57 mm"), not both. |
| Round bag tag (5507) on Swing Design, round pet tag template 4739 | No size on the index; the 4739 download points to the bone template file. |
| Military-style dog tags other than the Unisub ID tag; bottle-opener keyrings; MDF keyrings; keyring inserts | Listing pages (Print Geek, Longforte) give no dimensions; product pages were not reachable or not opened. |
| Lanyard hooks, clips, badge holders | Hardware and accessories, not printable surfaces. The only verified item (Conde VSC01 vinyl strap clip) is not a sublimation product. |

## Lanyard ribbon roll

White polyester sublimation lanyard ribbon is **roll stock**, not a finished tag, card, badge reel or lanyard. Sheetfit
models it as one roll profile (ribbon width, printable width, strap cut length, gap between straps, end zone kept clear
for hardware, lead-in) with two finished-use presets that share it: **ID-card lanyard strap** and **keychain wristlet
strap**. Every number is typed by the user and shown as "custom, not supplier-verified". Profiles can be saved in the
browser. Code: `src/lib/layout/strip-layout.ts`, `src/components/settings/StripDialog.tsx`.

## Sticker specifications

Sticker bleed, safe area and spacing differ by printer, media and cutter. Adobe's sticker guide says to "Use the bleed
specified for your printer and product" and to use "the printer's sheet-layout requirements for spacing between cut
lines and between a cut line and the sheet edge"
([Adobe Express](https://www.adobe.com/express/learn/blog/how-to-design-stickers-for-print)). Sheetfit therefore stores
these per design and per page and labels its starting values as starting values. The Vervante kiss-cut spec (HTTP 403)
and the Excard label spec (PDF text not extractable) could not be read, so no supplier numbers from them are used.

## v0.10 additions (checked 2026-11-27)

Every size below is printed on the source page; nothing was estimated. Inches are converted at 25.4 mm and rounded to
0.1 mm. The presets live in `src/lib/catalogue/products-v10.ts`; `tests/v10-catalogue-straps.test.ts` checks that each
has a supplier, a source URL and the date, and spot-checks sizes. The Unisub code is the template number on the page.

Sources:

- **S1, S2**: Swing Design, Unisub sublimation blank templates ([page 1](https://www.swingdesign.com/pages/unisub-sublimation-blank-templates), [page 2](https://www.swingdesign.com/pages/unisub-sublimation-blank-templates-1)).
- **H**: HeatPressNation, [sublimation templates](https://www.heatpressnation.com/pages/sublimation-templates) (shaped ornaments, car coasters, the 4.4 in coaster).
- **P**: HeatPressNation, [SubliCraft linen pillow cover](https://www.heatpressnation.com/products/sublicraft-sublimation-blank-linen-pillow-cover).
- **PF**: Printful, [glass cutting board](https://www.printful.com/custom/home-living/all/glass-cutting-board) (two sizes).
- **PY**: Printify, [desk mats](https://printify.com/app/products/975/generic-brand/desk-mats) (three sizes).
- **K**: Kingdom DTF, [sizing guide](https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more) (design widths only).

| Group | Templates (id: size as published, code) | Source |
| --- | --- | --- |
| Ornaments | `ornament-round-2.75`: 2.75 in (4599); `ornament-ball-3x3.37`: 3 × 3.37 in (4335); `ornament-round-3.9`: 3.9 in (4849); `ornament-star`: 3.81 × 3.98 in (4331); `ornament-tree`: 3.38 × 3.95 in (4334); `ornament-heart`: 2.87 × 3 in (4332); `ornament-bell`: 3.3 × 3.33 in (4333); `ornament-snowflake`: 3 in (HPN 84002); `ornament-hexagon`: 2.6 × 3 in (4172); `ornament-oval`: 2.35 × 3 in (4171); `ornament-rect`: 2 × 3 in landscape (4173); `ornament-square-2.75`: 2.75 in (4859); `ornament-square-3.9`: 3.9 in (4850); `ornament-tag`: 2.5 × 3.5 in (4856); `ornament-bone`: 2.12 × 3.25 in (4857); `ornament-cross`: 2.9 × 3.5 in (4855) | H (4335 also S1) |
| Keyrings and tags | `keychain-heart-2part`: 2.73 × 3.18 in (4664); bag tags `bag-tag-square-3`: 3 × 3 in (4622), `bag-tag-2.75x4` (4623), `bag-tag-1.75x3.5` (4624), `bag-tag-round-3.5`: 3.5 in (4625) | S2 |
| Flat goods | magnets `magnet-round-2.5` (5522), `magnet-heart`: 2.5 × 2.25 in (5527); coasters `coaster-square-3.54` (4843), `coaster-round-3.54` (4028), `coaster-cork-3.78`: 3.78 in (5677; H lists 3.75 in, medium confidence); `coaster-round-4.4` (HPN 80307); car coasters `car-coaster-2.5` (ceramic), `car-coaster-2.625`; desk mats 14.4 × 12.1, 23.6 × 13.8, 31.5 × 15.5 in | S1, H, PY |
| Home and decor | `wall-clock-8.125` (5650); `sign-5x12` (4792); yard signs 7.75 × 10 (4774) and 7.75 × 15.83 in (4776); wall panels 8 × 10 (4845) and 5.7 × 15.5 in (4846); natural wood prints 8 × 8, 8 × 10, 10 × 10, 11 × 14 in (4528–4531); `clipboard`: 9.76 × 12.68 in (4672); `pillow-cover-15.74`: 15.74 in square; glass cutting boards 8 × 11 and 11 × 15 in | S1, S2, P, PF |
| Jewellery | cuff bracelets 0.55, 0.875, 1.375 and 1.75 × 6.5 in (4630, 4633, 4636, 4639); pendant inserts round 1 in (4691), square 1 in (4689), rectangle 2 × 1 in (4687) | S2 |
| DTF placements | `crewneck-front` (11–12.5 in wide), `jacket-back` (11–13.5 in), `zip-hoodie-chest` (3.5–4 in per side), `tank-front` (6.5–8.5 in), `youth-sleeve` (2–3 in). K gives widths only: each box starts square at a width inside the range, marked medium confidence, and says so | K |

Shaped blanks (heart, star, tree, bell, snowflake, bone, cross, hexagon, tag) carry a parametric outline drawn to the
published bounding size (ADR 0022); the blank defines the real edge. The v0.9 heart and bone pet tags now use these
outlines instead of their bounding rectangles.

Not added: creative-border ornaments (Benelux, Berlin, London, Prague), paw, honeycomb, pentagon, tapered and
snow-globe ornaments, and novelty keychains (anchor, car, flip-flop, martini, wine glass, shamrock, ribbon). Their sizes
are published but not their outlines, so a shape could not be described honestly. Garden stakes are listed with one
overall size that may include the stake; not added until the plate size is known. Hat, beanie and bucket-hat DTF sizes
appeared only in a search summary without a source page; not added.

## Lanyard and keychain ribbon (v0.10)

- White sublimation lanyard ribbon in **16 mm** and **20 mm** (satin or polyester, 50, 100 and 101 m rolls) and
  **12 mm** sublimation lanyard tape are listed on [IndiaMART](https://m.indiamart.com/impcat/lanyard-rolls.html)
  ([printed lanyards](https://m.indiamart.com/impcat/sublimated-lanyard.html)), checked 2026-11-26. These are the
  quick-pick widths in the strap tool; any other width can be typed.
- ID&C lists lanyard widths from 10 to 25 mm, 20 mm the most popular ([guide](https://www.idcband.com/product-guides/lanyard-width-options-guide/)).
  Wristband Bros lists a 900 mm (35 in) × 20 mm key-ring lanyard ([page](https://wristbandbros.com/lanyards/lanyard-with-key-ring)).
- No source publishes a keychain strap cut length (it depends on the clamp), so the length is always the user's.

## Cutting stickers (v0.10)

| Topic | Guidance | Source |
| --- | --- | --- |
| Border | 2–4 mm for most designs; Sticker Mule's minimum 1/16 in | [Atomm](https://www.atomm.com/cs/blog/2645-how-to-design-stickers), [Sticker Mule](https://stickermule.com/blog/how-to-create-a-sticker-cut-line) |
| Bleed and safe area | 2–3 mm bleed past the cut; keep important elements 3 mm (1/8 in) inside | Atomm, [MOO](https://www.moo.com/blog/ca/inspiration/sticker-design-mistakes), [Fourthwall](https://help.fourthwall.com/create-and-sell-products/best-practices/stickers-best-practices) |
| Spacing | At least 3 mm between stickers for hand cutting; Fourthwall asks 0.25 in between cut lines on sheets | [stickerit.co](https://www.stickerit.co/blog/make-sticker-sheets), Fourthwall |
| Shapes | Smooth outlines; thicken protrusions; avoid tiny inner cuts | Fourthwall, MOO, stickerit.co |
| Cutting by hand | Print a visible outline, cut just outside it with sharp scissors or a craft knife, skip intricate inner cuts; scissors suit die-cut, a craft knife kiss-cut | [stickerit.co](https://www.stickerit.co/en-us/blog/how-to-kiss-cut-stickers-without-a-machine), stickerit.co |
| Resolution | 300 DPI at the final size | Fourthwall, Atomm |
| Cricut Print Then Cut | Largest image 7.2 × 10.62 in on A4, 7.44 × 9.94 in on Letter (current table; the older limit was 6.75 × 9.25 in); Design Space adds its registration marks; print from Design Space | Cricut Help ([page](https://help.cricut.com/hc/en-us/articles/360009429814-How-large-can-I-Print-Then-Cut), refuses automated reading; figures as quoted in search results), [Cricut blog (2021)](https://cricut.com/blog/gb/?p=206443) |
| Silhouette Print & Cut | Studio adds marks in three corners; set Page Setup to the printer's paper size | Silhouette America support |
