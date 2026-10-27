# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.0] - 2026-10-27

### Added

- 3D model viewer for every product (52 presets, 33 shapes), built procedurally at real size with three.js:
  lathed mugs, tumblers, cans and bottles with handles, lids and straws; bevelled flat goods with cork, rubber,
  magnet or aluminium backs, rings and strings; padded cloth garments with drape folds; caps, totes and flags.
- Realistic materials: glazed ceramic, powder-coated and brushed steel, glass, fabric with sheen and a woven normal
  map, cork, aluminium; studio environment lighting and a soft floor shadow.
- The design is applied the way each process prints it: sublimation multiplies into the blank colour, DTF is an
  opaque film; bleed and seam overlap are cropped, and images of another shape are fitted whole.
- Backdrop that adapts to the blank colour for contrast (tested for every blank colour in the catalogue).
- Where to find it: "3D" on every product card (catalogue viewer with colours, process, sample designs, auto-rotate,
  reset and Save image), "3D" in the docked live preview, a 3D/Flat switch in the large preview, and a 3D view in
  the landing page demo. three.js loads only when a 3D view opens.
- ADR 0010.

### Fixed

- Preview dialogs opened without moving focus into them, so Escape also closed the side panel behind them.
- Chrome and Edge on Windows logged Direct3D shader compiler warnings (`warning X4122`) for every 3D view. These
  notes are harmless and are now filtered; real shader errors and other warnings still reach the console.

## [0.4.0] - 2026-10-27

### Added

- A new design per product: clicking a product card opens it on the sheet it needs, zoomed to the print area. If
  the current design has work, a dialog offers Save and open, Discard and open, Add to this sheet, or Cancel. File →
  New design, Open sample and Clear ask the same way. The "+" on a card still adds to the current sheet.
- Live product preview docked on the canvas, visible whenever the page has a product box, with blank colours.
- Sheet size dropdown, grouped into paper and DTF rolls, in the header, Sheet panel, start dialog and Sheet size
  dialog; a notice with Undo when designs end up off a smaller sheet.
- Product cards: stronger contrast and depth, size badges in inches, close-ups for small print areas.
- Empty product boxes on the canvas show the product, its exact size and how to fill them.
- Landing page redesign with real photos of sublimated and DTF-printed products (Unsplash and Pexels, credited), a
  four-step "how it works" with an interactive product preview, and a sublimation versus DTF comparison.
- ADR 0009.

### Fixed

- The floating selection toolbar overlapped the quick-actions bar when a design filled the canvas.
- The header sheet button showed the portrait size of a landscape page.

## [0.3.0] - 2026-10-27

### Fixed

- Adding a template that did not fit the sheet offered to switch the whole sheet (for example to A3), which moved
  every other design onto the new sheet. Templates now go into the first free spot on the current page, or get a
  new page with the sheet (and process) they need; a page that already holds work never changes sheet.
- New templates no longer land on top of existing designs.
- Browser printing used `@page { size: A4 }` for every sheet; each page now prints at its own size.
- The properties panel's sheet summary always said "A4".
- Side panels and the properties panel were mounted twice (desktop and hidden mobile copy), doubling render work.

### Added

- Pages: a page strip under the canvas with live thumbnails, add (same or chosen sheet), duplicate, delete,
  Page Up / Page Down, and "Move to page" in the right-click menu. Each page has its own sheet and undo history.
- Download and print all pages or the current one: one multi-page PDF with each page at its own size, one PNG or
  JPEG per page, and a pre-print check per page.
- Product previews: live preview card in the properties panel and a preview dialog with blank colours, turning
  mugs and tumblers around, print-area outline, and a 1600 × 1600 px PNG download. Sublimation previews blend with
  the blank colour and warn on dark blanks.
- Sample designs: original emblems and patterns generated in the browser, shown on the product cards (a new mix
  every time the panel opens, plus Shuffle), in a new Designs panel and in the properties panel of empty boxes.
