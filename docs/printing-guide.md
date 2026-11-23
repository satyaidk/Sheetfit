# Printing guide

Getting a 90 mm design to measure 90 mm on paper depends on three things: the file, the print dialog, and the printer.

## Recommended route: PDF

1. Export a PDF from Sheetfit. The page is exactly 210 × 297 mm (or 297 × 210 mm) and designs are placed at exact millimetre positions.
2. Open it in a PDF viewer and print with:
   - Paper size: **A4**
   - Orientation: the same as the sheet
   - Scale: **100%** or **Actual size**. Turn off **Fit**, **Shrink oversized pages** and **Fit to printable area**.
3. Measure a design with a ruler on the first print.

## Printing from the browser

**Print** in the top bar renders the sheet at up to 300 DPI and opens the browser's print dialog with an A4 page and no page margins. In the dialog:

- Choose A4 and the sheet's orientation.
- Set scale to 100% (Chrome: More settings → Scale → Default or Custom 100; Firefox: Scale 100%; Safari: Scale 100%).
- Set margins to None or Minimum.
- Turn off headers and footers.

## Printable area

Most desktop printers cannot print the outer 3 to 5 mm of a sheet. Sheetfit's margins (5 mm by default) show the safe area as a dashed line, and designs outside it get a magenta outline and a warning before export. For printers with a borderless mode, set margins to None.

## Sublimation

- Sublimation transfers are usually printed mirrored. Sheetfit does not mirror yet (it is on the roadmap); use your printer driver's mirror or "flip horizontal" option.
- Use 300 DPI raster exports or PDF. Higher DPI does not add detail the source image lacks; check the print-quality meter instead.

## Raster files for print shops and RIP software

PNG and JPEG exports carry their DPI in the file metadata, so a 2480 × 3508 px file at 300 DPI opens as an A4 page in software that reads it. If a program opens the file at the wrong size, set the document resolution to the export DPI without resampling.

## Mirroring and the printer driver

Sheetfit's mirror (Sheet settings, and the Download / Print dialog) is **Auto**, **On** or **Off** for each page.
Auto mirrors sublimation and does not mirror DTF or stickers. The effective result is shown before every export.

- When Sheetfit mirrors, turn **off** the mirror or "flip horizontal" option in the printer driver or RIP. Two
  mirrors cancel out and the pressed transfer reads backwards.
- When Sheetfit does not mirror and you need a mirrored transfer, either choose **On** in Sheetfit or turn the
  mirror on in the driver, never both.
- A web page cannot read or change the driver's setting, so check it once per printer with a test print of text.

## Cut lines and cut files

- **Print** contains the artwork and the marks switched on in Sheet settings. **Artwork only** has no marks or cut
  lines, for cutting software that adds its own. **With cut lines** draws every cut path as a thin magenta (kiss) or
  cyan (die) line, for proofs and hand trimming.
- **Cut file (SVG)** holds the cut paths in millimetres (1 unit = 1 mm) in a `CUTLINE` group, optionally the artwork in
  an `ARTWORK` group. Import it into your cutter's software and check that it imports at 100 % scale.
- The corner registration squares are generic. Cutters with optical sensors (Cricut, Silhouette and others) need the
  marks their own software adds.
- Card gaps are measured between cut lines. If the bleed of two cards would touch, the gap widens automatically.
- Supplier specifications for bleed, safe area and spacing take precedence over Sheetfit's starting values.
