# ADR 0003: Every output draws from one shared render plan

- Status: accepted
- Date: 2026-10-26

## Context

The app produces five views of the same sheet: the export preview, PNG, JPEG, PDF and the browser print image. If each computed geometry independently, small differences (rotation origin, padding, crop handling) would make the preview disagree with the file.

## Decision

`buildRenderPlan` converts the document into plain data in millimetres: page size, background, and for each design a centre, a rotation and local rectangles for background, image, source crop and border, plus crop-mark lines. `drawPlan` (Canvas 2D) and `buildPdf` (pdf-lib) are thin adapters over that plan.

## Consequences

- The preview is rendered by the same code path as PNG/JPEG export.
- Export geometry can be tested in Node with a recording canvas context and by parsing the generated PDF.
- The interactive Konva canvas still computes its own nodes, but from the same `computeImageRect` function, so on-screen fitting matches the plan.