- Product cards redesigned with coloured blanks and sample designs, category chips, and a badge that says when a
  product will open a new page. The landing page shows the same mockups.
- The sample project has a second, A3 page with a 30 oz tumbler.
- ADR 0008.

### Changed

- Product illustrations redrawn with lighting, blank colours and real aspect ratios for flat goods.
- New products start in the top-left corner of the printable area.

## [0.2.0] - 2026-10-27

Redesign based on cited research into Canva's editor and into sublimation and DTF product sizes
(`reports/Canva UX and print size catalogue.md`).

### Added

- Product catalogue: 52 sublimation and DTF templates (drinkware wraps, flat goods, apparel placements,
  accessories) with sizes, bleed or seam overlap, source links, confidence levels and original reference
  illustrations. Templates become empty product boxes that images are dropped into.
- Sheets beyond A4: US Letter, US Legal, A3, A3+, 22 in DTF gang sheets, a 13 in roll and custom sizes, with a
  Canva-style Sheet size dialog. Templates that do not fit offer the smallest sheet that holds them.
- Print process switch (sublimation / DTF) with output mirroring applied to PDF, PNG, JPEG and print.
- Per-design flip, distribute, drag-to-reorder layers, lock from the canvas, Tab to cycle designs.
- Canva-structured editor: icon rail with one panel, quick-actions bar that follows the selection, floating
  selection pill, right-click menu, properties inspector, zoom footer with slider and sheet usage.
- Live millimetre gaps while dragging, magenta snap guides, round and pill resize handles, space-drag panning,
  zoom to selection, low-DPI badges on the canvas.
- Pre-print check in the export dialog (off-sheet, margins, overlap, low DPI, stretched, empty boxes) with
  click-to-select.
- "What are you printing?" start dialog, keyboard shortcuts sheet (`?`), drag images from Uploads onto the
  sheet or into a box, "sharp up to" size on upload thumbnails.
- New landing page with the product catalogue.
- AGENTS.md as the living project report; ADR 0007.

### Changed

- New visual system: light chrome, teal accent, Figtree, dot-grid canvas, 4/8/12 px radii, fast ease-out motion.
- `a4-layout.ts` became `sheet-layout.ts`; the document stores `sheet`, `process` and `mirrorOutput`, and designs
  store `productId`, `bleed`, `flipX`, `flipY`, and a nullable `assetId`. v0.1 projects are migrated on load.
- The view refits when panels open or close, until the user pans or zooms.


## [0.1.0] - 2026-10-26

### Added

- A4 sheet editor with portrait and landscape orientation, per-side margins, printable-area guide, millimetre rulers, grid, and snapping to the page, margins and other designs.
- Image upload for PNG, JPEG and WebP by file picker, drag and drop, or clipboard paste, with transparency detection and file validation.
- Non-cropping fitting engine with six modes: fit entire image (default), fit width, fit height, fill remaining space, manual scale, and stretch (with confirmation).
- Measurement inputs in mm, cm, inches and pixels, size presets, aspect-ratio lock, padding, alignment inside the box, rotation and optional non-destructive cropping.
- Multiple designs per sheet: duplicate, copy and paste, multi-select, grouping, alignment, layer order, grid repeat with capacity reporting, and auto-arrange without overlap.
- Print-quality indicator based on effective DPI at the printed size.
- Exports: exact-size A4 PDF with vector placement and unrecompressed PNG/JPEG sources; PNG and JPEG at 150, 300 or 600 DPI with DPI metadata; optional crop marks and cut-line borders.
- Browser printing at actual size with A4 `@page` rules and print-dialog guidance.
- Local projects in IndexedDB: save, open, duplicate, delete, with thumbnails.
- Portable `.sheetfit` project files that embed the original images, for reopening on another computer.
- Undo and redo, keyboard shortcuts, and an unsaved-changes guard.
- Responsive layout with bottom-sheet panels on small screens.
- Unit test suite (Vitest), CI workflow, design document and ADRs.
