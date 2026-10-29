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

Last updated: 2026-10-29 (v0.7.0 + UX audit)

> **Before any other work, read [`docs/MUST-FIX.md`](docs/MUST-FIX.md)** (UX and logic audit, 2026-10-29). Fix its
> P0 items first, one ID per commit, tick them there and log them here. No new features until every P0 is ticked.

## 1. Product in one paragraph

Sheetfit is a browser-only, Canva-style layout editor for **sublimation and DTF** printing. A project has
**pages**, each with its own sheet (A4, Letter, Legal, A3, A3+, 22 in DTF gang sheets, custom) and process.
Clicking one of 52 **product templates** (mugs, tumblers, coasters, shirt placements, caps, totes…) starts a
**new design** on the sheet it needs (asking to save or discard current work; "+" adds it to the current sheet
instead). Users drop images or generated **sample designs** into the box, watch a **live preview** on the product,
inspect every product as an interactive **3D model** in any blank colour, and
export an exact-size multi-page PDF, PNG/JPEG per page with DPI metadata, a browser print at 100%, or a
`.sheetfit` project file. Default fitting never crops or distorts. Sublimation output is mirrored; DTF is not.
No backend; projects live in IndexedDB. The home page (`/`) is a separate "studio" design that demonstrates
all of this in a short, plain page (hero, three steps, product templates, Sublimation vs DTF, FAQ) and links straight
into templates (`/editor?product=<id>`).

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
| v0.4 new design per product + save/discard dialog, live preview dock, sheet dropdowns, card visibility, landing page with real photos | Done, tested, verified in Chrome |
| v0.5 3D models for all 52 products (three.js, procedural, real size), adaptive backdrop, catalogue 3D viewer | Done, tested; every product rendered in headless Chrome |
| v0.6 studio home page, `?product=` editor links | Done; superseded by the v0.7 home page |
| v0.7 rendered product pictures (cards, lists, dialogs), 3D dock, 3D toolbar (views, zoom, full screen), back prints on the back, "Night press" home page | Done, tested, verified in Chrome |
| Quality gate `npm run check` | See section 8 for the latest numbers |
| Browser checks | `v5func.mjs` (48 whole-app checks incl. 3D dock), `v6func.mjs` (32 home page and link checks), `v5all3d.mjs` (every product in 3D); see section 8 |
| Committed to git | Up to v0.7 (by the user). Studio HDRI lighting on branch `ccr-5ba9bb88-hczjxd` |

## 3. Commands

```bash
npm run dev            # http://localhost:4000; /editor?sample loads the sample sheet
npm run check          # lint + typecheck + tests with coverage + production build (must pass before "done")
npm test               # vitest only
```

