# Engineering audit (v0.9, with the v0.10 UX audit)

Date: 2026-11-23. Scope: the five reported issues (output mirror, PVC card front and back, card spacing and cut
guides, Auto Arrange, fill and crop in a fixed box), the product catalogue, a new sticker workflow, and the systems they
touch. Branch `dev`, starting at commit `9742a28` with only `package.json` and `package-lock.json` modified (left as
they were).

## 1. Baseline

| Check | Result before any change |
| --- | --- |
| `npm run check` as found | Failed in `eslint`: `node_modules/hermes-parser` was missing `dist/generated/ParserVisitorKeys.js` |
| Typecheck as found | Failed: `lucide-react` had no `.d.ts`, `@types/node` and `@types/three` were partial |
| Cause | A corrupted `node_modules` install, not the code. `npm ci` (from the existing lockfile; `package.json` and `package-lock.json` byte-identical before and after) fixed it |
| After `npm ci`, at `HEAD` (checked in a separate worktree) | lint 0 problems, `tsc --noEmit` 0 errors, 216 / 216 tests passing |

## 2. Architecture map (as found)

| Layer | Files | Role |
| --- | --- | --- |
| Document model | `src/types/editor.ts` | `PageSettings` and `Design` in millimetres; `EditorDocument` is one page |
| State | `src/store/editor-store.ts` | Active page (`doc`, `past`, `future`), other pages in `pages`, assets, selection, dialogs |
| Pure geometry | `src/lib/image/image-fit.ts`, `src/lib/layout/*` | Fitting, bounds, snapping, packing, product placement |
| Render plan | `src/lib/render/render-plan.ts` | One description of the sheet that every output draws |
| Outputs | `src/lib/export/export-pdf.ts` (vector), `rasterize.ts` (PNG, JPEG, preview, print), `print.ts` (print via raster) | Draw the plan |
| Persistence | `src/lib/storage/*` | IndexedDB, `.sheetfit` files, `migrate.ts` on every load |
| Canvas | `src/components/editor/CanvasWorkspace.tsx`, `ImageLayer.tsx` | Konva stage, gestures |
| 3D and mockups | `src/lib/three/*`, `src/components/products/*` | Previews; print textures come from `design-image.ts` → `buildPlanItem` |

### Traced data flows

- **Upload to print.** `uploadFiles` → `loadAssetFromFile` (decode, EXIF, alpha) → `placeAsset` (300 DPI native size,
  contain) → canvas `DesignNode` (Konva crop from the same fitting engine) → `buildRenderPlan` → `buildPdf` /
  `drawPlan` / `printSheet` → `saveProject` (IndexedDB) or `serializeProject` (`.sheetfit`) → `migratePages` on reopen.
- **Product template.** `PRODUCTS` → `requestProduct` → `openProductDesign` (sheet via `pageFor`) or `addProductSlot`
  (`planProductPlacement`) → empty slot (`fitMode: "fill"`) → `fillSlot` → plan → outputs; 3D preview through
  `designImageUrl` → `buildPlanItem`.
- **Undo.** `commitDoc` pushes the previous page document; per page; pages added or deleted are not part of history.
- **Mirror.** `page.mirrorOutput` → `plan.mirror` → one `-1 0 0 1 W 0 cm` in PDF, one `scale(-1, 1)` in `drawPlan`;
  print uses the raster, its CSS has no transform. No double mirroring in code.

## 3. Root causes of the five reported issues

| # | Issue | Root cause (confirmed in code) |
| --- | --- | --- |
| 1 | Mirror cannot be controlled reliably; double flips with the printer driver | Mirror was a boolean that `setProcess` and product placement **reset to the process default on every process change**, silently discarding an explicit choice. The control was a switch in the Sheet panel only; the export and print dialog showed a badge only when mirrored and gave no way to change it before output. The app never told users what to set in the driver. |
| 2 | PVC card shows one side at a time | No side model at all: `card-cr80` was a one-sided preset and two uploads became two unrelated designs. Groups existed but meant nothing about front and back. |
| 3 | No measurable spacing or cut guides for cards | No cut path in the model: spacing (`layoutGap`) was session-only UI state, measured between rotated design boxes including bleed (not cut lines), and not saved. "Border as cut line" was a black stroke drawn **as artwork** inside the box. Only corner crop marks existed. |
| 4 | Users must place mixed designs by hand | `autoArrange` used a shelf packer that (a) **moved locked designs**, (b) in "selection" mode packed into the whole printable area **ignoring unselected designs, so arranged designs could land on top of them**, (c) split groups, (d) could not turn designs or add pages, (e) used the unsaved session gap. |
| 5 | Portrait photo in a square product leaves white bars | `fill` meant *contain plus a background colour*; there was no cover mode. Product slots used it, so the image was always letterboxed. Cropping was four edge sliders with no pan, zoom or link to the box shape. |

## 4. Additional defects found

