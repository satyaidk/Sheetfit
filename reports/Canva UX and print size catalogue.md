# Rebuild Sheetfit on Canva's shell and print-shop data

Sheetfit reaches Canva-level polish by copying Canva's **three-zone shell with two contextual surfaces**. The header holds file and size actions, a left icon rail opens one panel, the canvas sits in the centre, and a zoom and page footer runs along the bottom. On top of that, Sheetfit should layer the print-specific intelligence that Canva lacks and that print-on-demand and gang-sheet tools already treat as standard. That means physical units everywhere, live effective-DPI badges, an output-level mirror switch, auto-pack with an explicit "did not fit" report, and a pre-export check for overlap, out-of-bounds art and low DPI. The visual layer should stay deliberately quiet. Use neutral OKLCH greys with one accent, an 8/4 px spacing grid, 8 px control radii, 150–250 ms ease-out motion and WAI-ARIA toolbars, and avoid the indigo-gradient defaults that mark an app as AI-generated. On sizes, the measured evidence is clear. **Nearly every mug, bottle, coaster, ornament, tag and small flat good fits on A4.** The exceptions are the borderline 20 oz skinny tumbler (236 × 208–211 mm), the 30 oz skinny tumbler (248 × 241 mm), the 40 oz handled tumbler's top wrap (321 × 148 mm) and the US licence plate (302 × 149 mm), which need A3 or US Legal. On garments, A4 covers everything up to a centre-chest print, plus infant, toddler and cap placements. A3 covers an 11 in adult full front, and anything **12 in wide or more needs A3+ (13 × 19 in) or a 22 in DTF roll**. The recommended default catalogue therefore ships about 50 presets in four groups: sheets and rolls, drinkware, flat hard goods, and apparel and accessory placements. Each preset is stored as data, with bleed, safe area, mirror default, DPI target and a source-confidence flag.

## Canva's editor is a three-zone shell with two contextual surfaces

Canva's 2024 "glow up" redesign sets the benchmark. The aim is to make "your content the hero" with "more space to create," using **a light-themed floating object panel** and **a quick-actions toolbar that replaced the fixed toolbar under the header** ([Canva Newsroom](https://www.canva.com/newsroom/news/glow-up/)). The side panel opens a preview when you hover a tab, pins open when you click it and closes with an X, and **Ctrl + /** toggles it ([Canva Help, glow up](https://www.canva.com/help/glow-up/); [Canva shortcuts](https://www.canva.com/help/keyboard-shortcuts/)). The header carries a File menu (margins, print bleed, danger-zone detection, rulers and guides, version history), Resize, a mode switcher and Share, which leads to Download and its "PDF Print" with crop marks and bleed ([Canva Help, margins/bleed](https://www.canva.com/help/margins-bleed-crop-marks/)).

