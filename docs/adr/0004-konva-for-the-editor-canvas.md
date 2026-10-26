# ADR 0004: Konva (react-konva) for interactive editing

- Status: accepted
- Date: 2026-10-26

## Context

The editor needs selection, drag, resize handles, rotation, multi-select and snapping on a zoomable surface. Options considered: Fabric.js, Konva with react-konva, and hand-written DOM/SVG.

## Decision

Use Konva through react-konva.

- react-konva renders the scene declaratively from the Zustand store, which fits the React component model.
- Konva's `Transformer` provides resize and rotate handles, rotation snapping and a `boundBoxFunc` hook used to keep designs inside the margins.
- A single scaled group lets every node be positioned in millimetres.

## Consequences

- Konva needs `window`, so the editor is loaded client-side only with `next/dynamic` and `ssr: false`.
- During a resize gesture Konva scales the group. To avoid showing a stretched preview, the node re-fits the image for the scaled box and counter-scales it; the scale is converted into a real width and height on release, producing a single undo step.
- Exports do not depend on Konva; they use the render plan (ADR 0003).
