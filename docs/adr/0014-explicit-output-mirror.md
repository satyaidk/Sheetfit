# ADR 0014: An explicit output mirror (Auto, On, Off), resolved once

- Status: accepted
- Date: 2026-11-23
- Refines: ADR 0003 (shared render plan), ADR 0007 (sheets, process and slots)

## Context

Sublimation output was mirrored through a boolean `mirrorOutput` that every process change reset to the process
default. Users who mirror in the printer driver got a double flip (a normal, unmirrored transfer), users who turned the
driver mirror off still got Sheetfit's mirror, and an explicit choice was lost whenever the process changed. The control
lived only in the Sheet panel; the export dialog could not change it.

## Decision

1. `PageSettings.mirrorMode: "auto" | "on" | "off"` replaces the boolean. `resolveMirror(page)` in
   `lib/render/mirror.ts` is the only place that decides: Auto follows the process (sublimation mirrored; DTF and
   stickers not), On and Off override it.
2. The render plan carries the resolved value. Each renderer applies it once, around the page centre, after the
   background and before everything else, so artwork, crop marks, centre marks, cut lines, registration squares and
   both sides of a card pair flip together. Per-design flips stay separate. Browser print CSS never transforms.
3. The setting is per page and saved with it. New pages and projects start on Auto; a page created for another process
   resets to Auto, so an override cannot leak into unrelated work.
4. Older projects migrate to the mode that reproduces their stored boolean exactly (`mirrorModeFor`); v0.1 pages, which
   had no flag and were not mirrored, become Off on sublimation.
5. The export and print dialog shows the effective result before output and can change it for every page in the export.
   Both places explain what to set in the printer driver and say that a web page cannot read or change it.

## Consequences

- One flip, in the file itself, is the only mirror Sheetfit applies; the driver advice tells users to keep the driver's
  mirror off when Sheetfit mirrors.
- Tests compare the PDF (parsed content stream) and the raster/print path point by point for every mode.
