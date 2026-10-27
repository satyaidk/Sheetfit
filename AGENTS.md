<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sheetfit: living project report

**This file is the single source of truth for what Sheetfit is, what state it is in, and what to do next.**
Every agent (and human) reads it before starting work and updates it **in the same change** as any code,
feature, plan or known-issue change. Keep entries short and factual. Newest entries go at the top of the
update log (section 8).

Last updated: 2026-10-27 (v0.3.0)

## 1. Product in one paragraph

Sheetfit is a browser-only, Canva-style layout editor for **sublimation and DTF** printing. A project has
**pages**, each with its own sheet (A4, Letter, Legal, A3, A3+, 22 in DTF gang sheets, custom) and process.
Users add **product templates** (52 presets: mugs, tumblers, coasters, shirt placements, caps, totes…) that
become empty boxes at the real print size, placed in a free spot or on a new page with the sheet they need;
drop images or generated **sample designs** in; **preview** the result on the product in any blank colour; and
export an exact-size multi-page PDF, PNG/JPEG per page with DPI metadata, a browser print at 100%, or a
`.sheetfit` project file. Default fitting never crops or distorts. Sublimation output is mirrored; DTF is not.
No backend; projects live in IndexedDB.

## 2. Current status

| Area | State |
| --- | --- |
| v0.1 core (fitting engine, multi-design, exports, print, IndexedDB, `.sheetfit` files) | Done, tested |
| v0.2 research (Canva UX + product sizes) | Done: `reports/Canva UX and print size catalogue.md`, notes in `research_notes/…` |
| v0.2 model (sheets, process, mirror, flip, slots, migration) | Done, tested |
| v0.2 catalogue (52 presets + illustrations + Products panel) | Done |
| v0.2 UI/UX redesign (Canva shell, quick bar, pill, context menu, inspector, footer, dialogs, landing) | Done, verified in Chrome |
| v0.3 pages (own sheet + history per page), placement fix for the "A3 takes over" bug | Done, tested, verified in Chrome |
| v0.3 product previews (colours, wrap turning, PNG download), sample designs, product cards redesign | Done, verified in Chrome |
| Quality gate `npm run check` | Passing: lint, types, 164 tests, coverage 90.4 % lines (lib + store), build |
| Browser checks (`v3func.mjs`, 39 checks) | 39/39 passing on the production build, no console errors |
| Committed to git | **No.** Branch `dev` (main branch `main`); v0.2 and v0.3 work is uncommitted. The user has not asked to commit yet |

## 3. Commands

```bash
npm run dev            # http://localhost:3000; /editor?sample loads the sample sheet
npm run check          # lint + typecheck + tests with coverage + production build (must pass before "done")
npm test               # vitest only
```

- Windows: run from an upper-case `C:\` path; a lower-case `c:\` path makes every Vitest file fail
  ("reading 'config'").
- The bash tool's heredocs break on some backtick/quote mixes; for large patches write a Python script to the
  scratchpad and run it.
- Browser verification: Claude-in-Chrome was disconnected. Working fallback: `puppeteer-core` + installed Chrome
  (`C:/Program Files/Google/Chrome/Application/chrome.exe`) from a scratch folder, against
  `npm run build && npx next start -p 3200`. Scripts: `v3func.mjs` (39 functional checks), `v3shots.mjs`
  (README screenshots → `docs/images/`). `localStorage["sheetfit:onboarded"]` controls the start dialog.
  In scripts: clicking the active rail tab closes its panel; accept the unsaved-changes `beforeunload` prompt;
  restart `next start` after every rebuild.

## 4. Architecture rules (do not break)

1. **Millimetres only in the document.** Convert at the edges via `src/lib/layout/coordinate-conversion.ts`.
2. **No silent crop or distortion.** Non-stretch fit modes keep the image inside the box with its exact aspect
   (`tests/image-fit.test.ts`). Stretch needs confirmation; crop is opt-in.
3. **One render plan** (`src/lib/render/render-plan.ts`) feeds PNG, JPEG, PDF, print and preview. Output
   mirroring and per-design flips live there, never on the canvas.
4. **Layouts never resize designs to fit**; they report what does not fit and suggest a sheet.
5. Pure logic in `src/lib` (tested in Node); `src/store` orchestrates; components render.
6. Konva only in client components loaded with `next/dynamic({ ssr: false })`.
7. Product sizes are data with a source URL and confidence; never hard-code sizes in components.
8. Visual tokens only from `src/app/globals.css` (accent `#077d89`, guides `#ec2f8f`); no new inline UI colours.
   Product blank colours and illustration hardware colours are data (`lib/catalogue/colors.ts`, `ProductMockup`).
9. **Adding a product never changes a page that holds work** (`lib/layout/product-placement.ts`): free spot,
   else a new page with the right sheet/process. Only an empty page adopts the product's sheet.
10. Pages: the active page is `doc`/`past`/`future`; other pages wait in `pages`. Read every page with
    `allPages(state)`, never `state.pages[i].doc` for the active page (it is stale).
