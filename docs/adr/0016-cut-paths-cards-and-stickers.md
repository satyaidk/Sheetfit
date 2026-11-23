# ADR 0016: Cut paths as vector geometry; two-sided cards; stickers as their own process

- Status: accepted
- Date: 2026-11-23

## Context

Cards need measurable spacing and cut guides for hand trimming; stickers need die-cut and kiss-cut paths for cutting
machines. Sheetfit had no cut geometry: a "border as cut line" was a black stroke printed as artwork. Two-sided products
had no notion of front and back.

## Decision

1. **Nested rectangles, never conflated.** A design has its box (artwork, including bleed), its trim (box minus bleed),
   its cut path (trim as rectangle, rounded rectangle or ellipse, moved by `cut.offset`, or a traced contour), and an
   editor-only safe area inside the trim. All in millimetres, in the design's local frame (`lib/cut/cut-path.ts`).
2. **Products imply a cut.** Round products cut as an ellipse, cards with their published corner radius
   (`ProductPreset.cornerRadius`, 3.18 mm for CR80), stickers with their template's `cut`.
3. **Cut paths are vectors in every output**: proof lines in PDF and raster when asked for (magenta kiss, cyan die),
   and a dedicated SVG cut file in millimetres with `ARTWORK`, `CUTLINE`, `SHEET_CUT` and `REGISTRATION` groups. They
   are never baked into the artwork. Output modes: artwork only, print (marks switched on for the page), proof (with
   cut lines).
4. **Two-sided cards** are two designs with `side: "front" | "back"` and a shared `pairId`. A back is only created when
   the user adds one or uploads a second file. The back sits right of the front with `pairGap` millimetres between cut
   paths (more if the bleeds would overlap). The pair selects, moves, duplicates and arranges as one block; a
   double-click or the inspector selects one side. Deleting one side leaves a one-sided card. Side labels are HTML
   overlays and never print.
5. **Stickers are a process**, not a sublimation product: `process: "sticker"`, not mirrored by default, with their own
   templates. Contours are traced from the artwork's alpha: threshold, exact Euclidean dilation by the offset (so the
   outline can never self-intersect), marching squares, Douglas–Peucker and Chaikin smoothing, then validation.
   Contours are stored box-relative and flagged stale when the image, size, crop or offset changes.
6. **Registration squares are generic** and labelled so: Sheetfit does not imitate any cutter's proprietary marks and
   does not drive cutters directly.

## Consequences

- Spacing can be measured between real cut paths (ADR 0017).
- Supplier-specific bleed, safe area and gap values are settings with labelled starting values, not universal defaults.
