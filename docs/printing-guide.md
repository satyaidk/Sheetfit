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

## Stickers: cutting by hand (v0.10)

New sticker pages are set to **By hand**. Every sticker gets its outline automatically after the upload, a white
border (3 mm by default) and a thin black line (0.25 mm) printed just inside the cut.

1. Print the PDF at 100 % on white sticker paper (matte, glossy or vinyl). For thin lines and small text choose
   **High, 600 DPI** in the print dialog, or download the PDF (vectors at any size).
2. Laminate first if you want to; let it dry.
3. Cut just outside the black line with sharp scissors; use a craft knife for tight inner curves. Rounded outlines and
   at least 3 mm between stickers keep the blades off the next sticker.
4. Change the line colour (black, dark or light grey), thickness (hairline to bold) or where it sits (inside the edge
   or on the cut) in **Cut → Cutting line**. Change the border in **Cut → Sticker outline**, for one sticker or all.

## Stickers: Cricut and Silhouette (v0.10)

Choose **Cricut** or **Silhouette** in **Cut → How will you cut?**. No line is printed; the sticker border stays white.

- **Cricut Print Then Cut.** On A4 or US Letter the dashed rectangle is the largest Print Then Cut image
  (7.2 × 10.62 in on A4, 7.44 × 9.94 in on Letter). **Use it as the printable area**, then Fill sheet or Auto Arrange.
  Download **Cutter PNG** (only the stickers, transparent, 300 DPI), upload it to Design Space as a Print Then Cut
  image, set its size to the inches shown in the download dialog, and print from Design Space. Design Space adds the
  registration marks. The dialog warns if the stickers are larger than the Print Then Cut limit.
- **Silhouette.** Download the Cutter PNG (or the SVG cut file with Designer Edition), set its size in Studio, trace
  the outer edge or use the cut file, turn on registration marks and match Page Setup to your paper.

## Lanyard and keychain straps (v0.10)

Open **Products → Lanyard and keychain straps** (or choose it when starting). Pick 12, 16 or 20 mm (or type a width),
type your strap's cut length, add the artwork and choose once, repeated or filling the strap. **Both faces** turns the
second half upside down, so a strap folded through a ring reads upright on both sides. The sheet is filled with as many
strips as fit, with your gap between them, and printed mirrored like any sublimation transfer: lay pieces of white
sublimation ribbon on the printed strips and press.