Canva has two contextual surfaces. The **quick-actions toolbar** sits above the canvas and changes with the selection: an image gets crop, filters and effects, and text gets font, size and style. A `>>` button at its end expands it into a full Edit panel ([Canva Help AU](https://www.canva.com/en_au/help/glow-up-variantb/)). The **floating toolbar** sits next to the selection and holds Group/Ungroup, page Edit and a `…` More menu. Right-click opens the same menu, which includes "Resize canvas to Selection" ([Canva Help, layer/group/align](https://www.canva.com/help/layer-group-align/); [Canva Help, resize](https://www.canva.com/help/resize/)).

Figma's UI3 points the same way but with one warning. Figma explored hover-only UI and auto-appearing sidebars and **rejected them as "too unstable"** ([Figma blog](https://www.figma.com/blog/behind-our-redesign-ui3/)). Adobe Express moved to a **fixed contextual toolbar** in November 2025 ([Adobe Express release notes](https://helpx.adobe.com/be_en/express/web/whats-new/new-features/release-notes.html)). Sheetfit should therefore pin the quick-actions bar in a stable position just above the canvas. Hover-preview of panels should be an optional nicety behind a delay of about 300 ms, not the main way to open them.

Canva's Position panel is the model for arrangement. It has an **Arrange tab**: Forward/Backward/To front/To back, "Align to page" for a single element and "Align elements" for a multi-selection. It also has a **Layers tab**, which lists the page's layers with type icons, a hover "more" menu, drag-to-reorder with an insertion line and Shift multi-select ([Canva Help, layers](https://www.canva.com/help/finding-and-arranging-layers/)). Resize offers suggestions and categories plus a custom size in **px, in, mm or cm**, with an aspect lock. Fields outside the limits turn red, and the user chooses "Copy & resize" or "Resize this design" ([Canva Help, design from scratch](https://www.canva.com/help/design-from-scratch/)).

For print, Canva shows margins as broken lines and a **fixed 0.125 in (3.175 mm) bleed** as dashed lines. Danger-zone detection paints a red overlay and lets elements snap to the safe edge. Rulers are toggled with **Shift+R**, show the design's unit, highlight the selection's extent in grey while you drag, and are desktop only ([Canva Help, margins/bleed](https://www.canva.com/help/margins-bleed-crop-marks/)). Uploads follow the same pattern: an Uploads tab with "Upload files", a split option for folder upload, drag-and-drop onto the tab, click to add, and a hover corner menu for moving files to folders ([Canva Help, upload media](https://www.canva.com/help/upload-media/)). On mobile, the panels become a bottom drawer and the selection toolbar becomes a horizontally scrolling bottom strip with "More" at the end. Long-press opens the actions menu, and a keyboard toolbar appears while editing text ([Canva Help, glow up](https://www.canva.com/help/glow-up/)).

The table below translates these patterns into Sheetfit's existing component layout (`TopToolbar`, `LeftSidebar`, `CanvasWorkspace`, `PropertiesPanel`, `BottomBar`, `Rulers`). **Canva publishes no pixel sizes for its chrome.** The dimensions are starting points from the researchers' observation, not measured values.

| Zone | Sheetfit recommendation | Basis |
|---|---|---|
| Header (~56 px, unverified) | Logo/menu, editable project title, undo/redo, **Sheet size** (Resize-style dialog), **Process** switch (Sublimation / DTF), Download as the single primary button | Canva header and Resize flow |
| Left rail (~64–72 px) and panel (~320–360 px) | Tabs: Products, Uploads, Text, Elements, Layers. Click pins the panel, Esc or the X closes it, Ctrl+/ toggles it | Canva side panel; Figma's rejection of hover-only UI |
| Quick-actions bar (~40–48 px, above the canvas, fixed position) | Image: Replace, Crop, Flip, Fit/Fill, Transparency, Position, DPI badge. Multi-select: Align, Distribute, Tidy, Group. Sheet: Background, Sheet size, Bleed/Safe toggles. A `>>` button opens the full inspector | Canva quick actions; Adobe Express fixed bar |
| Floating pill (anchored to the selection) | Duplicate, Delete, Lock, Group (when 2+ items are selected), `…` | Canva floating toolbar |
| Right-click / `…` / Shift+F10 | Copy, Paste, Duplicate, Delete · Layer › · Align to sheet › · Group/Ungroup, Lock · Fit sheet to selection | Canva More menu (order is inferred) |
| Footer (~48 px) | Zoom %, Fit (Shift+2), Fit selection (Shift+3), sheet thumbnails, a sheet-utilisation readout | Canva footer; Kittl zoom; gang-sheet reviews |
| Below 768 px | Bottom tab bar, Vaul sheets with 0.4 and 0.9 snap points (non-modal at 0.4), scrolling 44 px action strip, long-press for the context menu | Canva mobile; Vaul docs |

Keyboard coverage should follow Canva's documented set, so that users who already know Canva feel at home ([Canva shortcuts](https://www.canva.com/help/keyboard-shortcuts/)). Arrow keys nudge, with Shift for a large step. Ctrl+Arrow resizes, and Alt+, / Alt+. rotates. Ctrl+] and Ctrl+[ move a layer forward and back, with Alt added for front and back. Ctrl+G and Ctrl+Shift+G group and ungroup. Alt+Shift+L locks and Alt+Shift+T tidies. Ctrl+D duplicates, and Tab or Shift+Tab cycles the selection. `/` or Ctrl+E opens a command palette, Alt+1 shows layers, and Ctrl+0, Alt+Ctrl+0 and Shift+Ctrl+0 give actual size, fit and fill. On top of this, add Figma's **Space-drag to pan** and Kittl's **Shift+1/2/3** for fit content, fit artboard and fit selection ([Figma Help](https://help.figma.com/hc/en-us/articles/360041064174-Adjust-alignment-rotation-position-and-dimensions); [Kittl blog](https://www.kittl.com/blogs/?p=12600)). Publish all of it in a `?` shortcut sheet laid out in Canva's sections: Basic, Element, Text, Zoom, Sheet.

## Print tools add what Canva lacks: physical units, DPI, mirroring and packing

Canva is a general design tool. The tools Sheetfit's users actually print from show what a print layout editor needs on top of Canva.

**Measure in millimetres, live, and better than Figma does.** Figma shows a red distance line when you hold Alt over a second object and nudges 1 px, or 10 px with Shift. It shows no distances during a drag, and users have asked for that ([Figma Help, measure](https://help.figma.com/hc/en-us/articles/360039956974-Measure-distances-between-layers); [Figma forum](https://forum.figma.com/suggest-a-feature-11/showing-distance-to-objects-while-dragging-21963)). In a print editor the gap between items is a cutting specification, not a cosmetic one. Sheetfit should show **live gap pills in mm or in during a drag**, nudge by 1 mm (10 mm with Shift, configurable), and let users scrub numeric fields from the label as well as with Alt-drag. Figma's Alt-scrub works inconsistently across fields, according to its own users ([Figma forum](https://forum.figma.com/report-a-problem-6/option-drag-alt-drag-not-working-in-all-number-fields-37280)). Konva's `dragBoundFunc`, `anchorDragBoundFunc` and `rotationSnaps` are the implementation hooks. Snapping should target sheet edges and centre, other items' edges and centres, the bleed and safe lines, and guides. Use a tolerance of 5–8 screen pixels that does not change with zoom, and let Ctrl or Alt suspend snapping, the Dockview and Figma convention ([Dockview](https://dockview.dev/docs/core/dnd/smartGuides)).

**Draw print zones the way POD users already read them.** Printify uses white for the print area, a **dashed inner line for the safe area** and a **grey band outside for bleed** ([Printify Help](https://help.printify.com/hc/en-us/articles/4483626015889-What-are-safe-areas-and-bleeds)). Printful adds a grid toggle that shows the boundaries and a separate Mockups view ([Printful blog](https://www.printful.com/blog/design-maker-features)). Printful also makes the key DPI point: pixel count alone misleads. **150–300 DPI is the working range, and 300 DPI is recommended for small detailed items such as mugs** ([Printful blog](https://www.printful.com/blog/everything-you-need-to-know-to-prepare-the-perfect-printfile)). Gang-sheet builders turn that into green, yellow and red badges with 300 DPI at print size as the target ([T-shirt.ca](https://t-shirt.ca/dtf-knowledge-hub/gang-sheet-builder-software-guide/)). Gelato notes that a 300 DPI file scaled to 200% drops to 150 DPI effective ([Gelato](https://www.gelato.com/connect/article/dtf-gang-sheet-batch-production-guide)). Sheetfit already computes resolution in `image-resolution.ts`. The UX change is to surface it as a badge on the canvas, in the quick-actions bar and on every Uploads thumbnail, and to update it live during resize. A threshold of **≥300 green, 150–299 amber, <150 red** follows the cited guidance; the exact cut-offs are a design choice.

**Make mirroring an output setting, not a canvas edit.** Paper-transfer sublimation must be mirrored ([Heat Press Nation](https://heatpressnation.com/blogs/blog/how-to-sublimate-a-t-shirt)), and DTF files must not be ([t-shirt.ca](https://t-shirt.ca/dtf-knowledge-hub/dtf-artwork-requirements-and-file-formats/)). Practitioners warn that mirroring a second time in the print driver cancels the first flip ([Castle Ink](https://castleink.com/blogs/printer-help/how-to-print-a-mirror-image)). Cricut Design Space mirrors automatically according to the chosen material and offers a per-mat toggle ([Cricut Help](https://help.cricut.com/hc/en-us/articles/360009432354)). Sheetfit should follow Cricut. The Process switch sets mirror **on for sublimation and off for DTF**. The export dialog shows a "Mirrored for output — do not mirror again in the printer driver" badge. Per-object Flip H/V stays a separate design control, as in Adobe Express's Position panel ([Adobe Express Help](https://helpx.adobe.com/express/web/arrange-layers-and-pages/align-elements.html)). One documented exception is Siser EasySubli printed without a cutter, which needs mirror off ([heyletsmakestuff](https://heyletsmakestuff.com/wprm_print/using-siser-easysubli-with-a-sawgrass-printer)). The toggle must therefore stay user-overridable.

**Adopt the gang-sheet builder's auto-build loop.** Ninja Transfers' Auto Build, launched in July 2025, takes several designs, a quantity and size for each, and packs them with spacing, **rotating some to fit** ([Graphics Pro](https://graphics-pro.com/news/ninja-transfers-auto-features/); [Ninja how-to](https://ninjatransfers.com/pages/how-to-use-ninja-gang-sheet-builder)). T-shirt.ca's builder places fewer images when the quantities do not fit, changes sheet size without losing the layout, and offers a background colour that is visible only on screen ([T-shirt.ca](https://t-shirt.ca/dtf-knowledge-hub/gang-sheet-builder-software-guide/)). PrintXpand keeps the sheet-edge margin and the gap between objects as two separate settings, and confirms before a sheet-size change removes items ([PrintXpand docs](https://docs.printxpand.com/printxpand-4-0-designer-tool-add-on/bWFuYWdlLWdhbmdzaGVldC1wcm9kdWN0)). GangPro checks for **overlap, out-of-bounds art and low resolution before checkout** ([Shopify, GangPro](https://apps.shopify.com/gang-sheet-studio)). Reviews of these builders praise "buttery smooth" drag-and-drop and accurate auto-fit, and complain about upload failures ([AppNavigator, Kixxl](https://appnavigator.io/app/kixxl/reviews/)). One buyer complained of a sheet with "a lot of open space" ([LoneStar Adhesive](https://lonestaradhesive.com/products/dtf-gang-sheet-builder)).

For Sheetfit, which already has `auto-arrange.ts`, this means five changes:

- Model the arrange input as a list of (image, target size, quantity) entries.
- Expose "allow 90° rotation", "edge margin" and "gap" as separate controls.
- Report items that did not fit explicitly rather than dropping them silently.
- Show **sheet utilisation %** with a "Fill sheet" action that offers "max copies" and "N copies" modes.
- Run the three checks (overlap, out-of-bounds, low DPI) as one pre-export review panel.

Sawgrass's move to the browser-based MySawgrass, with templates, real-time mockups and direct print, after it retired Creative Studio on 1 Feb 2025, confirms that browser-based sublimation layout is now a mainstream workflow, not a niche one ([Sawgrass sunset](https://sawgrassink.com/sunset); [Sawgrass Design](https://www.sawgrassink.com/products/design/)).

## Premium polish comes from restraint, a token system and fast motion

Professional editors share four habits. The canvas comes first, the chrome stays quiet, one accent colour is used sparingly, and dense controls are precisely aligned. Linear rebuilt its theming in **LCH from three inputs (base, accent, contrast)** instead of 98 hand-set variables. It limited blue in the chrome for a "more neutral, timeless look" and aligned labels and icons so precisely that users "feel" it ([Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)). Canva's official App UI Kit spaces at **4/8/12/16/24/32/48/64/96 px**, with **4 px sharp and 8 px default radii** ([canva.dev](https://canva.dev/docs/apps/app-ui-kit/spacing)). Adobe Spectrum's `spacing-100` is 8 px ([Spectrum tokens](https://spectrum.adobe.com/page/design-tokens/)). The opposite of this is the "vibe-coded" look: the same left rail, the same rounded card grid and "the same bg-indigo-500 purple accent that's become the unofficial flag of AI-generated interfaces," all drawn from unmodified Tailwind and shadcn defaults ([Banani](https://www.banani.co/blog/vibe-designing)).

Sheetfit should therefore define its tokens deliberately in OKLCH in `globals.css`, which Tailwind v4 and shadcn already support. Canva's own brand colours are known only from third-party sources: logo stops #7D2AE7, #6420FF and #00C4CC ([canva.dev source](https://canva.dev/docs/apps/app-ui-kit/colors)), and an unofficial CTA purple of #8B3DFF ([webdesignhot](https://www.webdesignhot.com/design.md/canva/)). Sheetfit should **not** borrow them. Pick one distinctive accent that is not indigo or violet, so the product does not read as a Canva clone or as a default AI build.

| Token area | Recommendation | Evidence level |
|---|---|---|
| Neutrals | Cool-tinted grey ramp in OKLCH; workspace about #EEF0F2 (light) and #1E1E1E (dark); sheet pure white with a two-layer shadow `0 1px 2px rgb(0 0 0/.06), 0 4px 16px rgb(0 0 0/.08)` | Observation; Linear method |
| Accent | One hue, used only for selection, primary CTA, focus and active tab. No gradients or gradient text | Linear; Banani |
| Guides | Magenta 1 px snap lines and distance pills, a separate hue from the selection accent | Common convention; no citable Canva hex |
| Type | Inter or Geist; 13 px panel text, 11–12 px captions, 14 px dialogs; `tabular-nums` in every numeric field | Linear uses Inter/Inter Display |
| Spacing / radii | 4/8 px grid; 4 px small controls, 8 px controls, 12 px popovers and cards; inner radius = outer radius minus padding | Canva App UI Kit |
| Controls | 28–32 px tall on desktop, 40–44 px on touch; 16 px icons at a 1.5 stroke in one icon family (lucide) | Inference; WCAG target size |
| Selection | 1.5 px accent border, white round corner anchors and pill side anchors (Konva `anchorStyleFunc`), constant screen size at any zoom, hit area ≥24 px | Observation; WCAG 2.5.8 |
| Surfaces | Separate surfaces by tone, not by border plus shadow; 1 px low-alpha dividers only where grouping needs them | Linear; Figma UI3 |

Motion should be short and interruptible. Emil Kowalski, author of Sonner and Vaul, keeps UI animation **under 300 ms**, uses ease-out, animates only `transform` and `opacity`, skips animation for keyboard-triggered actions, and swaps movement for a fade under `prefers-reduced-motion` ([Emil Kowalski](https://emilkowal.ski/ui/great-animations)). Material 3 publishes reusable tokens: short 50–200 ms, medium 250–400 ms, standard easing `cubic-bezier(0.2, 0, 0, 1)` and emphasized decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)` ([Material Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)). The shadcn Sheet default of **500 ms open / 300 ms close is too slow** for an editor panel and should be overridden ([shadcn sheet.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sheet.tsx)). Use 150 ms for popovers, scaling from 0.96 to 1 from the Radix transform origin. Use 200–250 ms for panel slide-in and 150 ms for slide-out. Dragged objects follow the pointer 1:1 and settle into a snap in 100–150 ms. Pinch and wheel zoom are never eased.

Onboarding should be a path into the work, not a tour. NN/g finds that coach marks are dismissed unread. It recommends a single hint at the moment of use, and empty states that report status, give in-context cues and offer **direct pathways to the key tasks** ([NN/g, overlays](https://www.nngroup.com/articles/mobile-instructional-overlay/); [NN/g, empty states](https://www.nngroup.com/articles/empty-state-interface-design/)). Sheetfit's first run should be a **"What are you printing?" picker**. It offers Process (Sublimation/DTF), Sheet (A4/A3/Letter/roll) and an optional product preset, with real thumbnails, plus "Open sample sheet". The empty sheet then shows a dashed drop zone with Upload, Add product template and Auto-fill buttons, and muted shortcut tips. One coach mark at the first selection points to the quick-actions bar.

For accessibility, use Radix `Toolbar` for the quick-actions bar. The WAI-ARIA toolbar pattern requires `role="toolbar"`, one Tab stop, arrow keys between controls (roving tabindex) and a documented shortcut to jump into the toolbar ([WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)). Canva provides that jump with Ctrl+F1, F2 and F3 to focus the toolbar, canvas and side panel ([Canva shortcuts](https://www.canva.com/help/keyboard-shortcuts/)). Targets must be at least **24 × 24 CSS px under WCAG 2.5.8** ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). Make canvas items keyboard-operable: Tab cycles items, arrows nudge in mm, and Enter or Esc enter and leave groups. Mirror the canvas in the Layers list, and announce moves through an `aria-live="polite"` region, for example "Image moved to 20 mm, 35 mm".

## Most sublimation hard goods fit A4; four drinkware and plate templates do not

The hard-goods evidence is strongest where Heat Press Nation (HPN) product pages were read directly. Most template marketplaces repeat figures copied from spam pages, and Unisub's own template hub was rate-limited, so some Unisub figures come from reseller listings. Rectangles below are the flat print area (for a wrap, width runs around the circumference). The fit column compares that rectangle with A4 at 210 × 297 mm with no bleed added. "Land." means it fits only in landscape orientation.

| Product | Print area (in) | mm | Sheet | Confidence | Source |
|---|---|---|---|---|---|
| 11 oz mug wrap | 8.5 × 3.5 (variants 9 × 3.5, 8.5 × 3.6) | 216 × 89 | A4 land. | Medium | [souhil4](https://souhil4.gumroad.com/l/MotivationalMugSublimationMugWrap) |
| 15 oz mug wrap | 9 × 4 | 229 × 102 | A4 land. | Medium-low | [souhil4](https://souhil4.gumroad.com/l/MotivationalMugSublimationMugWrap) |
| 11 oz accent mug (POD) | 2718 × 1112 px full; 2400 × 975 px bordered | ~230 × 94 | A4 land. | Medium | [Gearment](https://help.gearment.com/en-us/article/mug-products-vsa3nr) |
| 12 oz latte mug (cone, arc template) | 9.94 × 4.71 bounding box | 252 × 120 | A4 land. | High | [HPN](https://heatpressnation.com/products/12-oz-latte-mug-36-per-case) |
| 12 oz enamel mug | 7.78 × 2.44 (UK trade: 180 × 56 mm) | 198 × 62 | A4 | High | [HPN](https://heatpressnation.com/products/12-oz-fine-enamel-sublimation-mugs-silver-rim-48-per-case); [WTTB](https://wttb.co.uk/products/personalised-enamel-mugs) |
| 6 oz espresso (C-handle) | 7.3 × 2.75 | 185 × 70 | A4 | High | [HPN](https://heatpressnation.com/products/6-oz-white-c-handle-ceramic-mugs-36-per-case) |
| 3 oz espresso / mini | 4.7 × 2.4 to 5.0 × 2.625 | 119–127 × 61–67 | A4 | High | [HPN](https://heatpressnation.com/products/hpn-sublicraft-3oz-sublimation-ceramic-espresso-mug-36-per-case) |
| Kids polymer mug | 8.27 × 1.97 | 210 × 50 | A4 land. | Low-medium | [Titan Jet](https://titanjet.co.za/kids-polymer-mug-green/) |
| 16 oz glass can | 9.6 × 4.2 (range 9.4–9.75 × 4.2–5) | 244 × 107 | A4 land. | Medium | [Silhouette School](https://www.silhouetteschoolblog.com/2022/07/how-to-re-size-tumbler-wrap-templates.html) |
| 12 oz ceramic travel tumbler | 10.75 × 4.15 | 273 × 105 | A4 land. | High | [HPN](https://heatpressnation.com/products/12-oz-sublimation-travel-tumbler-with-black-lid-24-per-case) |
| 12 oz stemless wine | 11.02 × 4.33 | 280 × 110 | A4 land. | Medium | [Titan Jet](https://titanjet.co.za/12oz-blue-stainless-steel-wine-tumbler/) |
| 12 oz skinny can cooler (steel) | 9.1 × 5.9 | 231 × 150 | A4 land. | High | [HPN](https://www.heatpressnation.com/products/sublicraft-by-heatpressnation-sublimation-blank-stainless-steel-can-cooler-for-skinny-12-oz-cans-white) |
| 20 oz bottle (screw top / sport) | 7.94 × 4.86 / 7.8 × 5.6 | 202 × 123 / 198 × 142 | A4 | High | [HPN screw](https://heatpressnation.com/products/20-oz-stainless-steel-sublimation-water-bottle-screw-top-48-per-case); [HPN sport](https://www.heatpressnation.com/products/20-oz-aluminum-sport-bottle-flip-top-with-carabiner-48-per-case) |
| **20 oz skinny tumbler** | 9.3 × 8.2–8.3 | 236 × 208–211 | **Borderline A4** (borderless only); A3 safe | Medium | [rapidfiredesigns](https://rapidfiredesigns.gumroad.com/l/nzfpu); [kindtumbler](https://kindtumbler.gumroad.com/l/cuxcw) |
| **30 oz skinny tumbler** | 9.77 × 9.5 | 248 × 241 | **A3** (also exceeds Letter) | High | [HPN](https://heatpressnation.com/products/sublicraft-30-oz-stainless-steel-sublimation-skinny-tumbler-with-straw-silver) |
| **40 oz handled tumbler** | top 12.63 × 5.81 + tapered bottom 10.13 × 3.85 | 321 × 148 + 257 × 98 | **A3 or US Legal** (top part) | Medium | [Jennifer Maker](https://jennifermaker.com/how-to-sublimate-a-40-oz-tumbler/) |
| Mouse pad, rectangle | 9.25 × 7.75 (Printful 8.7 × 7.1) | 235 × 197 | A4 | High | [MyDesigns](https://mydesigns.io/product-catalog/other/product/mouse-pad-rectangle); [Printful API](https://api.printful.com/products/518) |
| Mouse pad, round / heart | 7.5 dia / 8 × 9.5 | 191 / 203 × 241 | A4 | High | [HPN round](https://heatpressnation.com/products/sublicraft-by-heatpressnation-sublimation-blank-mouse-pads-7-5-round-10-pack); [HPN heart](https://heatpressnation.com/products/mouse-pad-3mm-heart-160-per-case) |
| Coasters | 4 × 4 sq; 3.75 round; 4.25 sandstone | 102; 95; 108 | A4, multi-up | High | [Swing Design](https://swingdesign.com/products/unisub-sublimation-blank-coasters-square); [ProWorld](https://www.proworldinc.com/sb-s-198-round-sandstone-coaster-with-cork.html) |
| Ornaments | 3.9 round; star 3.81 × 3.98; snowflake 3 × 2.8 | 99; 97 × 101; 76 × 71 | A4, multi-up | Medium-high | [Imaging Spectrum](https://imagingspectrum.com/collections/unisub); [HPN star](https://heatpressnation.com/products/unisub-sublimation-blank-ornament-star-3-81-x-3-98-10-pack) |
| Keychains | 2.5 round; 1.6 × 2.25 rect; 2.5 × 2.25 heart | 64; 41 × 57; 64 × 57 | A4, multi-up | High | [HPN](https://heatpressnation.com/products/unisub-sublimation-blank-keychain-2-sided-2-5-round-25-pack) |
| Pet tags | 1.25 × 1.38 heart; 1.25 × 1.5 round | 32 × 35; 32 × 38 | A4, multi-up | High | [Swing Design](https://swingdesign.com/products/unisub-sublimation-pet-tag-blanks-2-sided) |
| Luggage tag / bookmark / magnet | 2.5 × 4.25 / 1.25 × 5 / 2 × 3 | 64 × 108 / 32 × 127 / 51 × 76 | A4, multi-up | High | [HPN tag](https://heatpressnation.com/products/unisub-sublimation-blank-bag-tag-rectangle-2-5-x-4-25-5-pack); [HPN bookmark](https://heatpressnation.com/products/unisub-sublimation-blank-bookmark-1-25-x-5-5-pack); [HPN magnet](https://heatpressnation.com/products/unisub-3-2-sublimation-aluminium-magnet-w-1-25-mm-magnet-gloss-white) |
| Business card / CR80 | 2 × 3.5 / 3.375 × 2.125 | 51 × 89 / 85.6 × 54.0 | A4, multi-up | Medium / High | [JP Plus](https://jpplus.com/unisub-2-sided-aluminum-business-card); [ISO/IEC 7810](https://en.wikipedia.org/wiki/ISO/IEC_7810) |
| Phone insert (iPhone 15 Pro Max) | 6.30 × 2.99 | 160 × 76 | A4 | Medium | [Titan Jet](https://titanjet.co.za/?p=68999) |
| Door hanger | 4 × 9 | 102 × 229 | A4 | Medium | [ISW](https://goisw.com/unisub-4x9-two-sided-sublimation-door-hanger-25-case/) |
| Tiles | 4.25 sq; 6 sq; "6×8" = 7.9 × 5.9; "8×10" = 7.9 × 9.9 | 108; 152; 201 × 150; 201 × 252 | A4 | High | [HPN 8×10 tile](https://heatpressnation.com/products/sublimation-ceramic-tile-8-x-10-white-gloss-36-per-case) |
| Photo panels (ChromaLuxe) | 5 × 7; 8 × 10 art at 8.125 × 10.125 with bleed | 127 × 178; 206 × 257 | A4 portrait | High | [JPP ChromaLuxe](https://www.jpplus.com/chromaluxe-aluminum-photo-panels) |
| Puzzles | A4 290 × 200 mm; A5 202 × 146 mm; heart 6.7 in | 290 × 200; 202 × 146; 170 | A4 (A4 puzzle has ~3–5 mm per side spare) | High | [Signdepot](https://transfer.signdepot.eu/en/Sublimation-puzzle-A4); [HPN heart](https://heatpressnation.com/products/unisub-heart-sublimation-23-piece-hardboard-puzzle-gloss-white-raw-back) |
| Wall clock | 8.125 round | 206 | A4 (fails with 3 mm bleed) | High | [HPN](https://heatpressnation.com/products/unisub-8-125-circle-sublimation-aluminium-clock-kit-gloss-white) |
| Glass cutting board 8 × 11 | 11.3 × 7.9 | 287 × 201 | A4 land., tight | High | [HPN](https://heatpressnation.com/products/8-x-11-cutting-board-24-per-case) |
| Notebook medium / large | 9.1 × 5.8 / 12.5 × 8 | 231 × 147 / 318 × 203 | A4 / **A3** | High | [HPN medium](https://heatpressnation.com/products/sublimation-notebook-medium-50-per-case); [HPN large](https://heatpressnation.com/products/sublimation-blank-notebook-large-50-per-case) |
| Photo slate 7.2 × 11.7 | 7.2 × 11.7 | 183 × 297.2 | **A3** (0.2 mm over A4) | High | [HPN](https://heatpressnation.com/products/sublimation-photo-slate-20-per-case) |
| **US licence plate** | 11.88 × 5.88 | 302 × 149 | **A3 or Legal** | High | [Swing Design](https://www.swingdesign.com/products/unisub-sublimation-license-plate-blanks) |
| EU plate (finished-plate standard) | 20.47 × 4.33 | 520 × 110 | **Roll / A2** (exceeds A3) | Medium | [eplaque.fr](https://www.eplaque.fr/plaque-immatriculation/plaque-immatriculation-aluminium) |
| XL gaming mouse pad | 15.7 × 35.4 | 399 × 899 | **Roll** | Medium | [PrintKK](https://www.printkk.com/gb/product/info/large-mouse-pad-made-in-usa) |

Three findings matter for the product. First, **wraps cluster at 198–280 mm wide by 60–150 mm tall**, so most drinkware templates fit on A4 only in landscape. The sheet picker must offer orientation switching, or auto-rotate the sheet to fit the template. Second, the borderline cases are real. The 20 oz skinny wrap sits within 2 mm of A4's short edge, and sellers note that "all brands of skinny tumblers do vary slightly" ([kindtumbler](https://kindtumbler.gumroad.com/l/cuxcw)). Sheetfit should therefore let users adjust a preset's dimensions rather than treating presets as locked. Third, **the 12 oz latte mug is a cone, so its template is an arc**. A rectangular preset distorts artwork, and Sheetfit should either omit it or label it "bounding box — tapered" until it supports arc templates.

On bleed, ChromaLuxe asks for at least 1/8 in total, for example 8.125 × 10.125 in for an 8 × 10 panel ([JPP](https://www.jpplus.com/chromaluxe-aluminum-photo-panels)). Tumbler makers print with zero margin and about **0.25 in seam overlap** ([Jennifer Maker](https://jennifermaker.com/how-to-sublimate-a-40-oz-tumbler/)). Titan Jet leaves at least 5 mm at the top and bottom of a mug and 20 mm on each side of the handle ([Titan Jet](https://titanjet.co.za/?p=9518)). A defensible default is therefore **1.5–3 mm bleed per side for flat goods, and +6 mm on the circumference for wraps**. Treat this as a reasonable default derived from those sources, not as an industry standard; no supplier-wide standard was found.

Several products still have no reliable print area: 10 oz kids mug, 12/15 oz sippy cups, 17 and 25 oz bottles, an 8 in round mouse pad, a 10 in clock, MDF signs, an EU sublimation plate blank, and phone inserts beyond Titan Jet's Pro models. These should ship as user-defined custom sizes, not as presets.

## Garments split cleanly at 8, 11 and 12 inches wide

Five DTF vendor guides (Ninja Transfers, ScreenPrinting.com, xTool, Transfer Kingdom and Kingdom DTF) largely agree on apparel placements. The sheet boundaries follow directly from three widths. **An 8.27 in design fits A4 portrait, 11.69 in fits A3, and 13 in is A3+.**

| Placement | Recommended preset (in) | mm | Smallest sheet | Sources |
|---|---|---|---|---|
| Left/right chest | 3.5 × 3.5 (vendor average 3.5 × 2; range 2.5–4.5) | 89 × 89 | A4 | [Ninja](https://ninjatransfers.com/pages/dtf-transfer-placement-guide); [ScreenPrinting.com](https://www.screenprinting.com/blogs/news/dtf-transfer-placement-guide) |
| Centre chest | 8 × 4 | 203 × 102 | A4 | [Ninja](https://ninjatransfers.com/pages/dtf-transfer-placement-guide) |
| Full front, adult | 11 × 11 (range 10–12 W) | 279 × 279 | A3 | [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart) |
| Full back | 12 × 14 (11 × 14 fits A3) | 305 × 356 | A3+ | [ScreenPrinting.com](https://www.screenprinting.com/blogs/news/dtf-transfer-placement-guide) |
| Oversize front/back | 13 × 15 (to 15 × 18 at Printful) | 330 × 381 | 22 in roll | [Ninja](https://ninjatransfers.com/pages/dtf-transfer-placement-guide); [Printful](https://help.printful.com/hc/en-us/articles/18532732956828) |
| Upper back / yoke | 12 × 4 | 305 × 102 | A3 (rotated) | [Ninja](https://ninjatransfers.com/pages/dtf-transfer-placement-guide) |
| Back neck / inside label | 3 × 3 (2–3 in) | 76 × 76 | A4 | [ScreenPrinting.com](https://www.screenprinting.com/blogs/news/dtf-transfer-placement-guide) |
| Short-sleeve logo | 3.5 × 3.5 (3–3.5 × 2–3.5) | 89 × 89 | A4 | [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart); [Fulfill Engine](https://help.fulfillengine.com/en/white-label-store/max-decoration-sizing) |
| Sleeve text strip | 3 × 1 | 76 × 25 | A4 | [Ninja](https://ninjatransfers.com/pages/dtf-transfer-placement-guide) |
| Long sleeve (vertical) | 2.5 × 14 (to 3.5 × 18) | 64 × 356 | A3 (≤16.5 in); roll above | [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart); [Fulfill Engine](https://help.fulfillengine.com/en/white-label-store/max-decoration-sizing) |
| Pocket | 3 × 3 | 76 × 76 | A4 | [Rush Order Tees](https://www.rushordertees.com/blog/pocket-printing-guide/) |
| Hoodie front (above pouch) | 10 × 10 (10–11.5 W) | 254 × 254 | A3 | [Kingdom DTF](https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more) |
| Tank full front | 9.5 × 12 (9–10 × 12–14) | 241 × 305 | A3 | [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart) |
| Youth front (S–M) | 9 × 9 | 229 × 229 | A3 | [Ninja](https://ninjatransfers.com/pages/dtf-transfer-placement-guide) |
| Toddler front | 7 × 7 | 178 × 178 | A4 | [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart) |
| Infant / onesie front | 5 × 5 | 127 × 127 | A4 | [Kingdom DTF](https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more) |
| Cap front (structured) | 4 × 2 (4–5 × 1.75–2.25) | 102 × 51 | A4 | [Printful blog](https://www.printful.com/blog/hat-logo-size-and-placement-guide) |
| Trucker/snapback front | 5 × 2 (up to 5.5 × 2) | 127 × 51 | A4 | [Printful API](https://api.printful.com/products/77) |
| Beanie cuff | 5 × 1.75 | 127 × 44 | A4 | [Printful API](https://api.printful.com/products/81) |
| Cap back | 3 × 1 | 76 × 25 | A4 | [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart) |
| Hat patch blank | 3.5 × 2.5 | 89 × 64 | A4 | [Etsy](https://www.etsy.com/listing/1759985019/blank-leather-hat-patch) |
| Tote bag | 9 × 9 safe (max 12 × 13.5) | 229 × 229 | A3 | [xTool](https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart); [Fulfill Engine](https://help.fulfillengine.com/en/white-label-store/max-decoration-sizing) |
| Can cooler (fabric/neoprene) | 5 × 4 regular; 6.5 × 3.2 slim | 127 × 102; 165 × 81 | A4 | [Printful API](https://api.printful.com/products/764) |
| Face mask | 7.5 × 5.1 | 191 × 130 | A4 | [AA Print Supply](https://aaprintsupplyco.com/collections/face-mask/products/ecofreen-antimicrobial-face-mask-sublimation-blank) |
| Baby bib | 8.75 × 14 | 222 × 356 | A3 | [ProWorld](https://www.proworldinc.com/sb-s-050-pnk-baby-bib-pink.html) |
| Crew sock (per side) | 15.5 × 3.3 | 394 × 84 | A3 | [Printify](https://printify.com/app/products/1433/generic-brand/sublimation-crew-socks) |
| Garden flag | 12 × 18, two-sided | 305 × 457 | A3+ | [Gearment](https://help.gearment.com/en-us/article/flag-products-1xbyzzi) |
| Pillow cover | 16, 18, 20 in squares | 406–508 sq | Roll | [Printful API](https://api.printful.com/products/89) |
| Pet bandana / lanyard | 20 × 9.75 / 0.75 × 36 | 508 × 248 / 19 × 914 | Roll | [Printify](https://printify.com/app/products/562/evergreen/pet-bandana); [Quality Logo Products](https://www.qualitylogoproducts.com/badge-holders/sublimation-lanyard-34.htm) |
| Blanket 50 × 60 | art canvas 54 × 65 incl. bleed | 1372 × 1651 | Roll | [GearLaunch](https://www.gearlaunch.com/academy/blanket-design) |

Two disagreements between sources resolve on inspection. The sleeve figures describe two different designs: Ninja's 2.5 × 1 in is a one-line text strip, while xTool's 3–4 × 2–3.5 in and the 3.5 × 3.5 in maximums from DTF Transfers Now and Fulfill Engine describe logos. Ship both as presets. The hat figures converge on about **4 in wide by 1.75–2.25 in tall** across Printful's blog and API, DTF Transfers Now and Fulfill Engine, which leaves Transfer Kingdom's "2 × 3" as the outlier ([DTF Transfers Now](https://dtftransfersnow.com/dtf-size-and-print-guide)). Garment size also matters. Kingdom DTF scales full-front width from **8.5–9.5 in at XS to 13.5–14 in at 6XL** and recommends a single 11 in print for S–3XL ([Kingdom DTF](https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more)). So "Full front 11 × 11" is the right single preset, with a size hint showing the 2XL+ range. No citable size exists for hood-side or crop-top prints, so neither should ship as a preset.

For DTF gang sheets, **22 in (559 mm) is the de facto commercial film width**, and 60 cm is the metric equivalent ([Gelato](https://www.gelato.com/connect/article/dtf-gang-sheet-batch-production-guide)). Atlanta Vinyl sells lengths from 12 to 240 in ([Atlanta Vinyl](https://atlantavinylstore.com/products/custom-dtf-transfer-gang-sheet-upload)). A 22 × 240 in sheet is 6,600 × 72,000 px at 300 DPI, which Canva, Word and Publisher cannot build ([DTF Dallas](https://dtfdallas.com/blogs/news/building-22x240-gang-sheet-best-software)). Atlanta Vinyl adds that Canva lowers the resolution of sheets longer than 83 in ([Atlanta Vinyl blog](https://atlantavinylstore.com/blogs/news/dtf-gang-sheets-explained-how-to-maximize-every-inch)). Desktop DTF printers use A3 sheets, 13 × 19 in A3+ sheets or 13 in rolls ([Kingdom DTF film](https://kingdomdtf.com/products/dtf-film-13-x-328-matte-roll-hot-peel)). The file rules are consistent across vendors:

- Transparent PNG at 300 DPI at final size.
- Not mirrored.
- At least 1/4 in between designs and 1/2 in clear at the sheet edges ([Gelato](https://www.gelato.com/connect/article/dtf-gang-sheet-batch-production-guide)).
- Lines of at least about 0.5 mm ([t-shirt.ca](https://t-shirt.ca/dtf-knowledge-hub/dtf-artwork-requirements-and-file-formats/)).
- Canvas trimmed to the design, with 1–2 mm of bleed at most ([Transfer Superstars](https://www.transfersuperstars.com/blogs/news/dtf-file-requirements-how-to-prep-your-artwork-for-perfect-prints)).

Sublimation sheets are A4 and A3 paper. The Sawgrass SG1000 takes up to A3 / 11 × 17 in from its standard tray and **13 × 19 in through the bypass tray** ([Longforte](https://www.longforte.com/products/sawgrass-truepix-sublimation-paper-13-x-19-a3)).

## The default catalogue: about 50 presets stored as data, grouped by sheet

The catalogue should be a typed data file, for example `src/lib/catalogue/products.ts`, not hard-coded UI. Each preset should record its provenance, so that the UI can show a confidence hint and contributors can audit the numbers. Dimensions stay in millimetres, consistent with Sheetfit's ADR-0001.

```ts
interface ProductPreset {
  id: string;                         // "mug-11oz-wrap"
  name: string;                       // "Mug 11 oz — full wrap"
  group: "sheet" | "drinkware" | "flat" | "apparel" | "accessory";
  process: ("sublimation" | "dtf")[];
  widthMm: number; heightMm: number;  // print area; wraps: width = circumference direction
  shape: "rect" | "circle" | "heart" | "taper";
  bleedMm: number;                    // per side; wraps add seam overlap to width
  safeInsetMm: number;
  minSheet: "A4" | "A3" | "Legal" | "A3+" | "roll";
  targetDpi: 300; floorDpi: 150;
  confidence: "high" | "medium" | "low";
  sourceUrl: string;
}
```

**Sheets and rolls (12):**

- A4 (210 × 297)
- A3 (297 × 420)
- US Letter (215.9 × 279.4)
- US Legal (215.9 × 355.6)
- A3+ / 13 × 19 in (330 × 483)
- 13 in DTF roll
- DTF 22 in wide at 12, 24, 36, 60, 120 and 240 in long (559 × 305 … 559 × 6096)

**Drinkware (14):**

- Mugs: 11 oz wrap 216 × 89, 15 oz wrap 229 × 102, 12 oz enamel 198 × 62, 6 oz espresso 185 × 70, 3 oz espresso 119 × 61
- 16 oz glass can 244 × 107
- 12 oz travel tumbler 273 × 105
- 12 oz stemless wine 280 × 110
- 12 oz skinny can cooler 231 × 150
- 20 oz bottle 202 × 123
- 20 oz skinny 236 × 210 (flagged as borderline for A4)
- 30 oz skinny 248 × 241 (A3)
- 40 oz handled tumbler: top 321 × 148 (A3/Legal) and bottom 257 × 98, as a two-part preset

**Flat hard goods (14):**

- Mouse pads: rectangle 235 × 197, round 191
- Coasters: square 102, round 95, sandstone 108
- Ornament: round 99
- Keychain: round 64
- Pet tag: 32 × 38
- Luggage tag 64 × 108
- Bookmark 32 × 127
- CR80 card 85.6 × 54.0
- Photo panel 8 × 10 with bleed: 206 × 257
- A4 puzzle 290 × 200
- US licence plate 302 × 149 (A3)

**Apparel and accessories (14):**

- Tops: left chest 89 × 89, centre chest 203 × 102, full front 279 × 279, full back 305 × 356, upper back 305 × 102, back neck 76 × 76
- Sleeves: sleeve logo 89 × 89, long sleeve 64 × 356
- Kids: toddler 178 × 178, infant 127 × 127
- Hats: cap front 102 × 51, trucker front 127 × 51
- Bags: tote 229 × 229
- Flag: garden flag 305 × 457

Defaults that follow from the evidence:

- Sublimation presets default to **mirror on, 3 mm bleed on flat goods and +6 mm seam overlap on wraps**.
- DTF presets default to **mirror off, no bleed, a 6.35 mm (1/4 in) gap**, and an edge margin set by the sheet: 12.7 mm (1/2 in) on 22 in rolls, as Gelato advises, and the printer's unprintable margin, about 3–5 mm, on A4/A3 desktop sheets. The desktop margin is an inference, not a vendor rule.

Choosing a preset should do four things:

- Pick the smallest sheet that fits, using `minSheet` and auto-rotating to landscape when that is needed.
- Offer to switch sheet when a placed template overflows. This follows Cricut's rule of offering only material sizes larger than the largest object ([Cricut Help](https://help.cricut.com/hc/en-us/articles/360009504333)).
- Let Auto-fill tile small items multi-up. By arithmetic, ten 2 × 3 in magnets (51 × 76 mm) fit on an A4 sheet at a 6 mm gap.
- Keep every dimension editable, because blanks vary between brands.

Leave out arc-template products (latte mug, tapered 30 oz variants), roll-only textiles (pillows, blankets, bandanas, lanyards, socks over A3) and the unsourced products until the app supports tapered templates and roll output. The catalogue table should include them as disabled "coming soon" entries only if their sizes are shown with a low-confidence flag.

## Conclusion

The research changes what "Canva-level" should mean for Sheetfit. Canva's polish is mostly restraint and predictability: content first, one contextual bar keyed to the selection, a mirrored right-click menu and complete keyboard coverage. None of this requires new rendering technology; it is a reorganisation of components Sheetfit already has. The real differentiation sits where Canva is weakest for this audience. Canva fixes bleed at 0.125 in, works in px-first units, offers no effective-DPI warnings, does not mirror for print, and downsamples long sheets. Sheetfit can win by making the physical sheet the primary object: millimetre gaps shown live during a drag, DPI traffic lights, a process-driven mirror switch, sheet-utilisation feedback, and a pre-export gate that catches overlap, out-of-bounds art and low resolution before ink is wasted.

The size data also shows that "A4 editor" is close to the right scope, but only just. Roughly three in four of the hard goods in the table above (23 of 31 rows) and every small-to-mid garment placement fit A4. The products customers will most often hit the limit with are the popular 20, 30 and 40 oz tumblers and adult full fronts and backs. Supporting A3, US Legal and A3+, and later a 22 in roll mode, is therefore the highest-value scope expansion after the UI redesign. Shipping the catalogue with per-preset confidence and source links turns an inevitable weakness (blanks vary and suppliers disagree) into a trust signal that no competitor in the notes offers. The remaining unknowns are Canva's exact chrome dimensions and colours, sippy-cup and 17/25 oz bottle templates, and hood or crop-top placements. They need direct measurement or supplier templates, not more web search.
