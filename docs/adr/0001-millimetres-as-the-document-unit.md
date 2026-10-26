# ADR 0001: Millimetres are the only unit stored in the document

- Status: accepted
- Date: 2026-10-26

## Context

The product promise is a physical size on paper. Positions and sizes pass through several pixel spaces: screen pixels at a zoom level, export canvases at 150, 300 or 600 DPI, and PDF points. Storing any of those in the document would tie the layout to one of them and introduce rounding each time the user changes zoom or DPI.

## Decision

`EditorDocument` stores millimetres as floating-point numbers. Conversion functions in `src/lib/layout/coordinate-conversion.ts` are the only place where DPI or the 25.4 mm-per-inch constant appears. Whole-pixel rounding happens only when an export canvas is allocated.

## Consequences

- Changing zoom or export DPI never moves or resizes a design.
- A round trip mm → px → mm 1000 times stays within 1e-9 mm (tested).
- Inputs in cm, inches or pixels convert on commit; pixel inputs depend on the export DPI, which the interface states.