| Severity | Defect | Files | Reproduction | Status |
| --- | --- | --- | --- | --- |
| High | Auto Arrange "selection" overlapped unselected designs | `editor-store.ts` | Select two of four designs, Arrange: they pack to the top-left over the others | Fixed (obstacles in `planArrange`), tested |
| High | Auto Arrange moved locked designs | `editor-store.ts` | Lock a design, Arrange all: it moves | Fixed, tested |
| Medium | Paste put copies into the original's group | `editor-store.ts` | Group A+B, copy A, paste: selecting A now also selects the copy | Fixed (`cloneDesigns`), regression test |
| Medium | Process switch overwrote an explicit mirror choice | `editor-store.ts`, `product-placement.ts` | Turn mirror off on a sublimation page, switch to DTF and back: mirror is on again | Fixed (`mirrorMode`), tested |
| Medium | Imported `.sheetfit` numbers were not validated (NaN, Infinity, negative sizes reached the renderers) | `migrate.ts` | Edit a project file to `"width": 1e999` and open it | Fixed: `migrateDesign`/`migratePage` clamp and replace non-finite values, tested |
| Medium | "Border as cut line" label: the border prints as artwork | `PropertiesPanel.tsx` | Turn it on, export: a black line is printed | Relabelled "Thin black border (prints as artwork)"; real cut lines are separate |
| Low | Corrupted `node_modules` broke lint and typecheck | environment | See section 1 | Fixed with `npm ci`; no code change |

## 5. Not changed (recorded for follow-up)

| Severity | Item | Why left | Safe follow-up |
| --- | --- | --- | --- |
| Medium | Undo is per page; deleting a page cannot be undone (except the pages Auto Arrange adds, see ADR 0017) | A project-level history touches every action | Move history to a project-level stack of `{pages, activePage}` |
| Medium | Raster export of very long DTF sheets exceeds browser canvas limits | Browser limit; PDF works and the dialog says so | Tile rendering |
| Low | Product art for heart, bone and tag shapes uses the closest existing silhouette; cut guides are the bounding rectangle | Exact outlines are not published | Add outlines when a supplier publishes a template drawing |
| Low | Hole and slot positions are not modelled for tags and plates | No source publishes them | Add `cutouts` to `ProductPreset` once verified |
| Low | Canvas pinch-zoom of the whole sheet on touch (outside crop mode) | Not part of the reported issues | Add a two-pointer handler to the stage |
| Low | `window.confirm` for "Unlink pair" | Consistent with the existing page-delete confirm | Move to the AlertDialog primitive |

## 6. Security and robustness notes

- Project files are untrusted input. `migrate.ts` now validates every number that reaches geometry; the cut contour
  paths must be finite arrays of at least three points. Text fields are rendered by React (escaped). SVG export escapes
  titles and image URLs.
- SVG uploads are not accepted (`ACCEPT_ATTR` is raster only), so no untrusted SVG reaches the DOM.
- Contour tracing works on a mask of at most 768 px on the long side, so large images cannot stall the tab.
- Auto Arrange caps new pages at 50 per run and the quantity tool at 500 copies.

## 7. Physical production limits

Everything here is verified in software (geometry tests, real PDF and SVG files, a real browser). It has **not** been
verified on a physical printer, heat press or cutting machine: driver mirroring, transfer shrink, cutter registration
and media behaviour must be tested by the user on their own equipment. See the test matrix in
`docs/feature-implementation-plan.md`.

## 8. v0.10 UX audit (2026-11-27)

Method: the production build in headless Chrome (puppeteer-core) at 1366 × 768, 1920 × 1080, 1024 × 768,
820 × 1180 and 390 × 844, the sample sheet and a sticker upload; measurements read from the DOM.

| Finding | Measured | Fix |
| --- | --- | --- |
| Side panel, inspector and 3D dock open together on laptops | At 1366 px the A3 sample sheet was 330 px wide; at 1024 px the canvas was about 300 px | One side panel at a time below 1280 px; narrower panels below 1536 px; dock folds below a 760 px canvas (ADR 0021) |
| Inspector too long | One sticker: 12 sections, 2,853 px in a 668 px panel; Trace contour in section 11 | Tabs (Design, Arrange, Cut); Design tab 1,174 px; cut controls one click away |
| Duplicate tools | "Repeat on sheet" (box gap) and "Quantity" (cut-path gap) disagreed; leftovers sat on the original | One Fill engine with the count shown (ADR 0019) |
| Quick bar cut off | Labels followed the window width | Container queries on the canvas; More menu |
| Number field labels overlapped values | "Bleed", "Border" in a 16 px slot | Word labels take their own width |
| Products panel ignored the page | Stayed on "Sublimation" on a sticker page | Follows the page's process |
| Sticker outline manual | Six steps before a sticker could be cut; JPEGs could not be outlined | Automatic outlines from alpha or a plain background (ADR 0018) |
| 3D | Caps a dome over a line; die-cut stickers square; heart and bone tags rounded rectangles | Rebuilt cap; sticker from its own contour; outlines for shaped blanks (ADR 0022) |

Also fixed: mojibake in `lib/layout/arrange.ts` comments (`90Â°`), the strap length input's doubled focus outline,
"Edit" toggling the inspector off when it was hidden by the side panel, and (found by the browser check) a Cricut
cutter PNG of the whole A4 page, 8.27 × 11.69 in, larger than Print Then Cut accepts: it is now cropped to the
stickers (6.08 × 9.13 in for six 3 in stickers).
