# ADR 0018: Sticker cut methods, a printed cutting line, and automatic outlines

- Status: accepted
- Date: 2026-11-27

## Context

Most people who print stickers at home have no cutting machine and cut by hand. In v0.9 a sticker needed six manual
steps before it could be cut: choose the contour shape, scroll to the eleventh inspector section, press "Trace
contour", switch on "Show cut lines in prints", and accept a 0.1 mm magenta proof line that was made for proofs, not
for scissors. A JPEG on a white background could not be outlined at all ("use Rectangle instead"). Cutting machines
need the opposite: no printed line, and artwork their own software can trace.

Research (checked 2026-11-27, `docs/catalogue-sources.md`): sticker borders are typically 2–4 mm (Atomm), Sticker
Mule's minimum is 1/16 in; hand cutters print a visible outline, cut just outside it, avoid inner details and leave at
least 3 mm between stickers (stickerit.co). Cricut's Print Then Cut prints from Design Space with its own registration
marks; its largest image is 7.2 × 10.62 in on A4 and 7.44 × 9.94 in on Letter (Cricut Help, as quoted in search
results; the page refuses automated reading). Silhouette Studio adds three corner registration marks itself.

## Decision

1. **A cut method per page** (`PageSettings.cutMethod`): `hand` (default for new sticker pages), `cricut`,
   `silhouette`, `file` (another cutter or a print shop). It decides what prints and which download is offered.
2. **A printed cutting line for hand cutting** (`PageSettings.cutGuide`: colour, width, placement), black and 0.25 mm
   by default, drawn along every cut path by every renderer (canvas, PDF, SVG, Konva editor) from the render plan
   (`PlanItem.guide`). "Inside" placement clips to the sticker (even-odd) and strokes at twice the width, so exactly
   the inner half prints and cutting along the line's outer edge leaves an even outline. Artwork-only files (for
   cutter software) leave it out.
3. **A white sticker border** (`PageSettings.borderFill`): every cut path is filled under the artwork
   (`PlanItem.underlay`), so contour stickers have an even white border on screen, on transparent PNGs for cutters,
   and in PDF (as a vector fill).
4. **Automatic outlines.** On a sticker page every design with no cut, or with a traced contour that no longer matches
   its image, size or crop, is traced by a watcher (`use-sticker-outlines.ts`) after any upload, drop, sample, replace
   or resize. The trace is folded into the user's own undo step and each set of inputs is traced once, so Undo never
   triggers a re-trace. Outlines come from alpha; an opaque image has its plain background found by a flood fill from
   the edges (`lib/image/background.ts`: dominant rim colour must cover 60 % of the rim, only edge-connected background
   is removed, inner white stays). Anything else (a photo with a busy edge) is cut as a rounded rectangle and the user
   is told why. Hand cutting adds a morphological closing (no slots narrower than 3 mm), stronger smoothing, no inner
   holes and grows the closing until the design is one piece.
5. **Cutter downloads.** Cricut and Silhouette pages download a transparent 300 DPI PNG with white borders and no line,
   cropped to the stickers (artwork and cut paths plus 1 mm), because cutting software takes the image's size as the
   print size; the dialog gives import steps and that exact size in inches, and warns when it exceeds Cricut's Print
   Then Cut limit. Cricut pages show the Print Then Cut area on the canvas and can make it the printable area.

## Consequences

- A sticker is ready to print and cut by hand straight after the upload.
- Old projects open exactly as before: migration gives pages without a cut method `file` and no border fill.
- The printed line and border apply only to sticker pages; transfer paper (sublimation, DTF) never carries them.
- Outlines of shaped artwork are traced at up to 768 px per side, about 0.1 mm per pixel on a 76 mm sticker.
