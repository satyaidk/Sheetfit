# ADR 0010: Procedural 3D product models with three.js

- Status: accepted
- Date: 2026-10-27

## Context

Users asked for a 3D viewer for every product, as realistic as possible (shape, colour, materials, surface detail),
with a background that adapts to the product colour. There are 52 products in 33 illustration kinds. Options:

- **Downloaded 3D models** (GLB files): realistic for the products that have one, but no consistent free set covers
  52 sublimation and DTF blanks at their real print sizes, licences vary, and each file adds megabytes.
- **Procedural models**: built in code from each product's real dimensions, so the print area on the model is the
  print area in the catalogue, every product is covered, and nothing extra is downloaded.

## Decision

1. **three.js 0.186.1**, loaded with `next/dynamic` only when a 3D view opens (`Product3D`), so the editor and landing
   page do not pay for it.
2. **Procedural builders** in `lib/three/product-model.ts`, in millimetres:
   - drinkware is lathed from radius profiles; the circumference comes from the wrap width plus a handle gap for
     handled mugs, and the print is a lathe band just outside the body, so it follows tapers;
   - flat goods are bevelled slabs cut from their outline, with holes, rings and the right back (cork, rubber,
     magnet, aluminium);
   - garments are a padded cloth surface: a grid over the shared 2D outline, raised by distance to the edge, with
     drape folds, and the print laid on the surface at its true size and position;
   - caps (decal on the crown), totes and flags have their own builders.
3. **Materials follow the real blank**: glazed ceramic with clearcoat, powder-coated and brushed steel, glass with
   transmission, fabric with sheen and a procedural weave normal map, cork, rubber and aluminium, lit by a room
   environment with a soft shadow.
4. **The print is the process**: sublimation multiplies the design into the blank colour (the dye is transparent),
   DTF lays an opaque film over the fabric. Bleed and seam overlap are cropped off, and an image whose shape differs
   from the print area is fitted whole, never stretched.
5. **The backdrop adapts to the blank** (`backdropFor`): light blanks get a mid-tone clearly darker than the blank,
   dark blanks a light sweep, mid-tones a tint of the complementary hue. A unit test checks the contrast for every
   blank colour in the catalogue.

## Consequences

- Every product has a model, built and size-checked in unit tests without a browser, and rendered in a headless
  browser check.
- Models are stylised rather than photographic (no scanned textures); photographic mockups stay on the roadmap.
- three.js adds about 150 kB gzipped, downloaded only by users who open a 3D view.
