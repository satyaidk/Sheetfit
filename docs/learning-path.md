# Learning path

Start with [`AGENTS.md`](../AGENTS.md): it is the living report of what exists, what is in progress and where everything lives.

A reading order through the codebase for someone new to it, or new to building editors. Each step lists what to read, what to notice, and a small exercise. Plan on two to four hours in total.

## 1. The problem in physical units

Read: [`src/types/editor.ts`](../src/types/editor.ts), [`src/lib/layout/coordinate-conversion.ts`](../src/lib/layout/coordinate-conversion.ts), [ADR 0001](adr/0001-millimetres-as-the-document-unit.md).

Notice: the document never stores pixels. A 90 × 60 mm design is 1063 × 709 px at 300 DPI and 340 × 227 px on screen at 100% zoom, but it is always `width: 90, height: 60` in the data.

Exercise: in `tests/units-resolution.test.ts`, add a test that converts A4 to pixels at 72 DPI and check it against a calculator.

## 2. The fitting engine

Read: [`src/lib/image/image-fit.ts`](../src/lib/image/image-fit.ts) and [`tests/image-fit.test.ts`](../tests/image-fit.test.ts), then [ADR 0002](adr/0002-contain-by-default-never-crop.md).

Notice: `fitContain` is two lines of maths. Most of the module is about stating the result honestly (`describeFit`) and about the aspect lock using the image's proportions, not the box's.

Exercise: add a "fill and crop" mode in a branch. Watch the "never places pixels outside the box" test fail, and read why the product keeps cropping as a separate, explicit control.

## 3. Geometry on the sheet

Read: [`sheet-layout.ts`](../src/lib/layout/sheet-layout.ts), [`alignment.ts`](../src/lib/layout/alignment.ts), [`drag.ts`](../src/lib/layout/drag.ts), [`auto-arrange.ts`](../src/lib/layout/auto-arrange.ts).

Notice: rotation happens around the box centre everywhere, and every bounds check uses the rotated bounding box (`designBounds`). Snapping thresholds are in screen pixels, converted to millimetres with the zoom, so snapping feels the same at any zoom.

Exercise: make `packShelves` try rotating a design by 90° when it does not fit, and add tests. (This is on the roadmap.)

## 3b. Sheets and products

Read: [`sheets.ts`](../src/lib/catalogue/sheets.ts), [`products.ts`](../src/lib/catalogue/products.ts), [ADR 0007](adr/0007-sheets-process-and-product-slots.md).

Notice: product sizes are data with a source URL and a confidence flag. `slotSize` adds bleed for flat goods and seam overlap for wraps, and `smallestSheetFor` drives the "switch to A3" suggestion.

Exercise: add a product preset for a blank you own, measure its print area, and check that `minSheetFor` picks the sheet you expect.

## 3c. Pages and product placement

Read: [`product-placement.ts`](../src/lib/layout/product-placement.ts), [`free-spot.ts`](../src/lib/layout/free-spot.ts), the page actions in [`editor-store.ts`](../src/store/editor-store.ts) (`addPage`, `switchPage`, `allPages`), [ADR 0008](adr/0008-pages-previews-and-sample-designs.md).

Notice: the active page lives in `doc`, `past` and `future`, exactly as before pages existed, so most of the editor never needed to change. Switching pages swaps those three fields with the stored page. Placement is a pure function of a page and its designs, which is why the "A3 takes over my A4 designs" bug could be fixed and tested without a browser.

Exercise: make `findFreeSpot` prefer the spot that leaves the largest empty rectangle, and compare the result on the sample sheet.

## 3d. Product previews

Read: [`ProductMockup.tsx`](../src/components/products/ProductMockup.tsx) and [`design-image.ts`](../src/components/products/design-image.ts).

Notice: a mug preview is plain SVG. The design is cut into 28 strips whose widths follow sin θ, which is all it takes to make a flat image look wrapped around a cylinder.

Exercise: add a highlight that moves with the turn slider.

## 4. One render plan, many outputs

Read: [`render-plan.ts`](../src/lib/render/render-plan.ts), [`rasterize.ts`](../src/lib/export/rasterize.ts), [`export-pdf.ts`](../src/lib/export/export-pdf.ts), [`dpi-metadata.ts`](../src/lib/export/dpi-metadata.ts), [ADR 0003](adr/0003-shared-render-plan.md) and [ADR 0005](adr/0005-pdf-lib-vector-placement.md).

Notice: the PDF transformation matrix is derived once in `itemMatrix` and tested by mapping a known corner to known PDF points. The PNG export writes its DPI into a `pHYs` chunk with a CRC you can verify by hand.

Exercise: open an exported PDF in a text editor (or with `pdf-lib` in Node) and find the `cm` operator for one design. Check the numbers against `itemMatrix`.

## 5. State and history

Read: [`src/store/editor-store.ts`](../src/store/editor-store.ts) and [`tests/editor-store.test.ts`](../tests/editor-store.test.ts).

Notice: every undoable change goes through `commitDoc`, which pushes the previous document. Assets and UI state (zoom, selection) are deliberately outside history.

Exercise: make "rename design" not create an undo step for every keystroke, by committing only on blur.

## 6. The interactive canvas

Read: [`CanvasWorkspace.tsx`](../src/components/editor/CanvasWorkspace.tsx), [`ImageLayer.tsx`](../src/components/editor/ImageLayer.tsx), [ADR 0004](adr/0004-konva-for-the-editor-canvas.md).

Notice: one Konva group is scaled to millimetres, so nodes use document values directly. During a drag, positions are resolved on every move but committed once on release. During a resize, Konva scales the group and the node counter-scales the image so it is never shown stretched.

Exercise: add a keyboard shortcut that rotates the selection by 90°.

## 7. Persistence and files

Read: [`project-storage.ts`](../src/lib/storage/project-storage.ts), [`project-file.ts`](../src/lib/storage/project-file.ts), [`editor-actions.ts`](../src/lib/editor-actions.ts), [ADR 0006](adr/0006-client-only-with-indexeddb.md).

Notice: tests run IndexedDB code in Node with `fake-indexeddb`. Errors are translated into messages a user can act on, for example a full storage quota.

## 8. Printing

Read: [`print.ts`](../src/lib/export/print.ts), the `@media print` block in [`globals.css`](../src/app/globals.css), and the [printing guide](printing-guide.md).

Exercise: print the sample sheet at 100% and measure the 90 mm box with a ruler. Then print with "Fit to page" and measure again.