11. Sample designs are generated (`lib/catalogue/sample-designs.ts`), never fetched from the web (ADR 0008).
12. Mount panels for one layout only (`useNarrower` in `EditorLayout`); do not render desktop + mobile copies.

## 5. File map

| Path | Responsibility |
| --- | --- |
| `src/types/editor.ts` | `PageSettings` (sheet, customSize, orientation, process, mirrorOutput, margins…), `Design` (assetId nullable, productId, productColor, bleed, flipX/Y…), `EditorDocument` = one page |
| `src/types/project.ts` | `ProjectRecord` (`document` = page 1, `pages` = all), `ProjectSummary` (designCount, pageCount) |
| `src/lib/catalogue/sheets.ts` | Sheet presets, `smallestSheetFor` (order A4, Letter, Legal, A3, A3+), `smallestSheetOrRollFor` |
| `src/lib/catalogue/colors.ts` | Blank colours per product group, `resolveColor`, `shade`, `luminance` |
| `src/lib/catalogue/sample-designs.ts` | Seeded SVG sample designs (4 emblem + 6 pattern families × 8 palettes), `renderSampleSvg(d, aspect)` |
| `src/lib/catalogue/products.ts` | 52 product presets, `slotSize` (bleed / +6 mm seam), `minSheetFor`, `searchProducts` |
| `src/lib/image/*` | Fitting engine, effective DPI, file loading |
| `src/lib/layout/sheet-layout.ts` | `pageSize(page)`, `sheetLabel`, printable rect, rotated bounds, `pointInDesign`, `designAt` |
| `src/lib/layout/product-placement.ts`, `free-spot.ts` | Where a new product goes (current page / new page, gap 5 then 2 mm, 90° turn) |
| `src/lib/layout/alignment.ts`, `drag.ts`, `measure.ts`, `auto-arrange.ts` | Align/distribute, snapping, live gaps + utilisation, packing |
| `src/lib/render/render-plan.ts` | Shared plan incl. `mirror`, `flipX/Y`; empty slots skipped |
| `src/lib/export/*` | Raster (mirror/flip), PDF (multi-page, mirror/flip via cm), DPI metadata, `preflight.ts`, print (named `@page` per size) |
| `src/lib/storage/*` | IndexedDB, `.sheetfit` files, `migrate.ts` (v0.1 → v0.2 docs, `migratePages` for v0.3 records) |
| `src/lib/editor-actions.ts` | Use-cases: upload, `addProduct` (page-aware toasts), save/open/import/export of all pages, `sampleDesignAsset`, `applySampleDesign`, `ASSET_DRAG_TYPE` |
| `src/lib/sample.ts` | Sample project: page 1 A4 landscape (mug wrap, 2 coasters, magnet, empty pet tag), page 2 A3 (30 oz tumbler, mint) |
| `src/store/editor-store.ts` | Active page doc + undo, `pages`/`activePage` + page actions, `allPages`, assets, selection, view, dialogs (incl. `mockup`), slot/process/sheet actions, `PAGES_BAR_PX` |
| `src/components/editor/EditorLayout.tsx` | Shell; first-run start dialog; mobile sheets (`useNarrower`) |
| `src/components/editor/PagesBar.tsx` | Floating page strip: thumbnails, add/duplicate/delete/resize page |
| `src/components/editor/Header.tsx`, `Footer.tsx` | Top bar (File menu, sheet, process, undo, title, Download); bottom bar (usage %, zoom) |
| `src/components/editor/SidePanel.tsx` | Icon rail + panel (Products, Designs, Uploads, Layers, Sheet, Projects) |
| `src/components/editor/CanvasWorkspace.tsx` | Konva stage: handles, guides, gaps, slots, drops, space-pan, DPI badges, empty state |
| `src/components/editor/ImageLayer.tsx`, `PrintSheet.tsx`, `Rulers.tsx` | Design node (image/slot), sheet, rulers |
| `src/components/editor/QuickActionsBar.tsx`, `FloatingPill.tsx`, `CanvasContextMenu.tsx` | Contextual tools |
| `src/components/editor/PropertiesPanel.tsx` | Inspector (preview card, image, empty slot + sample strip, multi-select, sheet summary) |
| `src/components/editor/LayersPanel.tsx`, `ProjectsPanel.tsx`, `StartDialog.tsx`, `ShortcutsDialog.tsx`, `use-editor-shortcuts.ts` | Panels, dialogs, keyboard |
| `src/components/products/ProductMockup.tsx` | Original SVG product illustrations in any colour with a design (wrap strips, lighting, blend) |
| `src/components/products/MockupPreview.tsx` | `MockupCard`, `MockupDialog`, `ColorSwatches`, `SampleStrip` |
| `src/components/products/*Panel.tsx`, `ProductArt.tsx`, `design-image.ts`, `sample-url.ts` | Products and Designs panels, plain illustration, slot render for previews, blob-URL cache |
| `src/components/settings/*` | `SheetPanel`, `SheetDialog`, `DimensionControls`, `NumberField`, `Section` |
| `src/components/export/ExportDialog.tsx` | Export/print for all pages or one, page-by-page preview, preflight per page, mirror badge |
| `src/components/ui/*` | Radix/shadcn-style primitives incl. popover, context-menu, toolbar |
| `src/app/page.tsx` | Landing page (uses `public/editor-preview.png`) |
| `tests/*` | 164 Vitest tests (`v03-pages-mockups.test.ts` covers pages, placement, colours, samples, multi-page output) |
| `docs/` | Design doc, ADRs 0001–0008, learning path, printing guide, screenshots |

