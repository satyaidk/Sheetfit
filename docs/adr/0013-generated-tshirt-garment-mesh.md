# ADR 0013: A generated T-shirt garment mesh, exported as glTF

- Status: accepted
- Date: 2026-10-31

## Context

The user asked for a photorealistic, physically accurate 3D blank T-shirt: a real garment with a crew neck and ribbed
collar, set-in sleeves, seams, hems, fabric thickness, believable folds and a clean UV layout, delivered as a GLB with
its sources, and integrated with SheetFit's print placement. The previous shirt (`clothSurface` in ADR 0010) was a
puffed-up outline: convincing from the front, flat from the side, with no neckline, no armholes and no inside.

Options considered:

- **Model it in Blender.** Blender is not installed on the development machine, and a hand-made `.blend` file cannot
  be regenerated, reviewed in a pull request or kept in step with the app's sizes.
- **A stock or scanned mesh.** No openly licensed T-shirt mesh found comes with SheetFit's placements (left chest,
  full back, sleeve, back neck …), real sizes or kids' sizes; each would need its own UV work, and licences vary.
- **Load a GLB at runtime.** Adds a 7.9 MB download to every 3D view, an async loading state, and a second place
  where print geometry lives.
- **Generate the garment the way it is sewn**, in TypeScript, and export the same geometry to GLB.

## Decision

Generate the shirt in `src/lib/three/tshirt-model.ts` and use it directly in the app; export it with
`npm run model:tshirt` to `public/models/tshirt.glb` (plus its texture PNGs) for other tools.

- **Torso**: a tube from hem to neckline. Each column follows a filleted profile (body wall, shoulder or upper chest,
  neck); cross-sections are superellipses, wider than deep. The crew neck's drop follows a quarter ellipse across its
  width, so it is round from the front, not a V.
- **Sleeves**: the armhole is a loop on the torso's own surface; each sleeve runs from it to an elliptical hem, bowed
  out over the shoulder (the sleeve cap). The sleeve starts exactly on the body and never passes through it.
- **Fabric**: two shells 1.3 mm apart, joined by rolled edges at the hems; the inside is darker and visible through
  the openings. Folds (hem drape, armpit drag lines, waist ripples, under-arm bunching), folded hem bands with two
  coverstitch grooves, a ribbed collar band, raised seams and baked occlusion are part of the geometry.
- **Fabric coordinates**: every outer vertex knows where it lies on the flat cloth, in millimetres, measured square to
  the profile lines so the mapping is isometric (a print's area on the cloth is its true area within 1 %). Fold
  functions are periodic round the body, so the back centre has no crease.
- **Prints** are cut from the garment's own triangles in fabric coordinates and clipped to the print rectangle and
  the panel's printable area, then lifted 0.35 mm along the normals. They follow every fold, keep the design's aspect
  and never float or sink in. The artwork stays a runtime texture (`printCanvas`), never baked into the model.
- **Materials**: physically based jersey (knit normal map and roughness variation from `fabric-maps.ts`, faint
  sheen, albedo below the swatch so white does not burn out). Matte cloth asks the viewer for less environment light
  (`ProductModel.environment`), because three.js applies one environment intensity to the whole scene.
- The same module is free of `@/` imports so plain Node can run it (with `scripts/lib/register-ts.mjs`); the export
  script writes a minimal glTF 2.0 file itself (three's exporter needs a browser for textures).

## Consequences

- One source of truth for the shirt in the app, the GLB and the tests; no new dependencies; no download in the app.
- Adult, youth, toddler and long-sleeve sizes come from the same code (`scaleTee`, `ADULT_LONGSLEEVE`).
- Building a size takes 0.4 to 2 s in Node (measured; once per size, then cached), on the main thread, like the
  other models. Software WebGL renders the adult shirt (332 k triangles) slowly; real GPUs do not notice.
- The GLB is 7.9 MB in the repository. `tests/v08-tshirt.test.ts` fails if it no longer matches the generator.
- There is no `.blend` file. Anyone with Blender can import the GLB (File → Import → glTF 2.0) and save one.
- Folds are designed, not simulated: they do not react to a body or to gravity. A cloth simulation would be the next
  step if needed; it would replace the displacement step only, not the fabric coordinates or print cutting.
- Hoodies and onesies still use the older `clothSurface` model.
