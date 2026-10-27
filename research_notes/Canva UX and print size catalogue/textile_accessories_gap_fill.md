# Textile accessories and less common apparel placements: print size gap-fill (sublimation and DTF)

Conventions used throughout:
- Sheet fit compares the design or print-file size with A4 (210 × 297 mm, 8.27 × 11.69 in) and A3 (297 × 420 mm, 11.69 × 16.54 in), with rotation allowed. "Roll" means it is larger than A3 in at least one dimension.
- mm values are my conversions (1 in = 25.4 mm), rounded to the nearest mm.
- Pixel-to-inch conversions are only stated where the source gives the DPI/PPI. Anything else is labelled as an inference.
- Confidence: High = primary vendor or catalog spec, current; Medium = one reputable vendor guide or several consistent secondary sources; Low = a single secondary or marketplace source, an old source, or my own inference.
- Retrieval date: 2026-10-27. Several pages were fetched with curl because WebFetch returned 429. Printful catalog data came from the public `https://api.printful.com/products/{id}` endpoint (no auth required). Its `dimensions` field gives placement sizes for some hats, but not the DTF hat or tote areas.

## 1. Caps and hats (structured cap front, trucker, beanie, bucket hat, sublimation patches)

### Takeaway
On a cap, the front design should be about 4–5 in wide and 1.75–2.25 in tall (102–127 × 44–57 mm). Trucker and snapback fronts allow up to about 5.5 × 2 in (140 × 51 mm). Beanies and bucket hats take about 5 × 1.75–2 in. Every hat placement fits on A4. The common sublimation hat patch blanks are 3.5 × 2.5 in (89 × 64 mm) and 2.5 × 4 in (64 × 102 mm).