## 6. Plan

v0.2 phases (all done 2026-10-27):
- [x] P1 Model: sheets, process/mirror, flip, bleed, slots, migration
- [x] P2 Catalogue: 52 presets, illustrations, Products panel, custom-size box
- [x] P3 Visual system: tokens, Figtree, primitives
- [x] P4 Shell: header, rail + panel, quick bar, pill, context menu, inspector, footer
- [x] P5 Canvas UX: Canva handles, guides, live gaps, slots + drop-into-slot, space-pan, zoom to selection, DPI badges, distribute
- [x] P6 Export: mirror in all outputs, preflight with click-to-select, sheet-aware labels
- [x] P7 Onboarding: start dialog, empty states, `?` shortcuts
- [x] P8 Mobile: bottom tab bar, bottom sheets, scrolling quick bar
- [x] P9 Quality: tests, check, browser e2e, screenshots, README, ADR 0007, CHANGELOG

v0.3 phases (all done 2026-10-27):
- [x] Q1 Pages: model, store actions, per-page history, page strip, export/print/save of all pages, migration
- [x] Q2 Placement: free spot, new page for oversize / other-process products, top-left start (fixes "A3 takes over")
- [x] Q3 Previews: ProductMockup (colours, wrap projection, lighting), inspector card, dialog, PNG download
- [x] Q4 Sample designs: generator, Designs panel, product cards, sample strip for empty boxes, landing showcase
- [x] Q5 Quality: 164 tests, 39 browser checks, screenshots, README, ADR 0008, CHANGELOG 0.3.0

Next (v0.4 candidates, in suggested order):
1. Commit the work (ask the user first; current branch `dev`, main branch `main`).
2. Playwright e2e in CI (port `v3func.mjs`).
3. Page reordering (drag in the page strip); page names.
4. DTF auto-pack with per-image quantity and 90° rotation; separate edge margin vs gap.
5. Text tool; simple shapes.
6. Arc/taper templates (12 oz latte mug, 40 oz tumbler bottom, tapered tumblers).
7. Background removal / colour knockout for DTF.
8. Photographic mockups; optional Pinterest import via the official API (user's own boards, needs OAuth + backend).

## 7. Known issues / to fix

- Raster export of very long DTF sheets (22×60 in and longer at 300 DPI) exceeds browser canvas limits; PDF
  works. The export dialog explains it.
- Empty-slot labels are hidden on small boxes (only a "+" shows).
- Undo is per page; deleting a page cannot be undone (it asks first). Pages cannot be reordered yet.
- Previews are illustrations; colours are approximate. Sample-design text relies on system fonts
  (Arial Black/Impact fallback) and is forced to width with `textLength`.
- Pinterest images are deliberately not used (copyright, terms of service); see ADR 0008.
- `package-lock.json` still names the package `tool-bar` 0.1.0 (pre-existing; harmless for `npm ci`).
- The quick-actions bar scrolls horizontally on narrow screens (by design).
- Tapered products are omitted (no arc templates yet).
- README badges assume GitHub repo `satyaidk/tool-bar` (no remote configured).
- `research_notes/` and `reports/` are in the repo root; decide with the user whether to keep them committed.

## 8. Update log

- **2026-10-27**: v0.3.0. User reported: product cards not attractive enough; choosing A3 for one product
  "conflicts" with other designs; wanted Pinterest example designs that refresh, a preview of the design on the
  T-shirt, and blank colours. Done: pages with their own sheets (root cause: one sheet per project + "Switch to
  A3"), product placement rules, product previews with colours and wrap turning, generated sample designs
  (Pinterest declined: copyright/ToS, ADR 0008), redesigned cards, multi-page export/print (also fixed print
  always using A4), sheet summary fix, double-mounted panels fix. `npm run check` green (164 tests, 90.4 %
  lines); `v3func.mjs` 39/39.
- **2026-10-27**: v0.2.0 complete. Canva-structured redesign, new visual system, 52-product catalogue with
  illustrations, multi-sheet + DTF rolls, process-driven mirroring, product slots, live gaps, preflight,
  start dialog, landing page. `npm run check` green (135 tests). Browser-verified: PDF 297×210 mm, PNG
  3508×2480, DTF toggles mirror off (undo restores), 30 oz tumbler offers A3, slot fill, save/reopen,
  no console errors.
- **2026-10-27**: User rejected v0.1 UI as unattractive/"vibecoded". Deep research run (7 notes + report).
  AGENTS.md became this living report.
- **2026-10-26**: v0.1 shipped (uncommitted): core engine, A4 editor, exports, print, IndexedDB,
  `.sheetfit` files, 107 tests, docs set.
