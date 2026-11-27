# ADR 0022: Outlines for shaped blanks, shared by the cut guide and the 3D model

- Status: accepted
- Date: 2026-11-27

## Context

Pre-cut sublimation blanks come in shapes: heart, star, tree, bell and snowflake ornaments, dog-bone and heart tags,
crosses, hexagons, gift tags. Suppliers publish them by name and bounding size ("Heart 2.87 × 3 in"), never as an
outline. v0.9 drew the bounding rectangle as the cut guide and a rounded rectangle in 3D (a known issue).

## Decision

1. **Parametric outlines** (`lib/catalogue/blank-outlines.ts`), each a closed, clockwise, non-self-intersecting polygon
   that fills a unit box exactly (tested), scaled to the published bounding size. A dog bone lies along the long side
   of its box.
2. **One description, three uses**: the default cut path of a shaped product (`cutPaths`, unless the user chose a cut),
   the 2D illustration, and the extruded 3D model (with the ring or loop hung at the outline's top).
3. **Labelled as guides.** Each shaped preset says the outline is drawn to the published size and that the blank
   defines the real edge.

## Consequences

- Shaped blanks show their real silhouette on the sheet, in previews and in 3D.
- A blank whose real outline differs (a scalloped "creative border" ornament) is not added until it can be described
  honestly.
