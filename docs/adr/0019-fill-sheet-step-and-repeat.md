# ADR 0019: Fill sheet (step and repeat) as one engine for every product

- Status: accepted
- Date: 2026-11-27

## Context

The most common job is "as many of this as fit on my A4". v0.9 had two tools for it that disagreed: "Repeat on
sheet" (a grid with its own x/y gap, measured between boxes, ignoring cut paths and bleed) and "Quantity" (copies
piled on the original, then packed by Auto Arrange; leftovers stayed on top of the original). Neither said how many
would fit before the user tried, and pressing either twice added more copies. Gang-sheet builders (Ninja Transfers,
Gangio and others) call this "Auto Fill" and show the count up front.

## Decision

1. **One pure engine** (`lib/layout/fill.ts`). Copies keep the design's size, crop, fit and cut; spacing is the page's
   spacing *between cut paths*, measured with the same clearance rectangles as Auto Arrange (ADR 0017); what prints
   stays inside the printable area; other designs are obstacles.
2. **Clean grids first.** On an empty page the best of: a grid as is, a grid turned 90°, or either grid plus a band of
   turned copies in the leftover strip. The block is centred. With other designs on the page, MaxRects places the
   copies in the free space.
3. **Twins are replaced.** Copies of the design already on the page (same image or empty product, size, crop, fit,
   flips, cut and strap settings, any quarter turn) are part of the fill, so filling twice gives the same sheet.
4. **Exact quantities spill onto new pages** with the same sheet, as one project-level undo step.
5. **Shown everywhere with its count**: the quick-actions bar ("Fill sheet 24"), the floating pill and right-click
   menu, and the inspector's Copies section ("24 fit on this A4, 30 on an empty sheet").
6. **Empty boxes fill together.** An image put into one empty product box also fills that box's empty twins, so "fill
   the sheet with keychains, then add the design" works in one step.

## Consequences

- One spacing setting (cut path to cut path) for Fill, Quantity, Auto Arrange and the strap tool.
- The old `repeatDesign` store action stays for compatibility; the UI no longer uses it.
