# Sheetfit design document

Status: implemented in 0.1.0. Owner: satyaidk.

## 1. Problem

Small print businesses and hobbyists prepare sheets of designs for sublimation transfers, stickers, labels and cards. The task looks simple (put a 90 × 60 mm logo on an A4 sheet) but common tools make it error-prone:

- Image frames crop by default. A square logo dropped into a 90 × 60 mm frame loses its top and bottom without warning.
- Sizes drift. Screen zoom, export resolution and print-dialog scaling each change the physical size unless the tool keeps a physical model.
- Quality problems surface only on paper. A 300 × 200 px image printed at 100 mm wide looks pixelated, and nothing warned the user.

## 2. Goals and non-goals

Goals:

1. A design printed at the size the user typed, measured in millimetres on paper.
2. The whole image printed by default; cropping and distortion only by explicit choice.
3. Several designs per A4 sheet with fast layout tools that never resize to "make it fit".
4. Exports that are print-ready without further editing: exact-size PDF, high-resolution PNG and JPEG.
5. No account and no server: the user's images never leave the device.

Non-goals for 0.1: other paper sizes, multi-page documents, colour management (ICC profiles, CMYK conversion), text and shape editing.

## 3. Document model

```ts
EditorDocument = { page: PageSettings; designs: Design[] }
```

- `PageSettings`: orientation, margins (mm), background colour or transparent, export DPI, grid and snapping options, crop marks.
- `Design`: references an image asset and stores its **box**, the rectangle the user asked for: `x`, `y`, `width`, `height` (mm, top-left of the unrotated box), `rotation` (degrees, clockwise around the box centre), `fitMode`, alignment inside the box, padding, fill colour, aspect lock, border, optional crop insets, group and lock flags.
- Image assets keep the original `Blob`, decoded size and transparency flag. They are not part of the undoable document.

Array order is z-order (last is on top).

## 4. Coordinate system

- Page origin at the sheet's top-left, x to the right, y downward, units in millimetres, floating point.
- Rotation is around the box centre in every renderer. Bounds checks use the axis-aligned bounding box of the rotated box.
- Conversions live in `coordinate-conversion.ts`: `px = mm / 25.4 × dpi`, `pt = mm / 25.4 × 72`.
- Rounding happens once, when an export canvas is allocated (`pagePixelSize`). A4 at 300 DPI is 2480 × 3508 px.

On screen, 100% zoom means 96 CSS px per inch (3.78 px per mm). The workspace scales one Konva group by `zoom × 3.78`, so every node inside it is positioned in millimetres.

## 5. Fitting rules

Given the source size (after optional crop) and the padded box:

| Mode | Box | Image |
| --- | --- | --- |
| Fit entire image | As typed | `scale = min(boxW / srcW, boxH / srcH)`, aligned (centre by default) |
| Fit width | Width typed, height derived from the image | Fills the box |
| Fit height | Height typed, width derived from the image | Fills the box |
| Fill remaining space | As typed | As fit entire image, empty area painted with the fill colour |
| Manual scale | Hugs the image; corners scale proportionally | Fills the box |
| Stretch | As typed | Fills the box, aspect not preserved; requires confirmation |

Invariant, enforced by tests: in every mode except stretch, the image rectangle lies inside the box and has exactly the source aspect ratio. `describeFit` reports the printed image size and unused width or height so the interface can explain the result in words.

Typing a width with the aspect lock on derives the height from the **image** proportions, so a locked box always converges on one the image fills edge to edge.

## 6. Layout and snapping

- **Snapping** (`drag.ts`) proposes corrections to the dragged design's bounds against page centre, page edges, printable edges and other designs' edges and centres, within 6 screen pixels. Grid snapping replaces guide snapping when enabled. Alt bypasses snapping.
- **Constraint**: when "keep designs inside margins" is on, the final position is clamped into the printable area without resizing.
- **Grid repeat** (`arrangeGrid`) places copies left to right, top to bottom, and returns copies that do not fit; the store creates only the ones that fit and reports the rest.
- **Auto-arrange** (`packShelves`) is a shelf packer, tallest first, centred in the printable area. Unplaced designs are left where they were and selected. `suggestLayoutFixes` re-runs the packer with the other orientation, no spacing and no margins, and only suggests a change if it actually places more designs.

## 7. Rendering and export

```
EditorDocument + assets ──buildRenderPlan──▶ RenderPlan (mm, plain data)
                                              ├─ drawPlan (Canvas 2D) ─▶ PNG / JPEG / preview / print image / thumbnail
                                              └─ buildPdf (pdf-lib)    ─▶ PDF
```

Each plan item has a centre, a rotation and rectangles in local coordinates (origin at the box centre). Canvas rendering translates, rotates and draws. The PDF builder sets a transformation matrix per item mapping local millimetres to page points, so placement is exact and independent of DPI:

```
[a b c d e f] = [k·cos θ, −k·sin θ, k·sin θ, k·cos θ, k·cx, k·(H − cy)],  k = 72 / 25.4
```

PNG and JPEG sources are embedded byte-for-byte. WebP, and JPEGs with an EXIF rotation that PDF viewers would ignore, are converted once to lossless PNG at native resolution. Optional crops are applied with a clipping path, so the embedded data stays complete.

Raster exports stamp the DPI into the file (PNG `pHYs`, JPEG JFIF density) so RIP software and print drivers open them at the intended physical size.

## 8. Printing

Printing the live editor would leak zoom and screen resolution into the output. Instead, the sheet is rasterised from the render plan (up to 300 DPI), placed in a print-only element sized `210mm × 297mm`, and an injected `@page { size: A4 <orientation>; margin: 0 }` rule fixes the paper. Browsers still allow "Fit to page" in their dialogs, so the print dialog explains which settings to choose and recommends PDF for exact work.

## 9. Persistence

IndexedDB with two object stores: `projects` (small JSON records with a thumbnail) and `assets` (original blobs). Duplicated projects share asset blobs; deleting a project removes blobs no other project references. Quota and availability errors surface as messages that say what to do.

For portability, a `.sheetfit` project file contains the same record plus the original image bytes in base64. Imports receive a new project id so they never overwrite a saved project.

## 10. Quality checks

Effective DPI = source pixels ÷ printed inches, using the lower of the two axes and the cropped pixel count. Bands: 250 DPI and above is high, 150–249 acceptable, below 150 low. The interface states plainly that exporting at a higher DPI does not add detail.

## 11. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Print dialog scaling changes sizes | Explicit instructions; PDF recommended for exact work |
| Browser canvas limits at 600 DPI (Safari caps at about 16.7 MP) | Size check before allocation, probe pixel after allocation, clear error, PDF unaffected |
| Very large source images | Warning above 60 MP; originals are drawn directly, never resampled while editing |
| Rotated designs near edges | Bounds checks and clamping use rotated bounding boxes |
| Lost work | Unsaved-changes guard on page unload; explicit save to IndexedDB |

## 12. Testing strategy

- Pure modules are unit tested in Node, including every scenario from the product specification.
- The store is tested through its public actions.
- PDF output is parsed back with pdf-lib to verify page size; raster geometry is verified with a recording 2D context that tracks transforms.
- Canvas interaction, file upload, IndexedDB in a real browser and printing are verified end to end in headless Chrome against the production build. Automating those checks in CI is on the roadmap.
