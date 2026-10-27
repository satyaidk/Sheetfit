# ADR 0009: A new design per product, with save or discard before replacing work

- Status: accepted
- Date: 2026-10-27
- Refines: ADR 0008 (pages and product placement)

## Context

After v0.3, clicking a product card still added it to the current sheet (on a free spot or a new page). Users
expected a product to start its own design: "if I change to another product it should ask me to save or discard
the current design and open a new template, so designs are not merged on one sheet". They also could not find the
product preview, which only appeared while a product box was selected in the properties panel, and found the sheet
size chips hard to read.

## Decision

1. **Clicking a product card starts a new design** (`openProductDesign`): a fresh project whose only page is the
   smallest sheet that holds the product (or the chosen sheet when it is big enough), with the empty box at the top
   centre of the sheet and the view zoomed to the box. Top centre, not centre, so "Add to this sheet" later finds
   room.
2. **Replacing work asks first** (`requestLeave` and `LeaveDialog`): when the current design has an image in it or
   unsaved changes, the user chooses Save and open, Discard and open, Add to this sheet (products only) or Cancel.
   An untouched product design (empty boxes, nothing changed) is replaced without asking. The same flow guards File
   → New design, Open sample, and Clear.
3. **Gang sheets stay one click away**: the "+" on each card and "Add to this sheet" in the dialog use the v0.3
   placement rules (free spot, else a new page with the right sheet and process).
4. **The preview is always visible**: a live preview is docked on the canvas whenever the page has a product box,
   and reserves its width so fit-to-screen never hides the sheet behind it.
5. **Sheet size is a dropdown** (`SheetSelect`) grouped into paper and DTF rolls, used in the header, the Sheet
   panel, the start dialog and the Sheet size dialog.

## Consequences

- Designs for different products are never merged by accident; merging is an explicit choice.
- A first click on a product never shows a dialog when there is nothing to lose.
- Saving before switching uses the existing IndexedDB projects, so the previous design is reopened from Projects.
