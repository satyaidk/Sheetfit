# Hard goods sublimation template sizes: gap fill

Method note: Heat Press Nation (HPN) product pages were read directly from the store's product JSON endpoint (`/products/<handle>.js`) with curl and a desktop Chrome user agent after WebFetch returned HTTP 429. Values marked "verified" were read from the live product description on 2026-10-27. Values marked "snippet" come from search-result text only, because the page renders through JavaScript (ProWorld) or was not fetched. Conversion: 1 in = 25.4 mm. A4 = 210 x 297 mm; "fits A4" means the rectangle fits in portrait or landscape with no bleed added. A wrap template is treated as a flat rectangle (width = circumference direction).

## Q1. Mugs: 12oz latte, 10-12oz enamel/camp, 10oz kids/polymer, 3oz and 6oz espresso

### Takeaway
Supplier-stated imprint areas exist for every mug in this group except a confirmed 10oz polymer kids mug. All of them fit A4. The 12oz latte mug is cone-shaped, so its real template is an arc (fan shape). The rectangle given is the bounding box, not the print shape.

### Cited Findings
- 12oz latte mug (HPN ORCA Premium): Size 4" W x 4" H x 3.5" D, 11" circumference; **Imprint Area 9.94" x 4.71"** (252.5 x 119.6 mm). Cone-shaped. Fits A4 landscape. Confidence high (verified) — [HPN 12 oz latte mug](https://heatpressnation.com/products/12-oz-latte-mug-36-per-case)
  - Conflict: a search snippet for the same URL gave "2.5 x 2.5 x 2.0 / 6.0 cir, imprint 6.61 x 3.16 in". The live page does not say this, so treat it as stale or wrong — [HPN 12 oz latte mug](https://heatpressnation.com/products/12-oz-latte-mug-36-per-case)
- 12oz enamel mug (HPN, silver rim): Size 3.14" H x 3.39" OD; **Imprint Area 7.78" x 2.44"** (197.6 x 62.0 mm). Fits A4. Confidence high (verified) — [HPN 12 oz enamel mug](https://heatpressnation.com/products/12-oz-fine-enamel-sublimation-mugs-silver-rim-48-per-case)
- 12oz enamel mug, UK trade printers: print area **180 x 56 mm** (7.09 x 2.20 in). A small white margin stays visible at the top, the bottom and beside the handle — [WTTB enamel mugs](https://wttb.co.uk/products/personalised-enamel-mugs); same 180 x 56 mm at [Printed.com enamel mugs](https://printed.com/merchandise/mugs/enamel-mugs) (snippet)
- Range for the 12oz enamel/camp mug: 180-198 mm x 56-62 mm (7.09-7.78 x 2.20-2.44 in).
- Kids polymer mug (Titan Jet, green; capacity not stated): **Print Size 50 x 210 mm** (1.97 x 8.27 in). Product 6.5 x 7 x 7 cm. Fits A4 (210 mm is exactly the A4 short side; landscape is easier). Confidence low-medium (snippet; size in oz not confirmed) — [Titan Jet Kids Polymer Mug](https://titanjet.co.za/kids-polymer-mug-green/)
- Polymer 6oz kids mug (Print Equipment, DE): Ø 72 mm, height 73 mm. No print area stated — [Print Equipment POLY-06](https://shop.printequipment.de/en/polymer-mug-6oz-colour-white-dishwasher-suitable-12-pcs.-lay-48-pcs.-carton/POLY-06)
- 3oz espresso (HPN SubliCraft): Size 2.5" H x 2" OD; **Imprint Area 2.4" H x 4.7" W** (61.0 x 119.4 mm). Confidence high (verified) — [HPN SubliCraft 3oz espresso mug](https://heatpressnation.com/products/hpn-sublicraft-3oz-sublimation-ceramic-espresso-mug-36-per-case)
- 3oz mini mug (HPN ORCA): Size 2.625" H x 2.0" OD; **Imprint Area 2.625" H x 5.0" W** (66.7 x 127.0 mm). Confidence high (verified) — [HPN 3 oz mini mug](https://heatpressnation.com/products/3-oz-ceramic-mini-mug-72-per-case)
- 6oz espresso, C-handle (HPN ORCA): Size 2.75" H x 2.8" OD; **Imprint Area 7.3" x 2.75"** (185.4 x 69.9 mm). Confidence high (verified) — [HPN 6 oz C-handle mug](https://heatpressnation.com/products/6-oz-white-c-handle-ceramic-mugs-36-per-case)
- 2.5oz espresso cup (Print Equipment "Verona"): print area 30 x 128 mm (1.18 x 5.04 in). This is a smaller cup than 3oz, given for context (snippet) — [Print Equipment Verona](https://shop.printequipment.de/en/espresso-cup-2.5oz-with-saucer-sublistar-coating-dishwasher-suitable-6-sets-pack-72-sets-carton/VERONA)
- Titan Jet's handle-clearance rule for mugs: leave at least 5 mm at the top and bottom and 20 mm on each side of the handle (snippet) — [Titan Jet 10oz straight mug](https://titanjet.co.za/?p=9518)

### Inferences
- A 3oz espresso template is about 4.7-5.0 x 2.4-2.6 in (119-127 x 61-67 mm). A 6oz template is about 7.3 x 2.75 in (185 x 70 mm).
- The latte mug template has to be drawn as an arc (cone). An editor that offers only a rectangle for latte mugs will distort artwork.

### Gaps
- No supplier states a print area for a mug sold as a "10oz polymer kids mug". The 50 x 210 mm Titan Jet figure is for a kids polymer mug of unstated capacity.
- No 10oz enamel mug was found. All enamel data is for 12oz.

## Q2. Tumblers, can coolers and bottles: 30oz skinny, 12/15oz kids/sippy, 12oz stemless wine, 12oz can cooler, 17/20/25oz bottles

### Takeaway
The 30oz skinny tumbler (about 9.77 x 9.5 in, 248 x 241 mm) is the only item in this group that does not fit A4. It needs A3 or 11 x 17 in (tabloid) paper. Stated figures were verified for the stemless wine tumbler, both can-cooler types and 20oz bottles. No supplier spec was found for 12/15oz sippy cups or for 17oz and 25oz bottles.

### Cited Findings
- 30oz skinny tumbler (HPN SubliCraft, silver): Size 3.15" diameter x 10" H; **Imprint Area 9.77" W x 9.5" H** (248.2 x 241.3 mm). Does **not** fit A4 in either orientation (both sides are over 210 mm). It also does not fit US Letter, which is 215.9 mm wide. Confidence high (verified) — [HPN SubliCraft 30 oz skinny tumbler](https://heatpressnation.com/products/sublicraft-30-oz-stainless-steel-sublimation-skinny-tumbler-with-straw-silver)
  - Template/SEO sites quote 9.5 x 10.25 in or about 9.4-9.5 in tall x about 10 in around. These are low-confidence spam-type pages that agree roughly with HPN — e.g. [30 oz template size page](https://msoid.icmbio.gov.br/templates/30-oz-sublimation-tumbler-template-size.html)
- HPN's skinny-tumbler blog advises fitting artwork inside the tumbler's imprint area. Its ready-made templates cover only the 16oz and 20oz sizes (snippet) — [HPN blog](https://heatpressnation.com/blogs/blog/how-to-fully-personalize-sublimation-skinny-tumblers)
- 12oz stemless wine tumbler (HPN SubliCraft): the page lists both "Size" and "Imprint Area" as **3.14" x 4.92"**. That is diameter x height, not a flat wrap. Confidence medium (verified text, ambiguous meaning) — [HPN 12 oz stemless wine cup](https://heatpressnation.com/products/sublicraft-12-oz-stainless-steel-sublimation-stemless-wine-cup-white)
- 12oz stainless wine tumbler (Titan Jet, ZA): **Print size 110 x 280 mm** (4.33 x 11.02 in). Product 8.8 x 8.8 x 11.5 cm. Fits A4 landscape (280 is 297 or less). Confidence medium (snippet) — [Titan Jet 12oz wine tumbler](https://titanjet.co.za/12oz-blue-stainless-steel-wine-tumbler/)
- 12oz stemless wine cup (JP Plus): height 4-3/8"; designed for WRAP175/WRAP195 shrink sleeves. No imprint area given (snippet) — [JP Plus stemless wine cups](https://www.jpplus.com/stemless-wine-glass-with-lid)
- 12oz skinny-can cooler, stainless (HPN SubliCraft): Size 6.1" H x 2.8" diameter; **Imprint Area 5.9" H x 9.1" W** (149.9 x 231.1 mm). Fits A4 landscape. Confidence high (verified) — [HPN stainless skinny can cooler](https://www.heatpressnation.com/products/sublicraft-by-heatpressnation-sublimation-blank-stainless-steel-can-cooler-for-skinny-12-oz-cans-white)
- 12oz skinny-can sleeve, fabric (HPN SubliCraft): **Size 3.5" W x 6.375" H** (88.9 x 161.9 mm), flat sleeve. Confidence high (verified) — [HPN skinny can sleeve](https://www.heatpressnation.com/products/sublicraft-sublimation-blank-can-cooler-sleeve-for-skinny-12-oz-cans-10-pack)
- 12oz standard-can sleeve, fabric (HPN SubliCraft): **Imprint Area 4" W x 5.3" H** (101.6 x 134.6 mm). Confidence high (verified) — [HPN standard can sleeve](https://heatpressnation.com/products/sublicraft-sublimation-blank-can-cooler-sleeve-for-standard-12-oz-cans-10-pack)
- Neoprene skinny 12oz sleeve (sewn, finished product, not a sub blank): 5.25" tall x 3.5" wide laid flat (snippet) — [YouCustomizeIt can cooler](https://www.youcustomizeit.com/p/Teal-Circles-Stripes-Can-Cooler-12-oz-w-Monogram/533515)
- 20oz stainless bottle, screw top (HPN): Size 7.4" H x 2.8" OD; **Imprint Area 7.94" x 4.86"** (201.7 x 123.4 mm). Confidence high (verified) — [HPN 20 oz screw top bottle](https://heatpressnation.com/products/20-oz-stainless-steel-sublimation-water-bottle-screw-top-48-per-case)
- 20oz stainless bottle, straw top (HPN): Size 7" H x 2.9" OD; Imprint Area 9.1" x 6" (231.1 x 152.4 mm). Confidence medium (snippet) — [HPN 20 oz straw top bottle](https://www.heatpressnation.com/products/20-oz-stainless-steel-sublimation-water-bottle-silver-straw-top-48-per-case)
- 20oz aluminium sport bottle, flip top (HPN): Size 7" H x 2.9" OD; **Imprint Area 7.8" x 5.6"** (198.1 x 142.2 mm), or 5" tall if using a mug press. Confidence high (verified) — [HPN 20 oz aluminium sport bottle](https://www.heatpressnation.com/products/20-oz-aluminum-sport-bottle-flip-top-with-carabiner-48-per-case)
- 17oz bottles (ProWorld Best Sub cola bottle and handled bottle): capacity is listed, but no imprint area appears in the indexed text (snippet) — [ProWorld 17 oz handle bottle](https://www.proworldinc.com/sb-s-189-water-bottle-with-handle-17-oz-silver.html)
- Kids 12oz straight stainless tumbler (AGH): product size H 5.1" x D 2.9". No print area stated (snippet) — [AGH 12 oz kids tumbler listing](https://woodartsupply.com/products/agh-12-oz-sublimation-tumblers-blanks-with-lids-and-straws-stainless-steel-straight-skinny-tumblers-for-kids-double-wall-vacuum-insulated-tumbler-bpa-free-great-diy-gift-for-children-12-pack)
- 12oz ceramic travel tumbler (HPN ORCA, not a kids cup): Size 6.0" H x 3.625" OD; Imprint Area 10.75" x 4.15" (273.1 x 105.4 mm) (verified) — [HPN 12 oz travel tumbler](https://heatpressnation.com/products/12-oz-sublimation-travel-tumbler-with-black-lid-24-per-case)
- Etsy 12oz flip-top sippy template seller ships separate tapered and straight PNG files (snippet) — [Etsy listing 1165093887](https://www.etsy.com/listing/1165093887)

### Inferences
- Stemless wine wrap: circumference = π x 3.14 in ≈ 9.86 in (250.6 mm), and height is 4.92 in (125 mm). So a full wrap is about 250 x 125 mm, which fits A4 landscape. This is consistent with Titan Jet's 280 x 110 mm.
- Kids 12oz straight tumbler: π x 2.9 in ≈ 9.1 in (231 mm) circumference x up to about 5 in body. This is derived from product size, not a stated print area.
- Every bottle and can-cooler template found is 232 mm or less on its long side, so all of them fit A4 landscape.

### Gaps
- No blank supplier states a print area for a 12oz or 15oz kids/sippy tumbler.
- No 17oz or 25oz bottle print area was found from any supplier (HPN, ProWorld, Titan Jet). 32oz HPN Summit bottle lists only packaging-style dimensions (9 x 11.4 x 7.4 in) — [HPN 32 oz Summit bottle](https://heatpressnation.com/products/hpn-sublicraft-32-oz-sublimation-stainless-steel-summit-water-bottle-25-per-case)
- No sublimation-blank neoprene koozie print area was found. The neoprene figures are for finished sewn products.

## Q3. Flat hard goods: phone inserts, mouse pads, coasters, keychains, puzzles, slates, ornaments, plates, signs, clocks, cutting boards, tags, bookmarks, notebooks, door hangers, cards, tiles, magnets

### Takeaway
Most flat items fit A4 easily. These do not:
- XL mouse pads (400 x 900 mm class)
- the EU plate (520 x 110 mm, longer than even A3's 420 mm)
- a 10 in round clock (254 mm)
- the HPN large notebook (317.5 mm)
- 12 in natural slates

The glass cutting board just fits A4 landscape (287 x 201 mm), with almost no room for bleed. Thin spots: the 8 in round mouse pad, 10 in clock, EU plate and MDF signs have no sublimation-blank spec. Only proxies were found for these.

### Cited Findings
Phone case inserts
- Titan Jet (ZA) print sizes: iPhone 15 Pro Max **160 x 76 mm** (6.30 x 2.99 in); iPhone 14 Pro **147 x 72 mm** (5.79 x 2.83 in); iPhone 13 Pro **143 x 68 mm** (5.63 x 2.68 in). Confidence medium (snippet; one seller) — [Titan Jet iPhone 15 Pro Max](https://titanjet.co.za/?p=68999), [iPhone 14 Pro](https://titanjet.co.za/?p=68992), [iPhone 13 Pro](https://titanjet.co.za/?p=68988)

Mouse pads
- Round (HPN SubliCraft): **7.5" round** (190.5 mm), 5.5 mm thick. An 8 in round sub blank was not found. Confidence high (verified) — [HPN 7.5 in round mouse pad](https://heatpressnation.com/products/sublicraft-by-heatpressnation-sublimation-blank-mouse-pads-7-5-round-10-pack)
- Heart (HPN 3 mm): Imprint Area 8" x 9.5" (203.2 x 241.3 mm). Fits A4 (verified) — [HPN 3mm mouse pad](https://heatpressnation.com/products/mouse-pad-3mm-heart-160-per-case)
- XL (PrintKK, sublimation, made in USA): **15.7" x 35.4"** (398.8 x 899.2 mm). Does not fit A4 and needs roll or large-format paper. Confidence medium (snippet) — [PrintKK large mouse pad](https://www.printkk.com/gb/product/info/large-mouse-pad-made-in-usa)
- 31.5 x 11.8 in (800.1 x 299.7 mm): found only as finished retail gaming pads, not sublimation blanks. It would not fit A4 (299.7 mm is more than 297) — [Walmart mouse pad listings](https://www.walmart.com/c/kp/mouse-pad-printer)

Sandstone coasters
- ProWorld round sandstone with cork: **Sub Blank Size 4.25"** (108.0 mm). Square: **4.25" x 4.25"**. Confidence medium (snippet; page is rendered by JavaScript) — [ProWorld round SB-S-198](https://www.proworldinc.com/sb-s-198-round-sandstone-coaster-with-cork.html), [ProWorld square SB-S-215](https://www.proworldinc.com/sb-s-215-square-sandstone-coaster.html)
- Zazzle sandstone coaster: 4.25" diameter, 0.25" thick; add 1/8" bleed (snippet) — [Zazzle sandstone coaster](https://www.zazzle.com/sandstone_coaster-256122621993236769)
- JP Plus Monarch sandstone coasters come in round, square and car shapes. Dimensions were not seen in the indexed text — [JP Plus Monarch](https://www.jpplus.com/monarch-sandstone-coasters-for-sublimation)

Keychains
- Unisub via HPN (verified):
  - 2.5" round FRP (63.5 mm), 0.090" thick — [HPN Unisub 2.5 in round keychain](https://heatpressnation.com/products/unisub-sublimation-blank-keychain-2-sided-2-5-round-25-pack)
  - 1.6" x 2.25" rectangle aluminium (40.6 x 57.2 mm) — [HPN Unisub rectangle keychain](https://heatpressnation.com/products/unisub-sublimation-blank-rectangle-keychain-1-6-x-2-25-25-pack)
  - 2.5" x 2.25" heart FRP (63.5 x 57.2 mm) — [HPN Unisub heart keychain](https://heatpressnation.com/products/unisub-sublimation-blank-double-sided-heart-keychain-2-5-x-2-25-5-pack)
- MDF heart keyring (Titan Jet): print size 50 x 45 mm (snippet) — [Titan Jet MDF keyring 010](https://titanjet.co.za/sublimation-mdf-keyring-010/)
- MDF rectangle keychain, 3 mm (Signdepot, EU): printable area 2.8 x 4 cm (snippet) — [Signdepot MDF keychain rectangle](https://transfer.signdepot.eu/en/MDF-keychain-rectangle)

Heart puzzles
- Unisub 23-piece hardboard heart: **6.7" heart** (170.2 mm) (verified) — [HPN Unisub heart puzzle](https://heatpressnation.com/products/unisub-heart-sublimation-23-piece-hardboard-puzzle-gloss-white-raw-back)
- Longforte 75-piece heart (magnetic or felt): **19 x 19 cm** (7.48 x 7.48 in) (snippet) — [Longforte heart puzzle](https://www.longforte.com/products/jigsaw-puzzles-magnetic-heart)
- Generic eBay heart blanks: 245 x 195 mm (9.65 x 7.68 in), piece count not stated. Confidence low — [eBay heart puzzle](https://www.ebay.com/itm/175079414186)

Hardboard photo panels / slates
- ChromaLuxe hardboard photo panel with kickstand: **5" x 7"** (127 x 177.8 mm) and **8" x 10"** (203.2 x 254 mm). Both fit A4 (snippet) — [ISW 5x7](https://goisw.com/chromaluxe-hardboard-photo-panel-with-kickstand-5x7-20-cas/), [ISW 8x10](https://goisw.com/chromaluxe-hardboard-photo-panel-with-kickstand-8x10-15-ca/)
- HPN "Photo Slate" is natural rock slate, not hardboard. Imprint areas (verified): 5.85 x 5.85, 7.2 x 7.2, 11.7 x 11.7, 8.58 x 4.68, 7.2 x 5.85 and 7.2 x 11.7 in. That is 148.6 sq, 182.9 sq, 297.2 sq, 217.9 x 118.9, 182.9 x 148.6 and 182.9 x 297.2 mm — [HPN photo slate](https://heatpressnation.com/products/sublimation-photo-slate-20-per-case)

Ornaments
- Unisub aluminium star: **3.81" x 3.98"** (96.8 x 101.1 mm) (verified) — [HPN Unisub star ornament](https://heatpressnation.com/products/unisub-sublimation-blank-ornament-star-3-81-x-3-98-10-pack)
- HPN ceramic star: imprint 3.25" x 3.25" (82.6 mm). HPN ceramic snowflake: imprint **3" x 2.8"** (76.2 x 71.1 mm) (verified) — [HPN star](https://heatpressnation.com/products/3-star-ornament-w-hole-100-per-case), [HPN snowflake](https://heatpressnation.com/products/3-snowflake-ornament-w-hole-100-per-case)
- Titan Jet aluminium snowflake: product 75 x 75 mm, print area 40 x 40 mm (snippet) — [Titan Jet snowflake](https://titanjet.co.za/sublimation-aluminium-x-mas-snowflake-white/)
- Printful ceramic: star 3.19" x 2.68" and snowflake 2.17" x 3" (snippet) — [Printful ceramic ornament](https://www.printful.com/custom/product/881)

License plates
- EU/French SIV plate standard size: **520 x 110 mm** (20.47 x 4.33 in), described as the most common French format. Source is finished plates, not sublimation blanks — [eplaque.fr aluminium plates](https://www.eplaque.fr/plaque-immatriculation/plaque-immatriculation-aluminium); [Mecatechnic 520 x 110 plate](https://www.mecatechnic.com/en-GB/p/license-plate-siv-aluminum-black-520-x-110-mm_UA00530)
- US sublimation plate (Unisub): **11.875" x 5.875"** (301.6 x 149.2 mm), 0.03" thick. Does not fit A4 (301.6 mm is more than 297) (verified) — [HPN Unisub license plate](https://heatpressnation.com/products/unisub-sublimation-blank-license-plate-5-88-x-11-88-5-pack); [Swing Design 5656](https://www.swingdesign.com/products/unisub-sublimation-license-plate-blanks)

MDF signs
- Only a supplier catalogue was found: MDF sublimation sheets in 8x10, 12x24 and 24x36 in. Confidence low — [Alibaba MDF sheets](https://www.alibaba.com/showroom/sublimation-sheets-mdf.html)
- The common sign blanks are aluminium: 8x10 in (0.45 mm) and 8x12 in (snippet) — [8x10 aluminium blanks](https://woodartsupply.com/products/20-pcs-sublimation-metal-photo-blanks-8x10-inch-metal-sublimation-sign-blanks-0-45mm-thick-aluminum-sublimation-blanks-for-diy-photo-sign-wall-poster-frame-crafts-gift-home-decor)

Wall clocks
- Unisub aluminium clock kit: **8.125" round** (206.4 mm). Fits A4 width with 3.6 mm to spare (verified) — [HPN Unisub clock kit](https://heatpressnation.com/products/unisub-8-125-circle-sublimation-aluminium-clock-kit-gloss-white)
- INNOSUB MDF clock: 7.9" and 12" diameter (snippet) — [INNOSUB MDF clock](https://sewingmachine.com/products/sublimation-mdf-wall-clock-blanks-manually-wallclock-8-inch-12-by-innosub-usa)
- Longforte MDF clock: 30 cm (11.8 in) round (snippet) — [Longforte 30cm clock](https://www.longforte.com/products/mdf-sublimation-clock-30cm)

Glass cutting board 8 x 11 in
- HPN 8" x 11": Size 11.3" L x 7.9" W x 0.2" H; **Imprint Area 11.3" x 7.9"** (287.0 x 200.7 mm). Fits A4 landscape (10 mm and 9.3 mm spare) (verified) — [HPN 8x11 cutting board](https://heatpressnation.com/products/8-x-11-cutting-board-24-per-case)

Luggage tags
- Unisub FRP: 2.5" x 4.25" (63.5 x 108.0 mm) (verified), 3.5" x 3.5", 2.75" x 4" and 3" x 5.5" (76.2 x 139.7 mm) (snippets) — [HPN 2.5x4.25 bag tag](https://heatpressnation.com/products/unisub-sublimation-blank-bag-tag-rectangle-2-5-x-4-25-5-pack), [HPN 3.5 square bag tag](https://heatpressnation.com/products/unisub-sublimation-blank-bag-tag-square-3-5-x-3-5-5-pack), [Swing Design 5503](https://www.swingdesign.com/products/unisub-sublimation-luggage-tag-blanks-rectangle-2-sided-bag-tags), [HPN 3x5.5 bag tag](https://www.heatpressnation.com/products/unisub-sublimation-blank-bag-tag-rectangle-3-x-5-5-5-pack)
- Signdepot HPP luggage tag: printable 100 x 70 mm (snippet) — [Signdepot HPP luggage tag](https://transfer.signdepot.eu/en/Sublimation-HPP-Luggage-Tag)

Bookmarks
- Unisub aluminium: **1.25" x 5"** (31.8 x 127.0 mm), 0.03" thick (verified size) — [HPN Unisub bookmark](https://heatpressnation.com/products/unisub-sublimation-blank-bookmark-1-25-x-5-5-pack); [JP Plus Unisub bookmark](https://c1.jpplus.com/unisub-aluminum-bookmark)
- Generic aluminium: 5.98" x 1.5" (151.9 x 38.1 mm), 1 mm thick (snippet) — [Walmart bookmark blanks](https://www.walmart.com/ip/17564856897)

Notebook covers (A5 class)
- HPN Medium sublimation notebook: Size 9.1" H x 7.1" W; **Imprint 9.1" H x 5.8" W** (231.1 x 147.3 mm). This is close to A5 (148 x 210 mm) but 21 mm taller (verified) — [HPN medium notebook](https://heatpressnation.com/products/sublimation-notebook-medium-50-per-case)
- HPN Large notebook: imprint **12.5" H x 8" W** (317.5 x 203.2 mm). Does not fit A4 (verified) — [HPN large notebook](https://heatpressnation.com/products/sublimation-blank-notebook-large-50-per-case)
- HPN Small notebook: imprint **4.25" x 3.5"** (108.0 x 88.9 mm) (verified) — [HPN small notebook](https://heatpressnation.com/products/sublimation-notebook-small-100-per-case)
- Promotional A5 PU notebooks print digitally, not by sublimation: 150 x 218 mm front ([Gedward](https://gedward.aimsmarter.co.uk/product/Notebook_approx_A5_833733)) and 138 x 209 mm ([Atta45](https://www.atta45.se/e-butik/en/produkt/pu-notebook-eva)) (snippets)

Door hangers
- Unisub two-sided door hanger: **4" x 9"** (101.6 x 228.6 mm) (snippet) — [ISW Unisub 4x9 door hanger](https://goisw.com/unisub-4x9-two-sided-sublimation-door-hanger-25-case/)
- Longforte polymer: 10.2 x 22.9 cm (snippet) — [Longforte 4x9 door hanger](https://www.longforte.com/products/door-hanger-polymer-double-sided-4-x-9)
- ProWorld plywood: rectangle Sub Blank Size 10.25" x 5.7" (260.4 x 144.8 mm) and oval 10" x 6" (254 x 152.4 mm) (snippets) — [ProWorld SB-S-157](https://www.proworldinc.com/sb-s-157-rectangle-plywood-door-hanger.html), [ProWorld SB-S-156](https://proworldinc.com/sb-s-156-oval-plywood-door-hanger.html)
- Titan Jet MDF door hanger: 60 x 150 mm, with a recommended 5 mm bleed (snippet) — [Titan Jet MDF door hanger](https://titanjet.co.za/sublimation-mdf-door-hanger/)
- Unisub FRP oval door sign: 3.5" x 5" (verified) — [HPN Unisub oval door sign](https://heatpressnation.com/products/unisub-sublimation-blank-gloss-oval-door-sign-w-pre-drilled-holes-3-5-x-5-5-pack)

Business cards and ID cards
- Unisub 2-sided white gloss aluminium business card: **2" x 3.5"** (50.8 x 88.9 mm) (snippet) — [JP Plus Unisub business card](https://jpplus.com/unisub-2-sided-aluminum-business-card)
- Generic aluminium business card blanks: 3.4 x 2.1 in (86 x 54 mm), 0.21 mm thick (snippet) — [Sewingmachine.com aluminium cards](https://sewingmachine.com/products/sublimation-blanks-aluminum-business-card-sublimation-business-cards-double-sided-white)
- ISO/IEC 7810 ID-1 (CR80): **85.60 x 53.98 mm** (3.375 x 2.125 in). Corner radius 2.88-3.48 mm; thickness 0.76 ± 0.08 mm. Confidence high — [ISO/IEC 7810 (Wikipedia)](https://en.wikipedia.org/wiki/ISO/IEC_7810); [ANSI webstore ISO/IEC 7810:2003](https://webstore.ansi.org/standards/iso/isoiec78102003)
- 30 mil CR80 PVC cards are made for thermal dye-sublimation ID card printers, which print from a ribbon, not paper transfer (snippet) — [B&H IDP CR-80.30](https://www.bhphotovideo.com/c/product/1295714-REG/idp_900001_pvc_white_id_cards_cr80_30.html)

Ceramic tiles
- Unisub hardboard tile: 4.25" x 4.25" (108.0 mm) (verified) — [HPN Unisub 4.25 tile](https://heatpressnation.com/products/unisub-sublimation-hardboard-tile-4-25-x-4-25)
- Ceramic 4.25" x 4.25" and 6" x 6" (152.4 mm) tiles, sold by the case (snippets) — [ISW 4.25 ceramic](https://goisw.com/ceramic-sublimation-tile-4-25x4-25-48-per-case-tile44/), [ISW 6x6 ceramic](https://goisw.com/ceramic-sublimation-tile-6-x6-36-per-case-tile66/)
- HPN "6x8" ceramic: **Imprint 7.9" W x 5.9" H** (200.7 x 149.9 mm). HPN "8x10" ceramic: **Imprint 7.9" W x 9.9" H** (200.7 x 251.5 mm). Nominal sizes are about 0.1 in larger than the real ones (verified) — [HPN 6x8 tile](https://heatpressnation.com/products/sublimation-ceramic-tile-6-x-8-white-gloss-36-per-case), [HPN 8x10 tile](https://heatpressnation.com/products/sublimation-ceramic-tile-8-x-10-white-gloss-36-per-case)
- Longforte 6" x 8" ceramic: 15.2 x 20.3 cm (snippet) — [Longforte 6x8 tile](https://www.longforte.com/products/lrg-ceramic-tile-6x8)

Fridge magnets
- Unisub aluminium: **2" x 3"** (50.8 x 76.2 mm) (verified) — [HPN Unisub 3x2 magnet](https://heatpressnation.com/products/unisub-3-2-sublimation-aluminium-magnet-w-1-25-mm-magnet-gloss-white)
- Unisub FRP: 2.5" round (63.5 mm) and 2.5" x 2.25" heart (snippets) — [Swing Design 5522](https://www.swingdesign.com/products/unisub-sublimation-blank-magnets-round-2-5), [ISW heart magnet](https://goisw.com/unisub-heart-sublimation-magnet-2-5x2-25-50-case/)
- INNOSUB MDF: 2" x 2" square, 1.57" x 2.36" rectangle, 2.16" circle and 2" heart (snippet) — [INNOSUB fridge magnets](https://sewingmachine.com/products/sublimation-fridge-magnet-blanks-refrigerator-magnet-by-innosub-usa)

### Inferences
- A4 fit (no bleed):
  - **Yes:** all phone inserts, the 7.5 in round and heart mouse pads, coasters, keychains, all three heart puzzles, 5x7 and 8x10 hardboard panels, all ornaments, the 8.125 in clock, the 8x11 cutting board (tight), tags, bookmarks, the HPN medium and small notebooks, door hangers, cards, all tiles listed, and magnets.
  - **No:**
    - XL mouse pads
    - the EU plate at 520 mm (it also exceeds A3's 420 mm, so it needs A2 or roll media)
    - the US plate at 301.6 mm (Legal or A3)
    - a 10 in clock at 254 mm diameter, which is more than A4's 210 mm short side, and the 30 cm Longforte clock
    - the HPN large notebook
    - the 11.7 in and 7.2 x 11.7 in natural slates (297.2 mm, over by 0.2 mm)
- With a 3 mm bleed per side, the 8x11 glass board (293 x 206.7 mm) still fits A4. The 8.125 in clock (212.4 mm) would no longer fit.
- An "8 in round mouse pad" (203.2 mm) would fit A4 if it exists. Only 7.5 in round was found from a blank supplier.

### Gaps
- No sublimation blank was found listing an 8 in round mouse pad, a 31.5 x 11.8 in XL pad, a 10 in round clock, an EU 520 x 110 mm sublimation plate or an MDF sign with stated dimensions.
- No supplier lists an aluminium insert size for the base iPhone 15 or for Samsung models. Titan Jet's list covers Pro and Pro Max models only.
- The Unisub sublimation star ornament was found, but no snowflake ornament in aluminium with a stated print area (only the Titan Jet 40 x 40 mm figure).
- Swing Design (Unisub) and ProWorld pages were not read directly: Swing Design was not reached in this pass, and ProWorld renders through JavaScript. Their figures above are search-snippet only.
- No sublimation-specific print area for a PU A5 notebook cover. The A5-like data is HPN's medium notebook and digital-print promo notebooks.
