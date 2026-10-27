<div align="center">

<img src="docs/images/logo.svg" alt="Sheetfit logo" width="72" height="72" />

# Sheetfit

**A Canva-style editor for sublimation and DTF print sheets. Every design printed whole, at its true size.**

[![CI](https://github.com/satyaidk/tool-bar/actions/workflows/ci.yml/badge.svg)](https://github.com/satyaidk/tool-bar/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%E2%89%A520.9-339933?logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Coverage](https://img.shields.io/badge/coverage-90%25%20lines-18804a)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Overview](#overview) · [Features](#key-features) · [Architecture](#architecture) · [Getting started](#getting-started) · [Testing](#testing--quality) · [Design decisions](#design-decisions-adrs) · [Docs](#documentation) · [Status](AGENTS.md)

<img src="docs/images/editor.png" alt="Sheetfit editor: product cards with sample designs on coloured blanks, an A4 page holding an 11 oz mug wrap, two coasters, a magnet and an empty pet-tag box, a page strip with a second A3 page, and a live mug preview in the properties panel" width="900" />

</div>

## Overview

Sheetfit is a browser-based layout editor for sublimation and DTF printing. You pick what you are printing (an 11 oz mug wrap, a 20 oz tumbler, a left-chest transfer, or any custom size), drop images into product templates at their real print size, and arrange them on a sheet: A4, A3, US Letter, US Legal, A3+ or a 22 in DTF gang sheet. The output is a print-ready PDF, PNG or JPEG in which every design has exactly that physical size and position, mirrored for sublimation transfers and left unmirrored for DTF.

A project can have several pages, and each page keeps its own sheet: a 30 oz tumbler wrap that needs A3 gets an A3 page of its own while the mug and coasters stay on A4. Every product box can be previewed on the product itself, in any blank colour, with the design wrapped around mugs and tumblers.

The editor follows the structure of Canva's: an icon rail with one panel, a quick-actions bar that follows the selection, a floating pill next to the selection, a right-click menu, and a zoom footer. It adds the print-specific tools Canva does not have, based on [published research](reports/Canva%20UX%20and%20print%20size%20catalogue.md): live millimetre gaps while dragging, effective-DPI badges, a pre-print check, and a sheet-usage readout.

General-purpose design tools usually treat a sized image frame as a crop window (`object-fit: cover`), which silently cuts off the edges of a logo when its proportions differ from the frame. Sheetfit does the opposite by default: the whole image is fitted inside the requested box, the proportions are preserved, and any leftover space is measured and reported. Distortion and cropping exist, but only as explicit, opt-in actions.

Everything runs in the browser. There is no account, no server and no upload: images and saved projects stay in the user's browser (IndexedDB).

## Key features

- **Non-cropping fitting engine.** Six modes: fit entire image (default), fit width, fit height, fill remaining space with a colour, manual scale, and stretch. Stretch requires confirmation; cropping is a separate switch that is off by default and never alters the source file.
- **Physical units throughout.** The document model is millimetres. Inputs accept mm, cm, inches or pixels (at the export DPI), with an aspect-ratio lock that derives the other side from the image.
- **52 product templates.** Mugs, tumblers, cans, bottles, coasters, mouse pads, ornaments, tags, cards, panels, puzzles, plates, and T-shirt, hoodie, kids, cap and tote placements. Sizes come from blank suppliers and DTF placement guides, each with its source and a confidence level, and stay editable. Each card shows an original illustration of the product in a blank colour with a sample design on it, and a new mix of designs appears every time the panel opens.
- **Product boxes.** A template becomes an empty box at its print size (with bleed for flat goods and seam overlap for wraps); drop an image onto it, or pick one from Uploads, and it is fitted whole.
- **Pages, each with its own sheet.** A4, US Letter, US Legal, A3, A3+ and 22 in DTF gang sheets, or a custom size, per page. A template goes into the first free spot on the current page; one that is too big, or printed with the other process, gets a new page with the smallest sheet that holds it, so other designs never change sheet. Pages can be added, duplicated and deleted from the page strip, and designs moved between them from the right-click menu.
- **Product previews.** See a product box on the mug, tumbler, shirt, cap or tote in any blank colour, turn a wrap around 360°, show the print area, and download the preview as a 1600 × 1600 px PNG for a customer. Sublimation previews blend the design with the blank colour (the dye is transparent) and warn on dark blanks; DTF previews print opaque.
- **Sample designs.** Original emblems and patterns generated in the browser (no network, free to print), redrawn at the shape of the selected box. Fill a product box with one click from the Designs panel or the properties panel.
- **Processes.** Sublimation turns output mirroring on; DTF turns it off.
- **Canva-style editing.** Round and pill resize handles, magenta snap guides, live gap measurements in mm, space-drag panning, Shift+2/3 zoom to sheet or selection, a layers panel with drag-to-reorder, flip, distribute, group, lock, and Canva's keyboard shortcuts (`?` shows them all).
- **Sheet tools.** Portrait and landscape, per-side margins, printable-area guides, millimetre rulers, an optional grid, crop marks, and an option that keeps designs inside the margins.
- **Multiple designs per sheet.** Duplicate, copy and paste, multi-select, group, align, repeat a design in a grid ("fill sheet"), and auto-arrange mixed sizes without overlap. Layouts never resize anything; if designs do not fit, the editor says how many were left over and which change (orientation, spacing, margins) would help, checked by re-running the layout.
- **Print-quality checks.** Effective DPI for each design at its printed size in the quick-actions bar and on the canvas, plus a pre-print check before export that lists designs off the sheet, in the margins, overlapping, low-resolution, stretched or still empty. Click an issue to select the design.
- **Exports.** One PDF with a page per project page, each at its exact sheet size (A4 is 595.276 × 841.890 pt), with designs placed as vectors and PNG/JPEG sources embedded without recompression; PNG with transparency and JPEG at 150, 300 or 600 DPI with the DPI written into the file metadata, one file per page. All pages or only the current one.
- **Browser printing at actual size.** A print-only render with one CSS named `@page` per sheet size and zero margins, and step-by-step guidance for the print dialog.
- **Local projects.** Save, reopen, duplicate and delete projects in IndexedDB, including the original image files, or export a portable `.sheetfit` project file to continue on another computer.

## Demo

| Tumbler preview, turned 160° | T-shirt preview on navy (DTF) | A3 page for the tumbler |
| --- | --- | --- |
| <img src="docs/images/mockup.png" alt="Product preview dialog: a 30 oz skinny tumbler in mint with a daisy pattern wrapped around it, blank colour swatches and a turn slider" width="300" /> | <img src="docs/images/mockup-tee.png" alt="Product preview dialog: a navy T-shirt with a full-front sunset badge" width="300" /> | <img src="docs/images/pages.png" alt="Page 2 of the sample, an A3 sheet holding the tumbler wrap, with the page strip below" width="300" /> |

| Product templates | Empty box with sample designs | Start dialog |
| --- | --- | --- |
| <img src="docs/images/products-panel.png" alt="Apparel product cards: T-shirts, hoodies and kids' tees in different colours with sample designs" width="300" /> | <img src="docs/images/product-slot.png" alt="Selected empty pet-tag box with its preview, sample designs in the properties panel and the Designs panel open" width="300" /> | <img src="docs/images/start-dialog.png" alt="What are you printing? dialog with process, sheet and starter products" width="300" /> |

| Download every page | Mobile | Landing page |
| --- | --- | --- |
| <img src="docs/images/export-dialog.png" alt="Download dialog with All 3 pages selected, a page-by-page preview and the pre-print check" width="300" /> | <img src="docs/images/mobile.png" alt="Editor on a phone with the page strip and bottom tab bar" width="160" /> | <img src="docs/images/landing.png" alt="Landing page" width="300" /> |

Run the app locally and open `/editor?sample` for the sample project. Page 1 (A4) holds an 11 oz mug wrap with a very wide wordmark, two coasters with a round logo, a magnet with a 300 × 200 px photo that triggers the low-resolution warning, and an empty pet-tag box. Page 2 (A3) holds a 30 oz tumbler wrap with a sample pattern on a mint blank.

## Architecture

```mermaid
flowchart LR
  subgraph UI["React UI (client only)"]
    WS[CanvasWorkspace<br/>react-konva]
    PP[Properties and sidebar panels]
    ED[Export / print dialog]
  end
  ST[(Zustand store<br/>pages in mm,<br/>undo history per page)]
  subgraph LIB["Pure domain modules (unit tested)"]
    FIT[image-fit<br/>fitting engine]
    LAY[sheet-layout, product-placement,<br/>alignment, auto-arrange, drag]
    RES[image-resolution]
    PLAN[render-plan]
  end
  subgraph OUT["Output adapters"]
    RAS[rasterize<br/>Canvas 2D]
    PDF[export-pdf<br/>pdf-lib]
    PRN[print]
  end
  IDB[(IndexedDB<br/>projects + image blobs)]

  WS --> ST
  PP --> ST
  ST --> FIT & LAY & RES
  ST --> PLAN
  PLAN --> RAS --> ED
  PLAN --> PDF
  RAS --> PRN
  ST <--> IDB
```

Three rules hold the design together:

1. **One coordinate system.** The document stores millimetres. Pixels and PDF points appear only at the edges, in [`coordinate-conversion.ts`](src/lib/layout/coordinate-conversion.ts), and rounding to whole pixels happens only when an export canvas is allocated.
2. **One render plan.** [`render-plan.ts`](src/lib/render/render-plan.ts) turns the document into plain data. The PNG, JPEG, PDF, print and preview paths all draw from it, so the export preview is the export.
3. **Pure rules, thin UI.** Fitting, layout, snapping, quality and export geometry are pure TypeScript with no React or DOM dependency, which is why they can be tested exhaustively in Node.

See [docs/design.md](docs/design.md) for the full design document.

## Getting started

### Prerequisites

- Node.js 20.9 or newer (developed on Node 24)
- npm 10 or newer
- A Chromium-based browser, Firefox or Safari

### Install

```bash
git clone https://github.com/satyaidk/tool-bar.git
cd tool-bar
npm ci
```

### Configure

No configuration or environment variables are required. The app has no backend and makes no network requests at runtime beyond loading its own assets.

### Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
```

## Usage

1. Open `/editor`. On first visit, **What are you printing?** asks for the process (sublimation or DTF), the sheet, and optionally a starter product.
2. Open **Products** and click a template, such as **Mug 11 oz, full wrap** or **T-shirt, full front**. An empty box appears at the product's print size in the first free spot. On an empty page the page takes the sheet the product needs; if the current page already holds work and the product does not fit, it gets a new page with the right sheet (the card's badge says so before you click).
3. Drop an image onto the box, drag one from **Uploads**, click **Add image** in the quick-actions bar, or pick a sample from **Designs**. The image is fitted whole; nothing is cropped.
4. Click **Preview** in the quick-actions bar to see the design on the product. Pick a blank colour, turn a mug or tumbler around, and download the preview.
5. For any other size, use **Custom size** in Products, or drop images straight onto the sheet. They are placed at their native size at 300 DPI.
6. Switch pages in the strip under the canvas (Page Up / Page Down). Arrange with drag (live gaps in mm), arrow keys (1 mm, Shift for 10 mm), the **Position** menu, **Arrange all**, or **Repeat on sheet** in the properties panel.
7. Check the DPI badge in the quick-actions bar, then click **Download** for PDF, PNG, JPEG or a `.sheetfit` file, or **Print**, for all pages or the current one. The pre-print check lists anything that would spoil the print, page by page.

Press `?` for every keyboard shortcut.

## Project structure

```text
src/
  app/                    Next.js App Router pages (landing, /editor)
  components/
    editor/               Shell: header, side rail and panels, canvas, quick bar, pill, inspector, footer, dialogs
    products/             Product templates, product mockups and previews, sample designs panel
    settings/             Measurement fields, size and fitting controls, page settings
    uploads/              Upload panel and thumbnails
    export/               Export and print dialog
    ui/                   shadcn/ui-style primitives on Radix
  lib/
    catalogue/            Sheets, the 52 product presets (sizes, bleed, sources), blank colours, sample designs
    image/                Fitting engine, resolution checks, file decoding
    layout/               Units, sheet geometry, product placement, alignment, snapping, gaps, auto-arrange
    render/               Render plan shared by every output
    export/               Canvas rasteriser, PDF builder, DPI metadata, pre-print check, printing
    storage/              IndexedDB persistence, .sheetfit files, migrations
  store/                  Zustand editor store
  types/                  Document, image and project types
tests/                    Vitest unit tests
docs/                     Design document, ADRs, learning path, images
reports/                  Research report behind the v0.2 redesign and catalogue
AGENTS.md                 Living project report: status, plan, file map, update log
```

## Testing & quality

```bash
npm run lint           # ESLint (Next.js core-web-vitals + TypeScript rules)
npm run typecheck      # tsc --noEmit, strict mode
npm test               # Vitest
npm run test:coverage  # Vitest with V8 coverage and thresholds
npm run check          # all of the above plus a production build
```

The suite has 164 tests across fitting, units, sheets, the product catalogue, product placement and free-spot search, pages with per-page history, layout, snapping, live gaps, distribution, auto-arrange, the render plan with mirroring and flips, single- and multi-page PDF export, print page rules, DPI metadata, the pre-print check, sample designs, blank colours, file validation, migrations, IndexedDB storage, project files and the editor store. It includes every scenario listed in the original specification, for example a square logo in a 90 × 60 mm box, an extremely wide logo, a low-resolution image at 300 DPI, A4 portrait and landscape PDFs, and an image placed at a known coordinate. A property-style test checks that no non-distorting mode ever places image pixels outside the box.

Coverage is measured over the domain, export and store layers (`src/lib`, `src/store`), excluding browser-only glue that needs a real DOM canvas: 90.4% of lines, 87.6% of statements and 76.1% of branches. CI enforces minimums of 80% lines, statements and functions and 65% branches.

Browser-only paths (Konva interaction, canvas export, file upload, IndexedDB round trip, printing, previews) were verified end to end in headless Chrome against the production build: 39 scripted checks, all passing, with no console errors. See [Evaluation](#evaluation).

## Evaluation

Measured in headless Chrome against `npm run build && npm run start`, on the sample sheet:

| Check | Result |
| --- | --- |
| PDF page size | 1 page, 595.276 × 841.890 pt = 210.000 × 297.000 mm |
| PNG export at 300 DPI | 2480 × 3508 px, pHYs chunk reads 300 DPI |
| Square logo in a 90 × 60 mm box | Prints at 60 × 60 mm, 15 mm spare each side, nothing cropped |
| Full-page PNG uploaded onto a 5 mm-margin sheet | Placed at 200 × 282.9 mm, whole, inside the 200 × 287 mm printable area |
| Drag, undo, typed sizes, save and reopen | Behave as expected; no console errors |
| `.sheetfit` export and re-import | Same designs restored with original image bytes |
| v0.2: sample sheet on A4 landscape | PDF 297.00 × 210.00 mm; PNG 3508 × 2480 px at 300 DPI; preview mirrored for sublimation |
| v0.2: switch to DTF, then undo | Mirroring turns off, then back on |
| v0.3: A4 page with a mug and a coaster, then add a 30 oz tumbler | Tumbler gets page 2 on A3 (297 × 420 mm); page 1 stays A4 landscape with its designs unchanged |
| v0.3: add a round coaster while on page 1 | Placed in a free spot on page 1, no new page |
| v0.3: download all pages as PDF | One PDF, 2 pages: 297.0 × 210.0 mm and 297.0 × 420.0 mm |
| v0.3: download all pages as PNG at 300 DPI | Two files: 3508 × 2480 px and 3508 × 4961 px |
| v0.3: print all pages | Two images with named `@page` rules of 297 mm × 210 mm and 297 mm × 420 mm |
| v0.3: product preview of the tumbler | Wrap drawn as 28 curved strips; colour, turn and print-area controls work; preview PNG is 1600 × 1600 px |
| v0.3: duplicate and delete pages, save and reopen | Page count and sheets restored; project list shows "2 pages" |
| v0.2: fill an empty product box, save, reopen | Box filled through the inspector; all designs restored; no console errors |
| Mobile viewport (390 × 844) | No horizontal overflow |

## Design decisions (ADRs)

| ADR | Decision |
| --- | --- |
| [0001](docs/adr/0001-millimetres-as-the-document-unit.md) | Millimetres are the only unit stored in the document |
| [0002](docs/adr/0002-contain-by-default-never-crop.md) | Fit inside the box by default; distortion and cropping are opt-in |
| [0003](docs/adr/0003-shared-render-plan.md) | Every output draws from one shared render plan |
| [0004](docs/adr/0004-konva-for-the-editor-canvas.md) | Konva (react-konva) for interactive editing |
| [0005](docs/adr/0005-pdf-lib-vector-placement.md) | pdf-lib with vector placement for PDF export |
| [0006](docs/adr/0006-client-only-with-indexeddb.md) | Client-only app with IndexedDB persistence |
| [0007](docs/adr/0007-sheets-process-and-product-slots.md) | Sheets as data, process-driven mirroring, product slots |
| [0008](docs/adr/0008-pages-previews-and-sample-designs.md) | Pages with their own sheets, product previews, generated sample designs |

## Documentation

- [AGENTS.md](AGENTS.md): living project report (status, plan, file map, update log); read this first
- [Research report](reports/Canva%20UX%20and%20print%20size%20catalogue.md): Canva-style editor UX and the cited product size catalogue
- [Design document](docs/design.md): goals, model, fitting rules, coordinate system, export pipeline, risks
- [Learning path](docs/learning-path.md): a guided reading order through the code for new contributors
- [Printing guide](docs/printing-guide.md): getting exact physical sizes on paper
- [Architecture decision records](docs/adr/)

## Roadmap

- Text tool and simple shapes
- Arc templates for tapered products (12 oz latte mug, tapered tumblers)
- Auto-pack with per-image quantities and 90° rotation for DTF gang sheets
- Background removal and colour knockout for DTF artwork
- Photographic product mockups (displacement maps for fabric folds)
- Optional import from the user's own Pinterest boards through Pinterest's official API (needs an OAuth app and a small backend)
- Browser end-to-end tests in CI (Playwright) for the canvas interactions verified manually today

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, coding conventions and the checks a pull request must pass.

## Security

Sheetfit processes files locally and has no server. To report a vulnerability, follow [SECURITY.md](SECURITY.md).

## License

Released under the [MIT License](LICENSE).

## Acknowledgements

- [Next.js](https://nextjs.org/), [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- [Konva](https://konvajs.org/) and [react-konva](https://github.com/konvajs/react-konva) for the canvas editor
- [pdf-lib](https://pdf-lib.js.org/) for PDF generation
- [Radix UI](https://www.radix-ui.com/) primitives in the style of [shadcn/ui](https://ui.shadcn.com/), and [Lucide](https://lucide.dev/) icons
- [Zustand](https://zustand.docs.pmnd.rs/), [idb](https://github.com/jakearchibald/idb) and [Vitest](https://vitest.dev/)
- The [Figtree](https://fonts.google.com/specimen/Figtree) typeface by Erik Kennedy
