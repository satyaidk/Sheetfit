# Feature implementation plan and test matrix (v0.9)

Companion to `docs/engineering-audit.md`. The order follows the dependencies: every feature below shares one geometry
(millimetres, local design frame), one render plan and one migration path, so they were built bottom-up.

## Stages

| Stage | Work | Main files | Depends on |
| --- | --- | --- | --- |
| 0 | Baseline, repair `node_modules`, map the architecture | `docs/engineering-audit.md` | — |
| 1 | Shared geometry: cut paths (rect, rounded, ellipse, contour), trim vs box vs cut vs safe area, path validation | `lib/cut/cut-path.ts` | 0 |
| 2 | Mirror mode (auto, on, off) resolved once; plan carries marks and cut lines by output mode | `lib/render/mirror.ts`, `render-plan.ts`, `guides.ts`, `export-pdf.ts`, `rasterize.ts` | 1 |
| 3 | Cover (fill) mode and pan/zoom crop view in source terms; crop mode on canvas (double-click, toolbar, touch long-press, pinch, wheel) | `lib/image/image-fit.ts`, `components/editor/CropOverlay.tsx` | 2 |
| 4 | Two-sided cards: `side`, `pairId`, pair gap between cut paths, centre marks, add/swap/unlink/re-pair | `lib/layout/card-pair.ts`, store, `DesignSections.tsx` | 1, 2 |
| 5 | Auto Arrange: MaxRects with clearance rectangles, obstacles, pairs and groups as blocks, 90° turns, extra pages, one undo step, dry-run summary | `lib/layout/nesting.ts`, `arrange.ts`, `ArrangeDialog.tsx` | 1, 4 |
| 6 | Catalogue research and additions with source metadata; lanyard roll strip layout | `lib/catalogue/products.ts`, `lib/layout/strip-layout.ts`, `docs/catalogue-sources.md` | 1 |
| 7 | Stickers: process, sticker templates, alpha contour, kiss/die, sheet cut, registration squares, quantity, SVG cut file | `lib/cut/contour.ts`, `lib/export/export-svg.ts` | 1, 2, 5 |
| 8 | Migration of every new field, tests, browser checks, docs | `lib/storage/migrate.ts`, `tests/v09-*.test.ts` | all |

## Decisions (see ADRs 0014–0017)

- **Default fit stays "contain".** ADR 0002 (never crop silently) holds. Fill is one click (inspector segmented control,
  quick-bar fit menu, crop mode) and is stored as a view, never as edited pixels. — ADR 0015
- **Mirror is per page and saved with the page.** New pages and projects start on Auto, and pages created for another
  process reset to Auto, so an override never leaks into unrelated work. — ADR 0014
- **Cut paths live in the design's local frame** and are carried by the plan in every output mode, so the SVG cut file,
  PDF proof lines and canvas guides are the same geometry. — ADR 0016
- **Spacing is measured between cut paths**, widened only where bleeds would otherwise print onto each other. — ADR 0017

## Test matrix

Automated: `npm run check` (unit and integration, Node). Browser: `v9func.mjs` (production build in headless Chrome,
SwiftShader). Physical: must be done by the user on real equipment.

