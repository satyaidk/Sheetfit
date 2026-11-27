# ADR 0021: An adaptive editor layout and a tabbed inspector

- Status: accepted
- Date: 2026-11-27

## Context

An audit of the v0.9 editor in headless Chrome (`docs/engineering-audit.md`, "v0.10 UX audit") found the layout did
not adapt to common laptop screens. At 1366 × 768, the side panel (360 px), the inspector (312 px) and the 3D dock
(248 px) left the sheet about a quarter of the window; at 1024 × 768 the canvas was about 300 px wide. The quick-
actions bar showed labels by window width, not canvas width, and was cut off. The inspector for one image stacked 12
sections, 2,853 px tall in a 668 px panel; the sticker cut controls were the eleventh section; "Repeat on sheet" and
"Quantity" duplicated each other, and word labels overlapped their values in number fields.

## Decision

1. **One side panel at a time below 1280 px.** Selecting a design shows the inspector and folds the left panel;
   opening the left panel hides the inspector until the next selection; "Edit" brings it back. Choosing a product
   template closes the catalogue on screens narrower than 1600 px, then re-zooms to the new box once the canvas has
   grown.
2. **Narrower panels below 1536 px** (296 px each), and the 3D dock folds into a "Preview" pill when the canvas is
   narrower than 760 px.
3. **The quick-actions bar adapts to the canvas**, not the window, through CSS container queries on the canvas
   (`@container`); rarely used image tools move to a "More" menu, and "Fill sheet" with its count is always there.
4. **A tabbed inspector**: a header with the picture, name, size and DPI, then Design (product, image, fit, size,
   quality), Arrange (copies, position, card sides, layer) and Cut (cut method, outline, cutting line). The chosen tab
   is kept in the store. Rare settings (fitting modes, file details, edge crop) are folded into disclosures.
5. **Nothing selected shows the next step**: a four-step checklist (add designs, fill the sheet, check, download) with
   the action for each.
6. **The start dialog offers straps** as a fourth path, and the Products panel follows the page's process.

## Consequences

- The Design tab of a sticker measures 1,174 px at 1440 × 900 instead of the 2,853 px single inspector; Arrange and
  Cut are one click away (`scripts/e2e/v10func.mjs`).
- Layout rules live in `EditorLayout` and the quick bar; the store gains `inspectorTab` (UI state, not saved).
