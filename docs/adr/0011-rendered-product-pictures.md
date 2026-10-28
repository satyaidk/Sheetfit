# ADR 0011: Rendered product pictures instead of line drawings

- Status: accepted
- Date: 2026-10-28

## Context

The user asked for realistic pictures on every product card, showing how a design looks on the real product,
in place of the flat SVG illustrations. They also supplied a folder of images found online to use. The options:

- **The supplied images.** Most show other companies' characters and trademarks, and their licences are unknown,
  so they cannot be shipped in a public project. ADR 0008 already rules out images taken from Pinterest.
- **Stock product photos.** These would be real photos, but no consistent free set covers 52 blanks. They would
  also not match the print areas or the designs.
- **A live 3D view on every card.** This would mean 52 WebGL contexts, beyond what browsers allow (usually about
  16), plus seconds of model building on slow machines.
- **Pictures rendered from our own 3D models** (ADR 0010), made once and served as static images.

## Decision

Render every template's 3D model with a sample design, from the Front view (facing the print), to a transparent
720 px WebP in `public/products/`. Small placements also get a detail crop. Cards, dialogs and lists use these
pictures through `ProductArt`. Live 3D is used only where it pays off: the editor's preview dock, the catalogue
and large-preview dialogs, and the home page demo.

## Consequences

- Cards look like real products and load fast: about 1.1 MB for all 52 pictures, lazy-loaded and resized by
  `next/image`.
- Every picture comes from our own models and generated designs, so there are no licence questions.
- The pictures are build artefacts. They must be re-rendered when a model or the sample designs change, and a
  test fails if any product is missing its picture.
- Cards no longer reshuffle sample designs or blank colours. The 3D dialog still does both.