- Windows: run from an upper-case `C:\` path; a lower-case `c:\` path makes every Vitest file fail
  ("reading 'config'").
- The bash tool's heredocs break on some backtick/quote mixes; for large patches write a Python script to the
  scratchpad and run it.
- Browser verification: Claude-in-Chrome was disconnected. Working fallback: `puppeteer-core` + installed Chrome
  (`C:/Program Files/Google/Chrome/Application/chrome.exe`) from a scratch folder, against
  `npm run build && npx next start -p 3200`. Scripts: `v5func.mjs` (whole app), `v5all3d.mjs` (every product in
  3D, optional args: start index and a label filter; launch Chrome with `--use-angle=swiftshader --enable-unsafe-swiftshader`, about 13 s per product, so run it
  in the background), `v4shots.mjs`, `v5shots.mjs` and `v6readme.mjs` (README screenshots →
  `docs/images/`; 3D gallery via `contact.mjs`), `v6shots.mjs <widths…>` (home page at several widths; full-page
  captures use reduced motion so no section is mid-reveal), `v6func.mjs` (home page and `?product=` links). `localStorage["sheetfit:onboarded"]`
  controls the start dialog. In scripts: clicking the active rail tab closes its panel; accept the unsaved-changes
  `beforeunload` prompt; restart `next start` after every rebuild; clipped `page.screenshot` came back stale, use
  full-viewport or element screenshots; the product panel filters to the page's process, click "All" first.

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
13. **A product card click starts a new design** (`requestProduct` → `LeaveDialog` when there is work). Never merge
    products onto one sheet unless the user chose "Add to this sheet" or the card's "+" (ADR 0009).
14. 3D: three.js only through `Product3D` (next/dynamic). Builders in `lib/three/product-model.ts` stay pure (no
    DOM) so they run in Vitest; textures come from `lib/three/print-textures.ts` in the browser (ADR 0010).
15. Dialogs that skip auto-focus must use `focusDialogItself`, so focus (and Escape) stays inside the dialog.
16. Home page styles live under `.home` (tokens `night`, `night-2`, `mist`, `mist-2`, `muted`, `hairline`, plus the
    existing `process-*` inks) and must not leak into the editor. Every action links to a real editor flow
    (`lib/editor-link.ts`). Only licensed photos (`landing/photos.ts`, credited) and our own renders. No invented numbers.
17. Product pictures are build artefacts in `public/products/<id>.webp` (+ `-detail.webp` for small placements),
    rendered from the 3D models (ADR 0011, design doc section 18). Re-render them whenever a model or the sample
    designs change; `tests/v06-studio-home.test.ts` fails if any product lacks its picture. Never ship images whose
    licence is unknown. From the user's `Sublimation & DTF images/` folder only the six owner-approved designs in
    `src/assets/designs/` (CREDITS.md) may be used; never its character, brand-logo or people images.

## 5. File map

| Path | Responsibility |
| --- | --- |
| `src/types/editor.ts` | `PageSettings` (sheet, customSize, orientation, process, mirrorOutput, margins…), `Design` (assetId nullable, productId, productColor, bleed, flipX/Y…), `EditorDocument` = one page |
| `src/types/project.ts` | `ProjectRecord` (`document` = page 1, `pages` = all), `ProjectSummary` (designCount, pageCount) |
| `src/lib/catalogue/sheets.ts` | Sheet presets, `smallestSheetFor` (order A4, Letter, Legal, A3, A3+), `smallestSheetOrRollFor` |
| `src/lib/catalogue/colors.ts` | Blank colours per product group, `resolveColor`, `shade`, `luminance`, `contrastRatio`, `backdropFor` (3D backdrop) |
| `src/lib/catalogue/outlines.ts` | Garment outlines shared by 2D mockups and 3D models; `parsePath` (no DOM) |
| `src/lib/three/product-model.ts` | Procedural 3D builders per product shape (drinkware, flat, garment cloth surface, cap, tote, flag), `roundCorners` (profile fillets), `sweepGeometry`/`handle` (moulded handles), `printCrop`, `printStyle`, `weaveRepeat` |
| `src/lib/three/print-textures.ts` | Browser textures: print composite (process-aware), weave normal map, cork |
| `src/lib/three/driver-notes.ts` | `threeConsole` for `THREE.setConsoleFunction`: drops Direct3D compiler notes (X4122), forwards the rest |
| `src/lib/catalogue/sample-designs.ts` | Seeded SVG sample designs (4 emblem + 6 pattern families × 8 palettes), `renderSampleSvg(d, aspect)` |
| `src/lib/catalogue/products.ts` | 52 product presets, `slotSize` (bleed / +6 mm seam), `minSheetFor`, `searchProducts` |
| `src/lib/image/*` | Fitting engine, effective DPI, file loading |
| `src/lib/layout/sheet-layout.ts` | `pageSize(page)`, `sheetLabel`, printable rect, rotated bounds, `pointInDesign`, `designAt` |
| `src/lib/layout/product-placement.ts`, `free-spot.ts` | Where a new product goes (current page / new page, gap 5 then 2 mm, 90° turn) |
| `src/lib/layout/alignment.ts`, `drag.ts`, `measure.ts`, `auto-arrange.ts` | Align/distribute, snapping, live gaps + utilisation, packing |
| `src/lib/render/render-plan.ts` | Shared plan incl. `mirror`, `flipX/Y`; empty slots skipped |
| `src/lib/export/*` | Raster (mirror/flip), PDF (multi-page, mirror/flip via cm), DPI metadata, `preflight.ts`, print (named `@page` per size) |
| `src/lib/storage/*` | IndexedDB, `.sheetfit` files, `migrate.ts` (v0.1 → v0.2 docs, `migratePages` for v0.3 records) |
| `src/lib/editor-actions.ts` | Use-cases: upload, `openProductDesign`, `requestProduct`/`requestLeave`/`proceedWith`/`hasWorkToLose`, `addProduct` (gang sheets), `changeSheet`, save/open/import/export of all pages, sample designs, `ASSET_DRAG_TYPE` |
| `src/lib/sample.ts` | Sample project: page 1 A4 landscape (mug wrap, 2 coasters, magnet, empty pet tag), page 2 A3 (30 oz tumbler, mint) |
| `src/store/editor-store.ts` | Active page doc + undo, `pages`/`activePage` + page actions, `allPages`, assets, selection, view (incl. `rightInset` for the dock), dialogs (`mockup`, `viewer3d`), `leaveIntent`, `previewDock`, slot/process/sheet actions |
| `src/components/editor/EditorLayout.tsx` | Shell; first-run start dialog; mobile sheets (`useNarrower`) |
| `src/components/editor/PagesBar.tsx` | Floating page strip: thumbnails, add/duplicate/delete/resize page |
| `src/components/editor/LeaveDialog.tsx` | Save and open / Discard and open / Add to this sheet / Cancel |
| `src/components/editor/Header.tsx`, `Footer.tsx` | Top bar (File menu, sheet, process, undo, title, Download); bottom bar (usage %, zoom) |
| `src/components/editor/SidePanel.tsx` | Icon rail + panel (Products, Designs, Uploads, Layers, Sheet, Projects) |
| `src/components/editor/CanvasWorkspace.tsx` | Konva stage: handles, guides, gaps, slots, drops, space-pan, DPI badges, empty state |
| `src/components/editor/ImageLayer.tsx`, `PrintSheet.tsx`, `Rulers.tsx` | Design node (image/slot), sheet, rulers |
| `src/components/editor/QuickActionsBar.tsx`, `FloatingPill.tsx`, `CanvasContextMenu.tsx` | Contextual tools |
| `src/components/editor/PropertiesPanel.tsx` | Inspector (preview card, image, empty slot + sample strip, multi-select, sheet summary) |
| `src/components/editor/LayersPanel.tsx`, `ProjectsPanel.tsx`, `StartDialog.tsx`, `ShortcutsDialog.tsx`, `use-editor-shortcuts.ts` | Panels, dialogs, keyboard |
| `src/components/products/ProductMockup.tsx` | Original SVG product illustrations in any colour with a design (wrap strips, lighting, blend) |
| `src/components/products/MockupPreview.tsx` | `MockupDialog` (3D / Flat switch), `ProductSection`, `ColorSwatches`, `SampleStrip` |
| `src/components/products/LivePreviewDock.tsx` | Live preview docked on the canvas (colours, 3D, large preview, collapse) |
| `src/components/products/Product3D.tsx`, `Product3DView.tsx`, `Product3DDialog.tsx` | Lazy 3D viewer (renderer, studio light, orbit, adaptive backdrop, capture) and the catalogue 3D dialog |
| `src/components/products/*Panel.tsx`, `ProductArt.tsx`, `design-image.ts`, `sample-url.ts` | Products and Designs panels; `ProductArt` (rendered product picture, `productPhotoSrc`, `hasDetailPhoto`, `ProductDetail`); slot render for previews; blob-URL cache |
| `src/components/settings/*` | `SheetSelect` (dropdown), `SheetPanel`, `SheetDialog`, `DimensionControls`, `NumberField`, `Section` |
| `src/components/export/ExportDialog.tsx` | Export/print for all pages or one, page-by-page preview, preflight per page, mirror badge |
| `src/components/ui/*` | Radix/shadcn-style primitives incl. popover, context-menu, toolbar |
| `src/app/page.tsx`, `src/components/landing/*` | Simple server-rendered home page (hero, 3 steps, 8 templates, gallery, Sublimation vs DTF, FAQ, CTA); `HomeSections` (`ProcessCompare`, `Faq`, unused `FeatureGrid`), `photos.ts` |
| `public/products/` | 52 rendered product pictures and 9 detail crops (WebP) |
| `public/env/` | Studio HDRI for 3D lighting and reflections (CC0, Poly Haven) and `CREDITS.md` |
| `src/lib/landing/sheet-demos.ts` | Example sheets built with the real packer, margins and slot sizes |
| `src/lib/editor-link.ts` | `parseEditorLink` (`?sample`, `?product=`, `&process=`), `productHref` |
| `src/assets/photos/` | 13 landing photos (Unsplash/Pexels) and `CREDITS.md` |
| `tests/*` | Vitest suites incl. `v03-pages-mockups`, `v04-product-flow`, `v05-3d-models` (every product built in 3D), `v06-studio-home` (demo sheets, editor links) |
| `docs/` | Design doc, ADRs 0001–0012, `MUST-FIX.md` (audit backlog), learning path, printing guide, screenshots (`images/audit/` = audit evidence) |
| `scripts/ux-audit/` | `walk.js <w> <h> <tag>` (editor walkthrough + metrics), `mobile-probe.js` (phone download, preview, touch drag); Playwright, server on :3200, `OUT=<dir>`; not linted |

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

v0.4 phases (all done 2026-10-27):
- [x] R1 New design per product, save/discard dialog, "+" for gang sheets
- [x] R2 Live preview dock; sheet dropdowns; card visibility; canvas box labels
- [x] R3 Landing page with real photos, how-it-works, sublimation vs DTF

v0.5 phases (all done 2026-10-27):
- [x] S1 Procedural 3D models for every product, real size, realistic materials
- [x] S2 Viewer: studio lighting, soft shadow, orbit, auto-rotate, capture; adaptive backdrop
- [x] S3 Entry points: card 3D, dock 3D, 3D/Flat in the large preview, landing demo
- [x] S4 Quality: unit tests (all products built, sizes, contrast), browser render of every product

v0.6 phases (all done 2026-10-28):
- [x] T1 Studio tokens, nav, hero with a real-layout sheet
- [x] T2 Product showcase linked to templates (`?product=`), workflow, interactive sheet demo
- [x] T3 3D section (lazy), spec sheet, closing CTA, footer; responsive and reduced-motion checks

v0.7 phases (all done 2026-10-28):
- [x] U1 Rendered product pictures for all 52 templates, detail crops, `ProductArt` everywhere
- [x] U2 3D: toolbar (Front/Side/Back, zoom, full screen), on-demand rendering, rim light, supersampling, live 3D dock,
  back prints on the back (`side: "back"`), `frontAzimuth`
- [x] U3 "Night press" home page; README, CHANGELOG 0.7.0, ADR 0011, design doc 17-18

Next (v0.8 candidates, in suggested order):
0. **`docs/MUST-FIX.md`: P0 MF-01 to MF-06, then P1, then P2** (comes before everything below).
1. 3D realism: drinkware geometry done (ADR 0012). Next: re-render product pictures; garments, caps and totes
   (cloth geometry); Pacdora-style viewer functions (hi-res PNG export, 360° video export, Top/three-quarter views,
   backdrop picker); baked contact shadows and glaze/weave detail maps.
2. Move the picture render scripts into the repo (`scripts/`) so CI can check the pictures are current.
2. Playwright e2e in CI (port `v5func.mjs`; 3D needs SwiftShader flags).
3. Page reordering (drag in the page strip); page names.
4. DTF auto-pack with per-image quantity and 90° rotation; separate edge margin vs gap.
5. Text tool; simple shapes.
6. Arc/taper templates (12 oz latte mug, 40 oz tumbler bottom, tapered tumblers).
7. Background removal / colour knockout for DTF.
8. Photographic mockups; optional Pinterest import via the official API (user's own boards, needs OAuth + backend).

## 7. Known issues / to fix

- **UX and logic backlog: see `docs/MUST-FIX.md`** (24 items: data loss on import, no autosave, crowded canvas,
  squeezed tablet layout, modal phone sheets, tiny text and unnamed buttons, small touch targets, ...).

- Raster export of very long DTF sheets (22×60 in and longer at 300 DPI) exceeds browser canvas limits; PDF
  works. The export dialog explains it.
- Empty-slot labels are hidden on small boxes (only a "+" shows).
- Undo is per page; deleting a page cannot be undone (it asks first). Pages cannot be reordered yet.
- 3D models are procedural and stylised (no scanned textures); headless software rendering is slow (about 13 s
  per product), real GPUs are fast. Tapered latte mugs still have no template.
- The 3D dock rebuilds the model on the main thread when the design changes; under software WebGL (headless,
  machines without a GPU) that takes seconds, so the large preview opened 4+ s late in tests. Real GPUs are fast.
- Product pictures are not regenerated automatically; the render scripts live in the scratchpad, not the repo.
  They were rendered before the studio HDRI lighting and the ADR 0012 drinkware rebuild, so the 13 drinkware
  pictures show the old geometry (cone inside, wire handles) until re-rendered.
- The studio HDRI's floor is slightly blue, so black and dark blanks take a faint cool tint in 3D.
- Handled mugs open facing the print (centre 24° off-axis, `viewAzimuth` -1.15), so the handle is behind the body
  until the user turns the mug or auto-rotate runs. A centred emblem covers about 120° of a mug; showing both the
  whole print and the handle from one angle is not possible.
- `next start` survives TaskStop of its `npx` wrapper on Windows; after a rebuild, stop the node process that
  listens on port 3200 before starting a new server, or the old build keeps serving.
- Previews are illustrations; colours are approximate. Sample-design text relies on system fonts
  (Arial Black/Impact fallback) and is forced to width with `textLength`.
- Pinterest images are deliberately not used (copyright, terms of service); see ADR 0008.
- `package-lock.json` still names the package `tool-bar` 0.1.0 (pre-existing; harmless for `npm ci`).
- The quick-actions bar scrolls horizontally on narrow screens (by design).
- Tapered products are omitted (no arc templates yet).
- README badges assume GitHub repo `satyaidk/tool-bar` (no remote configured).
- `Sublimation & DTF images/` (33 third-party images) is in `.gitignore` but committed; remove it from git
  (`git rm -r --cached`) once the user agrees.
- `research_notes/` and `reports/` are in the repo root; decide with the user whether to keep them committed.

## 8. Update log

- **2026-10-29**: User: mobile and desktop UX is very bad; audit the whole code base and write a must-fix file, do
  not fix yet. Audited the production build in Playwright at 1440, 768 and 390 px (first run, sample, select, all
  panels, Download, product link, phone preview, touch drag, File menu) with metrics (overflow, controls under
  32 px, unnamed controls, text under 12 px), and read the editor, panel, product and dialog components, the store
  and `editor-actions.ts`. Wrote `docs/MUST-FIX.md`: 6 P0 (import replaces work without asking, no autosave, canvas
  crowded to 26 to 31 % zoom, tablet squeeze, modal phone sheets that block the header and ignore Escape, text under
  12 px on 240 elements and an unnamed phone Download button), 13 P1, 5 P2, each with evidence and an acceptance
  check. Evidence in `docs/images/audit/`, scripts in `scripts/ux-audit/` (excluded from ESLint). No app code changed.

- **2026-10-29**: User said the folder images are publicly available and approved them for the UI. Added six
  designs without characters, logos or people to `src/assets/designs/` (CREDITS.md) and a "Bring your own design"
  home section; character, brand and people images still declined (trademark/copyright, not only availability).

- **2026-10-29**: User found the "Night press" home page weird and asked for a simple, clean one using images from
  `Sublimation & DTF images/`. Re-checked all 33: characters (One Piece, Hello Kitty, Gundam, Tom & Jerry, Dragon
  Ball, Evangelion), car brands, a watermark, real faces; the text-only ones are still others' designs with no
  licence. Not used (rule 17). Note: the folder is ignored but its 33 files are committed; decide with the user
  whether to remove them from git. Done: new `page.tsx` with licensed photos and our renders, no client JS or scroll
  effects; removed 7 landing components and `demo-art.ts`. `npm run check` green (198 tests); screenshots at 1440
  and 390 px: no overflow, no console errors. `.home [data-reveal]`/`home-rise` CSS is now unused.

- **2026-10-28**: User sent 9 Pacdora screenshots (mugs, 40 oz handled tumbler) and asked for models as realistic,
  from open-source sources or Pacdora. Pacdora models are proprietary (image/video export only) and were not taken;
  Poly Haven has no matching models, the only free 40 oz mesh copies a trademark, stock meshes would not keep our
  print placement (ADR 0012). Rendered ours from Pacdora's angles and found: inside of every vessel was a cone
  (bug), wire handles with kinks, flat rims, wrong 40 oz lid/straw/handle. Done: `roundCorners`, filleted
  `vesselGeometry`, `sweepGeometry` + `handle`/`mugHandle`, rebuilt mug, enamel, espresso, skinny and 40 oz tumbler.
  Checked all 13 drinkware renders for regressions. Tests: flat-floor regression (verified it fails on the old code)
  and fillet maths. `npm run check` green (198 tests, 14 files; coverage 93.18 % lines, 91.26 % statements,
  81.01 % branches, 92.02 % functions). No dependencies added.

- **2026-10-28**: User compared our 3D models with Pacdora's mockups (pacdora.com) and asked to add them. Their
  models are proprietary and not downloadable (images/video only; a paid Editor API exists), so extracting them was
  declined. Agreed plan: (1) real studio HDRI lighting, (2) licensed glTF models for the weakest products, (3) baked
  contact shadows and detail maps. Done (1): `Product3DView` loads `public/env/studio_small_03_1k.hdr` (CC0, Greg
  Zaal) through `HDRLoader` + PMREM, rotation -0.8 rad, environment 0.7, key light 1.3; `RoomEnvironment` remains
  the fallback. Tried "Studio Small 09" first: its white cove washed glossy prints out. Tuned by before/after
  renders of the mug, 20 oz tumbler and T-shirt (white and black) in headless Chromium (SwiftShader, canvas
  readback). `npm run check` green (196 tests, 14 files; coverage 92.97 % lines, 90.97 % statements, 80.44 %
  branches, 91.81 % functions). No dependencies added.

- **2026-10-28**: v0.7.0. User asked to use images from a `Sublimation & DTF images` folder (33 files), replace
  flat product images with realistic previews, improve the 3D preview, and redesign the home page again. The
  folder holds third-party characters and trademarks (One Piece, Dragon Ball, Hello Kitty, Gundam, Tom & Jerry,
  Evangelion, Mercedes, Porsche, Nissan, Spotify UI), a watermark and real people's faces; declined, not used, and the
  user git-ignored it. Done instead: every product rendered from its own 3D model (52 WebP, 884 KB; 9 detail
  crops), `ProductArt` used by cards, lists and dialogs; dock shows the design in 3D; 3D toolbar and on-demand
  rendering; found and fixed back placements printed on the front; new "Night press" home page. Measured:
  `npm run check` green (196 tests, 14 files; coverage 92.97 % lines, 90.97 % statements, 80.44 % branches,
  91.81 % functions); `v6func.mjs` 32/32; `v5func.mjs` 48/48 (three old landing selectors updated, dock check now
  reads the 3D canvas, large-preview wait raised from 4 s to 30 s for software WebGL); no overflow or console errors
  at 1440 and 390 px. No dependencies added (Sora via `next/font`).

- **2026-10-28**: v0.6.0. User pasted a master prompt for a premium "print studio" home page (palette paper
  #F6F3ED, ink #22231F, lime #D7F36A, coral #F36B4F, stone #E9E3D9). Done: page rebuilt from scoped components;
  hero and demo sheets computed by the real packer; product tiles open templates via new `/editor?product=` links;
  interactive sheet demo uses `snapRect`/`measureGaps`/`sheetUtilisation`; 3D section loads lazily and offers only
  supported processes (the old demo allowed DTF on mugs). Found and fixed while verifying: lime highlight hid the
  "y" descender, mug photo hidden behind the sheet, tile sizes truncated, reveals skipped by fast jumps, a third A3
  keychain that did not fit (caught by a test). Measured: `npm run check` green (192 tests, 14 files; coverage
  92.96 % lines, 90.96 % statements, 80.25 % branches, 91.81 % functions); `v6func.mjs` 24/24; `v5func.mjs` 48/48
  (two old landing assertions updated to the new page); no overflow or console errors at 1440/1024/768/390/320 px.
  No dependencies added.

- **2026-10-27**: CI typechecking failed on a clean checkout because `next-env.d.ts` and route-aware helpers are
  generated and ignored. Updated `npm run typecheck` to run `next typegen` before `tsc --noEmit`, which also
  provides Next.js's ambient declarations for imported image assets. Verified with `npm run typecheck`.

- **2026-10-27**: User pasted `npm run dev` output with `THREE.WebGLProgram: Program Info Log: warning X4122 ...`
  from their browser. Cause: Chrome on Windows (ANGLE on Direct3D) returns HLSL constant-folding notes for
  three.js shadow shaders that link fine; three.js logs any non-empty program log. Headless checks use SwiftShader,
  which never logs it. Fix: `lib/three/driver-notes.ts` filters only Direct3D `warning X####` logs (tests use the
  user's exact log). Also fixed docs that said the dev server runs on port 3000; `npm run dev` uses 4000.
  `npm run check` green: 185 tests, 13 files; coverage 92.85 % lines, 90.82 % statements, 79.88 % branches.

- **2026-10-27**: v0.5.0. User asked for a realistic 3D viewer for every product with a colour-adaptive
  background. Done: procedural three.js models for all 52 products (lathed drinkware with handles/lids/straws,
  bevelled flat goods with real backs, padded cloth garments with drape, cap with decal print, tote, flag),
  ceramic/steel/glass/fabric/cork materials, process-aware print textures, `backdropFor` with a contrast test for
  every blank colour, catalogue 3D dialog, 3D in dock, large preview and landing demo; fixed focus leaking out of
  preview dialogs (Escape closed the side panel). three.js 0.186.1 (exact pin). Fixed after the first full render:
  a line across the floor (VSM frustum edge on the floor; floor is now a 3R disc inside a 3.3R shadow frustum,
  2048 px map) and mug prints facing sideways (camera now starts 24° off the print centre). Measured:
  `npm run check` green (182 tests, 13 files; coverage 92.82 % lines, 90.78 % statements, 79.68 % branches,
  91.51 % functions); `v5func.mjs` 48/48, no console errors; `v5all3d.mjs` 52/52 products rendered in one run,
  no console errors. Screenshots: `docs/images/3d-mug.png`, `3d-tee.png`, `3d-gallery.png`.
- **2026-10-27**: v0.4.0. User: "still not fixed": product switching merged designs, preview not found, cards
  looked empty, sheet chips hard to read, landing needed real photos. Done: new design per product + LeaveDialog,
  live preview dock, sheet dropdown, cards with close-ups and inch badges, canvas box labels, landing rebuilt with
  13 credited photos (one removed for a visible club crest). Browser: 43/43.
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