| Area | Case | Automated (file) | Browser | Physical |
| --- | --- | --- | --- | --- |
| Units | mm ↔ pt and px, A4 PDF page box, PNG pixel size at DPI | `units-resolution`, `export`, `v09-output` | PDF page 210 × 297 mm measured | Print a ruler at 100 % |
| Mirror | Auto/On/Off × sublimation/DTF/sticker resolution | `v09-output` | Effective label, badge | — |
| Mirror | Legacy boolean and v0.1 pages open unchanged | `v09-output` | — | — |
| Mirror | PDF and raster/print: asymmetric corner designs, cut lines, crop and centre marks at mirrored positions, exactly one flip | `v09-output` (PDF content interpreter, recording canvas) | PDF files parsed: Auto 1 flip, Off 0, On 1 | Press a transfer with the driver mirror off |
| Mirror | Per-design flip independent of sheet mirror; print CSS never transforms | `v09-output` | — | — |
| Fill/crop | Portrait into 228.6 mm square: no bars, no distortion, 25 % cropped | `v09-output` | — | — |
| Fill/crop | Landscape into portrait; fit keeps whole image; pan limits; zoom about centre; resolution independent | `v09-output` | — | — |
| Fill/crop | Low effective DPI at high zoom is reported | `v09-output` | Shown in crop mode | — |
| Fill/crop | Plan, PDF and raster use the same source window | `v09-output` | — | Compare print to screen |
| Fill/crop | Double-click, toolbar, long-press (550 ms) open crop mode; short tap does not; Apply is one undo step | — | `v9func` (desktop and 390 px touch) | Try on a phone |
| Fill/crop | Save and reopen; corrupt values clamped | `v09-output` | — | — |
| Cards | One upload stays one-sided; second upload becomes the back | `v09-arrange` | `v9func` | — |
| Cards | Same physical size, cut gap = pair gap, widened for bleed, re-aligned when the gap changes | `v09-arrange` | Gap label "5 mm" | Cut and measure |
| Cards | Replace one side, swap, select one side, duplicate pair, delete one side → one-sided, undo | `v09-arrange` | Edit one side keeps pair | — |
| Cards | CR80 cut path 85.6 × 53.98 mm, 3.18 mm corners | `v09-output`, `v09-arrange` | — | Compare with a real card |
| Cut paths | Rounded rect, ellipse, offset, safe area; invalid paths rejected | `v09-output` | — | — |
| Marks | Output modes: artwork only / print / proof; registration squares; centre marks | `v09-output` | — | Cutter reading marks: not supported, by design |
| Arrange | 14 random designs × 4 seeds: no overlap, cut gap ≥ spacing, inside margins, sizes unchanged | `v09-arrange` | 11 images: pre-print check clean | — |
| Arrange | Deterministic; rotation on/off/locked; locked obstacles; selection only; pairs rigid | `v09-arrange` | — | — |
| Arrange | Extra pages and undo/redo of the whole step; too-large reported; save/reopen | `v09-arrange` | Summary before applying | — |
| Arrange | Mutation check: removing spacing makes 9 tests fail | run by hand | — | — |
| Catalogue | Unique ids, https sources, sides 1/2, radius ≤ half side, metadata on every v0.9 entry, sizes as published | `v09-catalogue` | Pictures rendered | Check your blanks |
| Catalogue | Stickers only under the sticker process; synonyms search | `v09-catalogue` | — | — |
| Lanyard | Every value user-entered and validated; sections; page = ribbon; profiles saved, corrupt storage ignored | `v09-catalogue` | 5 straps on 3 pages | Print on ribbon, measure |
| Stickers | Contour: disk area, offset growth, islands, merge, holes, specks, empty image, stale detection | `v09-output` | Traced from a transparent PNG | Cut on a plotter |
| Stickers | Quantity: copies packed, one undo step | `v09-arrange` | — | — |
| Stickers | SVG in mm, CUTLINE/SHEET_CUT/REGISTRATION/ARTWORK groups, kiss/die, mirror matches print | `v09-output` | Real SVG: mm units, closed contour path, not mirrored | Import into your cutter software |
| Migration | Old projects (v0.1, v0.2–v0.8) open with identical output | `v09-output`, `v09-arrange`, `v02-logic` | — | — |
| Regression | Existing suites (216 tests at baseline) | all `tests/*` | — | — |

## Manual checks still required

1. Print the asymmetric calibration sheet with Mirror Auto on a sublimation page and the driver mirror **off**; the
   pressed transfer must read correctly. Repeat with Mirror Off and the driver mirror **on**.
2. Print a PVC card pair with "Print cut lines" and centre marks on; trim by hand and check the 5 mm gap and that front
   and back line up when the card is flipped on its long edge.
3. Import the SVG cut file into the cutting software you use and check scale (it is in millimetres) and registration;
   add the software's own registration marks if it uses an optical sensor.
4. Measure ribbon width and strap length on your own lanyard roll before saving a strip profile.
