# ADR 0020: Lanyard and keychain straps printed on transfer sheets

- Status: accepted
- Date: 2026-11-27

## Context

Keychain straps and lanyards are printed on white polyester (satin) sublimation ribbon. At home the ribbon is not fed
through the printer: strips one ribbon wide are printed on A4 sublimation paper, pieces of ribbon are laid on them and
pressed. v0.9 only offered a roll layout (each page is a length of ribbon) with every size typed in, because no ribbon
width had been verified. IndiaMART listings (checked 2026-11-26) now show white sublimation ribbon in 16 mm and 20 mm
rolls (50–101 m) and 12 mm sublimation lanyard tape, the widths the user asked for. No source publishes a standard
keychain strap length: it depends on the clamp.

## Decision

1. **A strap is a design** with `strap: { fold, endZone, mode, along, sourceAssetId }`: its box is exactly one ribbon
   wide (12, 16, 20 mm or typed) and one cut length long (always the user's number, remembered in the browser).
2. **The strap image is composed once** at 600 DPI from the original artwork (`strapArtPlacements` plans it, pure and
   tested): once, repeated along the strap, or filling it; turned to run along the strap like lanyard text; clear of
   the end zones. For a strap folded through a ring, the second half carries the artwork turned 180°, so both faces
   read upright. Every renderer then treats it as an ordinary image.
3. **The sheet is filled by the Fill engine** (ADR 0019) on a sublimation page (mirrored automatically), with the gap
   between strips as the page spacing. The dialog shows the count and a live preview of the sheet and of one strap
   before anything is created. Changing a strap's settings re-composes every matching strap on the page.
4. **The roll layout stays** as the dialog's second tab for printers that print on the ribbon itself.

## Consequences

- 16 × 130 mm straps at a 3 mm gap fill an A4 sheet with 21 strips (20 upright and one turned in the leftover band;
  measured by `scripts/e2e/v10func.mjs`); widths and lengths are never invented.
- The PDF embeds the composed strap image (600 DPI) rather than the original file.
- Straps are not catalogue products; the 3D preview builds a strap model from the design's own size.
