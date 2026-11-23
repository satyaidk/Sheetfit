# ADR 0015: Fill a fixed box with a non-destructive crop view

- Status: accepted
- Date: 2026-11-23
- Refines: ADR 0002 (contain by default, never crop silently)

## Context

A product's print area has a fixed physical size (for example a 228.6 × 228.6 mm panel). A portrait photo placed in it
was contained, leaving white bars, and there was no way to fill the box: `fill` meant contain plus a background
colour, and cropping was four edge sliders with no link to the box shape. Users need to fill the box, crop only the
excess, and move or zoom the photo inside it, on desktop and on phones.

## Decision

1. A new fit mode, `cover`, draws the largest source window with the box's own aspect ratio, so the image fills the
   box with the same scale on both axes. The window is described by `Design.view = { zoom ≥ 1, x, y ∈ 0–1 }`:
   zoom relative to the smallest covering window, and position in the free range. These are source-relative, so the
   crop does not depend on screen zoom, device pixel ratio, export DPI or file resolution.
2. `effectiveSourceRect` (crop insets, then the cover window) is the single mapping used by the canvas, the render
   plan, PDF, PNG, JPEG, print, the SVG artwork group, the 3D and mockup textures, contour tracing and every
   resolution check. The source file is never changed.
3. Contain stays the default (ADR 0002). Filling is an explicit choice: the inspector's "Fit whole image / Fill box
   (crop)" control, the quick-bar fit menu, or crop mode.
4. Crop mode opens from the toolbar, the context menu, a double-click, or a 550 ms press and hold on touch (a finger
   that moves more than 8 px is a drag). Inside it, a drag pans, pinch and the wheel zoom, and the panel offers Fit,
   Fill, Revert, Cancel and Apply. Gestures change a local draft; Apply is one undo step. Global shortcuts are paused
   while it is open, and the overlay blocks browser gestures (`touch-action: none`).
5. The crop panel shows the effective DPI and how much of the image is left out, and warns when zooming makes the print
   low resolution.

## Consequences

- The box (the product's real size) never changes when fitting, filling or zooming.
- Rounded and round products are not clipped to their outline: for sublimation the artwork past the cut is bleed.
  Their cut path is drawn as a guide instead (ADR 0016).
