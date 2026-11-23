# ADR 0017: Auto Arrange with MaxRects on clearance rectangles

- Status: accepted
- Date: 2026-11-23
- Supersedes: the shelf packer as the Auto Arrange engine (it remains for the landing demo sheets)

## Context

The shelf packer moved locked designs, ignored unselected designs in "selected only" mode (so arranged designs could
land on them), split groups, could not turn designs or add pages, and measured the gap between design boxes with an
unsaved session value.

## Decision

1. **MaxRects, best short side fit** (`lib/layout/nesting.ts`), with a "rows" variant (lowest y, then x) for a reading
   order. Chosen because designs are rectangles or are handled through their axis-aligned bounds, jobs are tens to a
   few hundred items, MaxRects packs mixed sizes tightly, and fixed obstacles are just cut out of the free space.
2. **Clearance rectangles.** Each design's cut bounds grow by max(spacing ÷ 2, how far its bleed or content pokes past
   the cut) on each side. Non-overlapping clearance rectangles guarantee the requested gap between cut paths and that
   no bleed prints onto a neighbour. Each orientation also records how far its printed content sits inside the
   rectangle, so the content (not the clearance) stays inside the printable area.
3. **Blocks and obstacles.** Card pairs and groups are rigid blocks; locked designs, designs outside the scope and
   registration squares are obstacles. Only single, unlocked designs that are not rotation-locked may turn 90°, and
   only when the user allows it.
4. **Never resize.** Anything larger than the printable area is reported; with "Add pages for the rest" the remainder
   goes on new pages with the same sheet (at most 50).
5. **One step.** `planArrange` is pure and also powers the dialog's summary (pages needed, usage). The store applies it
   as one undo step; when it added pages, undo on that page removes them again if they were not edited since, and redo
   puts them back. Order is deterministic (area, longest side, id; ties by y then x).
6. Spacing (`page.spacing`) and the pair gap are saved with the page.

## Consequences

- Randomised tests with fixed seeds check non-overlap, the gap between cut paths, margins and unchanged sizes; removing
  the spacing term makes nine of them fail.
- Shape-aware nesting of contour stickers is not attempted; contours pack by their bounding rectangles, and the docs say so.
