# ADR 0007: Sheets as data, process-driven mirroring, product slots

- Status: accepted; the "switch the sheet" behaviour for oversize templates is superseded by ADR 0008
- Date: 2026-10-27
- Supersedes: the A4-only assumption in ADR 0001's examples

## Context

The v0.1 editor only knew A4. Research for v0.2 (`reports/Canva UX and print size catalogue.md`) showed that most mugs and small hard goods fit A4. Popular 20/30/40 oz tumblers, licence plates and adult full fronts and backs need A3, US Legal or A3+. DTF jobs are laid out on 22 in wide gang sheets. It also found that sublimation transfers must be mirrored and DTF films must not be, and that mirroring twice (in the app and the printer driver) is a common mistake. Users think in products ("an 11 oz mug"), not rectangles.

## Decision

1. **Sheets are data** (`lib/catalogue/sheets.ts`): `PageSettings.sheet` is an id (A4, Letter, Legal, A3, A3+, 22 in rolls, 13 in roll) or `"custom"` with a size. All geometry goes through `pageSize(page)`. v0.1 documents are upgraded by `lib/storage/migrate.ts`.
2. **Process drives mirroring**: `PageSettings.process` is `sublimation` or `dtf`. Switching process sets `mirrorOutput` (on for sublimation, off for DTF), and the user can override it. Mirroring is applied only in outputs (render plan → PNG, JPEG, PDF, print), never on the canvas. The export dialog and footer say that output is mirrored, so users do not mirror again in the driver.
3. **Products are presets that create slots**: `lib/catalogue/products.ts` holds 52 presets with print area, bleed, wrap flag, illustration, source URL and confidence. Adding one creates a `Design` with `assetId: null` and `productId` set. Its box includes bleed for flat goods, or 6 mm seam overlap for wraps. Images are dropped into the slot and fitted with the existing non-cropping engine. Empty slots print nothing and are flagged by the pre-print check.
4. **Per-design flip** (`flipX`/`flipY`) is a design choice separate from output mirroring.

## Consequences

- Product sizes carry provenance; the UI shows source and confidence, and every size stays editable because blanks vary.
- Adding a template that does not fit offers the smallest sheet that holds it. An empty sheet turns to landscape automatically when that is enough.
- Very long DTF sheets (60–120 in) exceed browser canvas limits for raster export at 300 DPI; PDF export works at any length, and the export dialog explains the limit.
- Tapered products (latte mug, tapered tumblers) are left out until arc templates exist, rather than shipped as distorting rectangles.
