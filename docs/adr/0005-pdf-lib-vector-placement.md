# ADR 0005: pdf-lib with vector placement for PDF export

- Status: accepted
- Date: 2026-10-26

## Context

PDF is the most reliable way to preserve physical sizes when printing. The two approaches are to rasterise the sheet and embed one image, or to embed each source image and place it with a transformation matrix. Candidate libraries were jsPDF and pdf-lib.

## Decision

Use pdf-lib and place each design with a `cm` transformation matrix that maps local millimetres to page points. Embed PNG and JPEG sources unchanged; convert WebP (not a PDF image format) and EXIF-rotated JPEGs to lossless PNG once. Apply optional crops with a clipping path.

## Consequences

- Page size is exact (595.276 × 841.890 pt for A4 portrait, verified in tests) and placement does not depend on a DPI setting.
- Sources keep full resolution and are not recompressed; an asset used by many copies is embedded once.
- pdf-lib works in Node, so PDF generation is unit tested without a browser.