### Cited Findings
- Printful's hat sizing guide is dated Sep 4, 2026. It gives these front sizes: structured caps 4–5 in wide × up to 2.25 in tall; trucker up to 5 in wide × up to 2 in; dad hat 3.5–4 in × 1.75–2 in; bucket hat about 5 in × 1.75–2 in; beanie 5 in × 1.75–2 in. Side placement is 2–2.5 × 1–1.25 in and back is 2.25–3 × 0.75–1 in. It also says "a DTFlex decal on the front of most hats works well between 4 and 5.5 inches wide" and that exact sizes vary by product. — [Printful blog: Hat logo size and placement guide](https://www.printful.com/blog/hat-logo-size-and-placement-guide)
- Printful catalog API `dimensions` field, used for embroidery and DTF placements: Snapback (Otto Cap 125-978) front 5.5 × 2 in, side 2 × 0.75 in. 5 Panel Trucker Cap (Yupoong 6006) front 5.5 × 2 in. Closed-Back Structured Cap (Flexfit 6277) front 4 × 1.75 in. Knit Beanie (Otto Cap 82-480) front 5 × 1.75 in. — [Printful API product 77](https://api.printful.com/products/77), [100](https://api.printful.com/products/100), [140](https://api.printful.com/products/140), [81](https://api.printful.com/products/81)
- Printful offers a separate `front_dtf_hat` placement on many caps and bucket hats (e.g. Classic Dad Hat 206, Bucket Hat Flexfit 5003 #253, Organic Bucket Hat 547, Trucker 596/627/680). The public API does not publish that placement's dimensions. — [Printful API product list](https://api.printful.com/products)
- xTool's DTF chart (updated Dec 30, 2025) gives cap front as 3.0–4.0 in W × 2.0–2.5 in H ("fixed by the hat panel; requires a cap heat press platen") and cap back as 3.5 × 1.0 in. — [xTool DTF transfer size chart](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart)
- DTF Transfers Now (page © 2026) gives baseball cap front 4 × 1.75 in, back 2 × 1 in, fitted hat front 4 × 1.75 in, bucket hat front 2.5 × 2.5 in and beanie front 5 × 1.75 in. Its trucker front is printed as "3.5 in × 15 in", which is almost certainly a typo for about 1.5 in tall. — [DTF Transfers Now size guide](https://dtftransfersnow.com/dtf-size-and-print-guide)
- Fulfill Engine maximum embroidery sizes: front of baseball hat 4 × 2.25 in, bucket hat 4 × 2.25 in, beanie 4 × 2.25 in, visor 4 × 2 in. The page says "Updated 2 years ago". — [Fulfill Engine max decoration sizing](https://help.fulfillengine.com/en/white-label-store/max-decoration-sizing)
- Patch blanks: hexagon leatherette blanks are sold at about 3.5 × 2.5 in, and in 3 × 2 in and 3.5 × 2.5 in options. A faux-leather sublimation rounded rectangle is 2.5 × 4 in, and a rectangle sublimation blank is about 3.9 × 2.36 in. These come from marketplace listings found by search; I did not open each listing. — [Etsy blank leather hat patch](https://www.etsy.com/listing/1759985019/blank-leather-hat-patch); [WoodArtSupply 4 in rounded rectangle PU leather sublimation patch](https://woodartsupply.com/products/sublimation-blanks-10-pcs-faux-gray-leather-hat-patch-sublimation-laserable-blank-4-rounded-rectangle-pu-leather)
- Apliiq's printed patch-hat template is "3.5" wide X 2.0" tall at its highest point". — [Apliiq: preparing artwork for printed patch hats](https://help.apliiq.com/portal/kb/articles/how-to-prepare-artwork-for-printed-patch-hats)

### Size table
| Item | Recommended size (in) | mm | Fit | Confidence |
|---|---|---|---|---|
| Structured cap front (DTF/decal) | 4–5 × 1.75–2.25 (DTFlex up to 5.5 wide) | 102–127 × 44–57 (up to 140 wide) | A4 | High (Printful), several sources agree |
| Trucker / snapback front | 5–5.5 × 2 | 127–140 × 51 | A4 | High (Printful API + blog) |
| Dad hat (unstructured) front | 3.5–4 × 1.75–2 | 89–102 × 44–51 | A4 | High (Printful) |
| Beanie cuff front | 5 × 1.75 (Fulfill Engine embroidery max 4 × 2.25) | 127 × 44 | A4 | Medium-High (Printful embroidery area; no DTF-specific beanie spec) |
| Bucket hat front | ~5 × 1.75–2 (DTF Transfers Now: 2.5 × 2.5) | 127 × 44–51 (64 × 64) | A4 | Medium (sources disagree on shape) |
| Cap back (above strap) | 2.25–3.5 × 0.75–1 | 57–89 × 19–25 | A4 | Medium-High |
| Cap side | 2–2.5 × 0.75–1.25 | 51–64 × 19–32 | A4 | High (Printful) |
| Sublimation/leatherette hat patch | 3.5 × 2.5 hex/rect; 2.5 × 4 rounded rect; ~3.5 × 2 printed patch | 89 × 64; 64 × 102; 89 × 51 | A4 | Medium (marketplace listings) |

### Inferences
- The hat disagreement ("2 × 3 vs 3–4 × 2–2.5") resolves in favour of about 4 × 1.75–2.25 in as the default cap-front preset (102 × 44–57 mm). Printful (blog and API), DTF Transfers Now and Fulfill Engine all sit at about 4 in wide and 1.75–2.25 in tall. xTool's 3–4 × 2–2.5 in overlaps at 4 × 2. A "2 × 3" (portrait) hat size has no support in any source here. It may be a 3 × 2 swap, which would match the smaller hex patch blank.
- A sensible preset set is: cap front 4 × 2 in, trucker front 5 × 2 in, cap back 3 × 1 in, beanie 5 × 1.75 in, patch 3.5 × 2.5 in. Many of these fit on one A4 sheet.

### Gaps
- I found no Stahls' or Heat Transfer Warehouse hat chart. Heat Transfer Warehouse's site shows "has closed" (fetched 2026-10-27), and the Stahls searches returned only unrelated cap head-size charts.
- Printful's exact `front_dtf_hat` print-file dimensions are not in the public API (the mockup-generator/printfiles endpoint needs OAuth).
- I found no dedicated beanie cuff sublimation-patch size. The 5 × 1.75 in figure is the Printful embroidery front area.

## 2. Hoodie hood side, crop top front, tank top front/back

### Takeaway
Tank top fronts are 9–10 × 12–14 in for a full front (A3) or 6.5–8.5 in wide for a center chest. For tank backs, use the t-shirt back with a narrower width; one source gives 11 × 16 in. I found no citable source for hood-side print size or crop-top front size.

### Cited Findings
- xTool (Dec 30, 2025): tank top full front 9.0–10.0 in W × 12.0–14.0 in H; "try using narrow prints to avoid awkward placement near the armhole curvature". — [xTool DTF transfer size chart](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart)
- Kingdom DTF (July 15, 2025): tank tops (adult/youth) 6.5–8.5 in wide, center chest, "narrower cut, avoid underarm area". — [Kingdom DTF sizing guide](https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more)
- DTF Transfers Now has a "Polos, Tank Tops & Sweatpants" section that includes an 11 × 16 in full back and an 11 × 14 in panel. The page's columns did not survive text extraction, so I cannot reliably tie the 11 × 14 / 11 × 16 values to the tank top. — [DTF Transfers Now size guide](https://dtftransfersnow.com/dtf-size-and-print-guide)
- Hoodie context: Kingdom DTF gives pullover hoodie front 10–11.5 in wide ("avoid pocket area") and zip-up front 3.5–4 in per side. xTool gives an oversize hoodie front chest of 9–10 × 4–5 in, above the pocket. Fulfill Engine's hoodie front max is 12 × 10 in. — [Kingdom DTF](https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more); [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart); [Fulfill Engine](https://help.fulfillengine.com/en/white-label-store/max-decoration-sizing)
- Printful's catalog includes a `hood` print placement on the cut-and-sew AOP Women's Cropped Windbreaker (product 619), and DTF front/back placements on the AS Colour 4062 crop top (636) and the Bella+Canvas 6882GD cropped tee (1579). The public API does not give their dimensions. — [Printful API product list](https://api.printful.com/products)

### Size table
| Item | Recommended size (in) | mm | Fit | Confidence |
|---|---|---|---|---|
| Tank top full front | 9–10 × 12–14 | 229–254 × 305–356 | A3 | Medium (xTool) |
| Tank top center chest | 6.5–8.5 wide | 165–216 wide | A4 (≤8.27 in wide) or A3 | Medium (Kingdom DTF) |
| Tank top back | ~11 × 14–16 (from the polo/tank section; mapping uncertain) | 279 × 356–406 | A3 | Low |
| Crop top front | No source | n/a | n/a | n/a |
| Hood side | No source | n/a | n/a | n/a |

### Inferences
- For a crop top preset, a reasonable proxy is the women's/ladies front with height capped: about 10 × 8–10 in (254 × 203–254 mm, A3), because the body is shorter. Fulfill Engine's ladies front max is 10 × 12 in. This is my inference, not a sourced crop-top spec.
- Hood-side text or logos are usually treated like a sleeve or side-chest graphic, roughly 3–4 in. This is also unsourced and should be labelled as a guess if it is shipped.

### Gaps
- I found no Printful, Printify, Stahls or vendor chart that states a hood-side DTF size or a crop-top front size.

## 3. Totes, aprons, bibs, onesies, socks, masks, bandanas, shoes, blankets, pillowcases, koozies, mouse pads, lanyards

### Takeaway
Small accessories fit on A4: koozie, mouse pad, face mask and onesie front. Totes, baby bibs and socks need A3. Lanyards, bandanas, pet bandanas, blankets, sublimation aprons and shoe templates need a roll. Several specific blanks the brief asked about (13 × 13 in sublimation tote, 20 × 30 in pillowcase, 22 × 22 in bandana, crew-sock DTF) have no citable print-area figure.

### Cited Findings
**Totes**
- Fulfill Engine maximum DTG/DTF/transfer size for a tote bag is 12 × 13.5 in. — [Fulfill Engine](https://help.fulfillengine.com/en/white-label-store/max-decoration-sizing)
- xTool: canvas tote/backpack 9 × 9 in, "use 9 × 9 as a safe square maximum". — [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart)
- MyDesigns catalog, Q-TEES tote (15 × 16 in, DTG, SwiftPOD): front and back print file 3000 × 3600 px (5:6). — [MyDesigns QTEES tote](https://mydesigns.io/product-catalog/Tote%20Bags/product/QTEES_TOTE_BAG)
- Printful tote blanks (bag size, not print area): AS Colour 1001 16.5 × 16.5 in; Econscious EC8000 16 × 14.5 × 5 in; Mantis M196 19.6 × 18.1 in; AOP tote 15 × 15 in with a 17 × 33 in print file area (cut-and-sew, front and back as one panel). — [Printful API 641](https://api.printful.com/products/641), [367](https://api.printful.com/products/367), [528](https://api.printful.com/products/528), [84](https://api.printful.com/products/84)
- Non-US references: Stuart Morris gives a 30 × 32 cm max print on a 38 × 42 cm canvas tote, and Brand Your gives 290 × 290 mm. — [Stuart Morris](https://stuartmorris.co.uk/retail/shopping-bags/); [Brand Your](https://brandyour.co/products/tote-bags)

**Aprons**
- Printful sublimation All-Over Print Apron is 27.6 × 30.3 in (70 × 77 cm) and the 5-Color Strap Apron is 31.5 × 25.6 in (80 × 65 cm). These are product sizes with full-coverage sublimation. — [Printful API 894](https://api.printful.com/products/894), [927](https://api.printful.com/products/927)
- Printful DTF Port Authority A900 bib apron is 13 in W × 32 in L (product), with a `front_dtf` placement. The Liberty Bags 5502 embroidered apron is 20 × 30 in. — [Printful API 1712](https://api.printful.com/products/1712), [297](https://api.printful.com/products/297)

**Baby bibs**
- ProWorld polyester bib: sublimation blank 8.75 × 14 in; mirror the image. — [ProWorld SB-S-050](https://www.proworldinc.com/sb-s-050-pnk-baby-bib-pink.html)
- Titanjet fabric bib print size 225 × 365 mm. Signdepot bib printable size 23 × 19 cm. Velour bib imprint 10 × 13 in. — [Titanjet](https://titanjet.co.za/fabric-baby-bib/); [Signdepot](https://transfer.signdepot.eu/en/Sublimation-baby-bib); [Promotional Product Inc](https://www.promotionalproductinc.com/silk-touch-velour-baby-bib)

**Onesie / bodysuit (NB–24M)**
- xTool: infant/baby (0–24M) full front 4.0–5.0 × 4.0–5.0 in; toddler (2T–4T) 6–7 × 6–8 in. — [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart)
- Kingdom DTF: onesies 4–5 in wide, upper chest, "keep height short to stay above diaper seam"; infant 0–24M 4–5 in. — [Kingdom DTF](https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more)
- MyDesigns, Rabbit Skins 4400 bodysuit (sizes NB–24M by provider): Printify Choice front 1742 × 1984 px, back 1489 × 1693 px. Printful, Printed Mint and SwiftPOD front are 2100 × 2400 px. DPI is not stated. — [MyDesigns Rabbit Skins 4400](https://mydesigns.io/product-catalog/baby-bodysuits/product/rabbit-skins-4400)

**Socks**
- Printify Sublimation Crew Socks (blueprint 1433): one size 15.5 × 3.3 in (39.4 × 8.4 cm), as shown in the search snippet. The page body is client-rendered and could not be fetched. — [Printify sublimation crew socks](https://printify.com/app/products/1433/generic-brand/sublimation-crew-socks)
- JP Plus dark sublimation crew sock: 11 in leg, 17.25 in total length including ankle. — [JP Plus](https://www.jpplus.com/catalog/product/view/id/5231/s/11-length-dark-crew-sock)
- A straight crew sock jig measures about 17.83 × 3.35 in (45.3 × 8.5 cm). — [WoodArtSupply sock jig](https://woodartsupply.com/products/2-pieces-sock-jig-straight-style-sock-jig-sublimation-crew-sock-jig-heat-press-dye-sublimation-jigs-mdf-wood-athletic-sock-jig-for-printing-diy-pattern-socks-accessory-17-83-x-3-35-inches)
- A hobbyist notes that the largest size their desktop printer can print is 8.5 × 14 in, so long tube socks may need tiled prints. — [The Country Chic Cottage](https://www.thecountrychiccottage.net/sublimation-socks/)
- Printful sublimation socks (882) use four placements: front-right, front-left, back-right and back-left leg. Dimensions are not public. — [Printful API 882](https://api.printful.com/products/882)

**Face masks, bandanas, pet bandanas**
- Sublimation face mask blank (large): about 7.5 × 5.1 in (19 × 13 cm), with an AI template. — [AA Print Supply EcoFreen mask](https://aaprintsupplyco.com/collections/face-mask/products/ecofreen-antimicrobial-face-mask-sublimation-blank)
- Printify pet bandana: 20 × 9.75 in (50.8 × 24.8 cm) and 27 × 13 in (68.6 × 33.0 cm), ±1 in, from a search snippet. Promotional triangle pet bandana: 21.25 × 10 in, "follow the template for safe and bleed areas". — [Printify pet bandana](https://printify.com/app/products/562/evergreen/pet-bandana); [Promotional Product Inc](https://www.promotionalproductinc.com/full-color-triangle-rpet-pet-bandana)
- Printful Pet Bandana Collar comes in sizes S–XL by collar circumference (S 10–16.75 in … XL 15.5–23.5 in), ±1 in. No print-area figure is given. — [Printful API 902](https://api.printful.com/products/902)
- Adult bandana: SanMar spec sheet (2020): flat 21.5 × 21.5 in, decoration area 20.5 × 20.5 in. This is from a search snippet; I did not read the PDF, and it is older than the 2022–2026 window. — [SanMar decoration spec sheet](https://www.education.sanmar.com/wp-content/uploads/2020/05/decoration_specsheet_C960.pdf)

**Canvas shoes**
- Merchize high-top canvas shoe template: 6000 × 6000 px, JPEG/PNG at a minimum of 150 DPI, with a "Safe Print Area" guide. — [Merchize high-top canvas shoes](https://catalog.merchize.com/product/high-top-canvas-shoes-(made-in-china))
- Printful canvas shoes use per-panel placements: `shoe_quarters_left/right` and `shoe_tongue_left/right` on high-top (513/525) and lace-up (578/579); `shoe_left/right` on slip-on (574/575). Dimensions are not public. — [Printful API product list](https://api.printful.com/products)

**Blankets**
- GearLaunch (updated May 2026): 50 × 60 in blanket front 49.5 × 60 in, bleed 2.25 in left/right and 2.5 in top/bottom, art canvas 54 × 65 in. 60 × 80 in blanket front 57.5 × 77.5 in, canvas 63.74 × 84.66 in. — [GearLaunch blanket design](https://www.gearlaunch.com/academy/blanket-design)
- Printed Mint 50 × 60 in fleece blanket: template 7950 × 9450 px at 150 PPI, which is 53 × 63 in. — [Printed Mint product 407](https://printedmint.com/shop/product/407)
- Printful sublimation throw blanket and summer blanket sizes: 30 × 40, 50 × 60 and 60 × 80 in. Sherpa: 37 × 57, 50 × 60 and 60 × 80 in. — [Printful API 395](https://api.printful.com/products/395), [1426](https://api.printful.com/products/1426), [711](https://api.printful.com/products/711)

**Pillowcases**
- Printful pillow/pillow-case sizes: 14 × 14, 16 × 16, 18 × 18, 20 × 12 and 22 × 22 in. A 20 × 30 in standard pillowcase is not offered. — [Printful API 89](https://api.printful.com/products/89), [1583](https://api.printful.com/products/1583)
- Merchize lists a 20 × 30 in bedding pillowcase with all-over print but gives no print dimensions in the snippet. — [Merchize bedding pillow case](https://merchize.com/product/bedding-pillow-case/)

**Koozies, mouse pads, lanyards**
- Printful sublimation Can Cooler: regular 5 × 4 in (12 × 10 cm), slim 6.5 × 3.2 in (17 × 8 cm), 12 oz, with separate front and back prints. — [Printful API 764](https://api.printful.com/products/764)
- Innosub neoprene 12 oz can cooler blank: 4.72 × 3.74 in; press at 360°F for 45–60 s. — [Sewingmachine.com (Innosub)](https://sewingmachine.com/products/sublimation-printing-neoprene-12-oz-can-cooler-blanks-diy-printing-by-innosub-usa)
- Printful mouse pads: standard 8.7 × 7.1 in (220 × 180 mm); round 8 in diameter (20.3 cm); gaming 36 × 18 in and 18 × 16 in. — [Printful API 518](https://api.printful.com/products/518), [1399](https://api.printful.com/products/1399), [583](https://api.printful.com/products/583)
- Lanyard: 3/4 in × 36 in is the common format, with maximum logo 0.75 × 36 in. Some 3/4 in products are 16, 32 or 35 in long. — [Quality Logo Products](https://www.qualitylogoproducts.com/badge-holders/sublimation-lanyard-34.htm); [Rush Order Tees](https://www.rushordertees.com/catalog/pcna/full-color-3-4-premium-lanyard-w-hook); [UCHANGE Promo](https://uchangepromo.com/products/34-hd-sublimation-lanyard)

### Size table
| Item | Recommended print/design size (in) | mm | Fit | Confidence |
|---|---|---|---|---|
| Tote, 15 × 16 canvas | 10–12 × 12–13.5 (safe 9 × 9) | 254–305 × 305–343 (229 × 229) | A3 for ≤11.69 in wide; 12 × 13.5 → roll | Medium (Fulfill Engine max, xTool safe) |
| Tote, 13 × 13 sublimation | No source; proxy ≈ full face minus seams | n/a | likely A3 | Gap |
| Adult bib apron (DTF chest) | No print-area source; product 13 × 32 in (A900) | n/a | n/a | Gap |
| Sublimation AOP apron | full panel 27.6 × 30.3 | 701 × 770 | Roll | High (Printful product size) |
| Baby bib | 8.75 × 14 (ProWorld); 225 × 365 mm (Titanjet); 23 × 19 cm (Signdepot) | 222 × 356 / 225 × 365 / 230 × 190 | A3 | Medium (vendors disagree) |
| Onesie front NB–24M | 4–5 × 4–5 | 102–127 × 102–127 | A4 | Medium-High (two DTF vendors agree) |
| Crew sock (sublimation, per side) | 15.5 × 3.3 (Printify); jig 17.83 × 3.35 | 394 × 84; 453 × 85 | A3 (15.5 in); roll for the 17.8 in jig | Medium |
| Face mask | 7.5 × 5.1 | 191 × 130 | A4 | Low-Medium (single blank vendor) |
| Adult bandana 22 × 22 | ~20.5 × 20.5 decoration (on a 21.5 in blank) | 521 × 521 | Roll | Low (2020 snippet) |
| Pet bandana | 20 × 9.75 / 27 × 13 / 21.25 × 10 | 508 × 248 / 686 × 330 / 540 × 254 | Roll | Medium |
| Canvas shoe | 6000 × 6000 px template at ≥150 DPI (≈40 × 40 in canvas if exactly 150 DPI) | — | Roll | Low |
| Blanket 30 × 40 | No bleed spec; product 30 × 40 | 762 × 1016 | Roll | Gap for bleed |
| Blanket 50 × 60 | canvas 54 × 65 (GearLaunch) or 53 × 63 (Printed Mint) | 1372 × 1651 / 1346 × 1600 | Roll | High (two vendors, consistent) |
| Pillowcase 20 × 30 | No print-area source | n/a | Roll (by size) | Gap |
| Koozie (12 oz neoprene) | front ≈ 5 × 4 (regular) / 6.5 × 3.2 (slim) / 4.72 × 3.74 | 127 × 102 / 165 × 81 / 120 × 95 | A4 | Medium-High |
| Mouse pad | 8.7 × 7.1; round 8 dia; gaming 18 × 16, 36 × 18 | 220 × 180; 203; 457 × 406; 914 × 457 | A4 (rotated); gaming → roll | High (Printful product sizes) |
| Lanyard | 0.75 × 36 | 19 × 914 | Roll | High (multiple vendors agree) |

### Inferences
- The MyDesigns pixel sizes match plausible print areas only at 300 DPI: tote 3000 × 3600 px works out to 10 × 12 in, and bodysuit 2100 × 2400 px to 7 × 8 in. This is an inference, because MyDesigns does not state the DPI. The 7 × 8 in bodysuit figure is the provider's maximum area, so it is larger than the 4–5 in recommended design size from the DTF vendors.
- A 30 × 40 in blanket file would be about 4500 × 6000 px at 150 PPI before bleed. I calculated this; no vendor template was found.
- Koozie figures are product face sizes. The usable printed area per side is probably slightly smaller because of the seam and bottom.

### Gaps
- No 2022–2026 source was found for: 13 × 13 in sublimation tote print area, 20 × 30 in pillowcase print area, DTF bib-apron chest area, 22 × 22 in bandana (only a 2020 SanMar snippet for a 21.5 in blank), or exact shoe panel dimensions.
- Printful and Printify per-placement print-file pixel sizes are behind authentication (Printful mockup-generator API) or client-side rendering (Printify app pages). The Printify figures above come from search snippets only.

## 4. Resolving the sleeve and hat DTF disagreements

### Takeaway
For a short-sleeve DTF print, 3–3.5 in wide × 2–3.5 in tall (76–89 × 51–89 mm, A4) is supported by four sources. Ninja's 2.5 × 1 in (in the earlier pass) is an outlier and suits sleeve text only. For long sleeves, use about 2–3.5 in wide × 14–18 in tall, which needs A3 or a roll. The hat resolution is in section 1: about 4 × 1.75–2.25 in.

### Cited Findings
- xTool (Dec 30, 2025): short sleeve 3.0–4.0 in W × 2.0–3.5 in H, "often placed one or two inches above the hem". Long sleeve (linear) is 2.0 in W × 14.0–18.0 in H. — [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart)
- DTF Transfers Now: t-shirt short sleeve 3.5 × 3.5 in; wrist 2 × 2 in. Hoodie sleeve 3.5 × 15 in; hoodie wrist 2.5 × 2.5 in. — [DTF Transfers Now](https://dtftransfersnow.com/dtf-size-and-print-guide)
- Fulfill Engine maximums: short sleeve 3.5 × 3.5 in, long sleeve 3.5 × 14 in (DTG/DTF/screen/transfer). The embroidery sleeve max is 3.5 × 1 in. — [Fulfill Engine](https://help.fulfillengine.com/en/white-label-store/max-decoration-sizing)
- Kingdom DTF (July 2025): long-sleeve sleeve design 2.5–3.5 in wide, "sleeve designs run vertically"; youth sleeves 2–3 in wide. — [Kingdom DTF](https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more)

### Size table
| Placement | Recommended (in) | mm | Fit | Confidence |
|---|---|---|---|---|
| Short sleeve | 3–3.5 × 2–3.5 (max 3.5 × 3.5) | 76–89 × 51–89 | A4 | High (4 sources agree) |
| Sleeve text strip | ~2.5–3.5 × 1 | 64–89 × 25 | A4 | Medium (Ninja per earlier pass; Fulfill Engine embroidery max 3.5 × 1) |
| Long sleeve (vertical) | 2–3.5 × 14–18 | 51–89 × 356–457 | A3 up to 16.5 in tall; roll above | Medium-High |
| Wrist / cuff | 2–2.5 × 2–2.5 | 51–64 × 51–64 | A4 | Medium |
| Youth sleeve | 2–3 wide | 51–76 wide | A4 | Medium |

### Inferences
- The two sleeve figures describe different designs rather than a true conflict. Ninja's 2.5 × 1 in matches a one-line text strip, which is close to Fulfill Engine's 3.5 × 1 in embroidery sleeve. xTool's 3–4 × 2–3.5 in and the 3.5 × 3.5 in maximums from DTF Transfers Now and Fulfill Engine describe a logo or graphic. A catalogue could offer both presets: "Sleeve logo 3.5 × 3.5 in" and "Sleeve text 3 × 1 in".

### Gaps
- No Stahls', Heat Transfer Warehouse (closed), Bella+Canvas or Gildan sleeve or hat print guide was retrievable. I did not re-verify the Ninja Transfers 2.5 × 1 in figure in this pass.
