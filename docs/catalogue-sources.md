# Catalogue sources (v0.9)

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
