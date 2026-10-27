# ADR 0008: Pages with their own sheets, product previews, generated sample designs

- Status: accepted
- Date: 2026-10-27
- Supersedes: ADR 0007's "a template that does not fit offers the smallest sheet"

## Context

In v0.2 a project had one sheet. Adding a template that did not fit (a 30 oz tumbler on A4) offered "Switch to A3", which changed the sheet for every design already placed; going back to A4 pushed the tumbler off the sheet. Users reported this as "the A3 sheet appears and conflicts with the other designs". Users also asked to see their design on the product, in different blank colours, and for example designs on the product cards that change on every visit, suggesting Pinterest as the source.

## Decision

1. **Pages.** A project is an ordered list of pages; each page is the v0.2 document (sheet, process, margins, designs) with its own undo history. The store keeps the active page in `doc`/`past`/`future`, so existing components and tests are unchanged, and stores the others in `pages`. Exports cover all pages or the current one: one PDF with a page per sheet size, one PNG/JPEG per page, and one print job with a CSS named page per sheet size.
2. **Placement never changes a page that holds work** (`lib/layout/product-placement.ts`). Empty page: adopt the product's orientation, sheet and process. Otherwise: first free spot (5 mm gap, then 2 mm, then turned 90°), or a new page with the smallest sheet that holds the product, or with its process when the page prints the other one.
3. **Previews are original SVG mockups.** Each product illustration takes a blank colour; the design is the print box rendered through the shared render plan; wraps are projected onto a cylinder with strips; sublimation uses multiply blending. The blank colour is stored on the design (`productColor`) and never printed.
4. **Sample designs are generated, not fetched.** Pinterest images belong to their creators, Pinterest's terms forbid scraping, and its API only exposes a signed-in user's own content through an OAuth app with a server-side secret. Printing other people's pins on products for sale would also infringe copyright. Sheetfit instead generates original emblems and patterns from a seed, so a new set appears every time and every design is free to print.

## Consequences

- The "A3 takes over" bug cannot recur: placement is a pure, tested function, and a browser check verifies that page 1 is unchanged after an A3 page is added.
- Saved records gain `pages`; `document` still holds page 1, so older readers keep working, and `migratePages` reads both shapes.
- Undo is per page, as in many editors with pages; deleting a page asks for confirmation because it cannot be undone.
- Previews are illustrations, not photographs; the dialog says colours are approximate. Photographic mockups and an opt-in Pinterest import through the official API are on the roadmap.
