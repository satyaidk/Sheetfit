# T-shirt 3D model

The blank crew-neck T-shirt used by every T-shirt, youth, toddler and long-sleeve template in the 3D preview, and
exported as `public/models/tshirt.glb`. Why it is generated rather than modelled by hand: [ADR 0013](../adr/0013-generated-tshirt-garment-mesh.md).

![The adult T-shirt from the front, a side and the back](../images/3d-tee-angles.png)

## Files

| Path | What it is |
| --- | --- |
| `src/lib/three/tshirt-model.ts` | The generator: sizes (`ADULT_TEE`, `YOUTH_TEE`, `TODDLER_TEE`, `ADULT_LONGSLEEVE`), garment mesh (`teeModel`), print cutting (`printPatch`, `placeInside`) |
| `src/lib/three/fabric-maps.ts` | Knit normal map and roughness map, as pixels |
| `src/lib/three/product-model.ts` | Materials, preset placement (`teePrintPlacement`), camera angles, `buildProductModel` entry |
| `src/lib/three/print-textures.ts` | The browser textures: the artwork (`printCanvas`) and the fabric maps (`knitNormalTexture`, `fabricRoughnessTexture`) |
| `scripts/export-tshirt.mjs` | Writes the GLB and PNGs (`npm run model:tshirt`) |
| `public/models/tshirt.glb` | Adult medium, white, no print: 7.9 MB, 5 meshes, 171,003 vertices, 332,352 triangles |
| `public/models/tshirt/knit-normal.png` | 256 px tileable jersey normal map, one tile = 12 mm (16 wales × 20 courses) |
| `public/models/tshirt/fabric-roughness.png` | 128 px tileable roughness (green channel, 0.80–0.95), one tile = 160 mm |
| `tests/v08-tshirt.test.ts` | Size, topology, seams, sleeves on the armhole, print size and placement, GLB is current |

## Scale and orientation

Millimetres in the app; in the GLB the meshes keep millimetres under a root node scaled by 0.001 (metres, glTF's
unit). The shirt faces +Z, +X is the wearer's left, the hem is at y = 0 and the body axis is x = z = 0.

Measured from the generator (bounding box includes sleeves and collar):

| Size | Body length (shoulder to hem) | Width, sleeve to sleeve | Height with collar | Depth | Build time (Node) |
| --- | --- | --- | --- | --- | --- |
| Adult medium | 737 mm (29 in) | 711 mm | 757 mm | 234 mm | 0.4–0.7 s |
| Youth medium (×0.78) | 575 mm | 554 mm | 590 mm | 182 mm | 0.4–2 s |
| Toddler 3T (×0.56) | 413 mm | 397 mm | 426 mm | 131 mm | 0.4 s |
| Adult long sleeve | 737 mm | 878 mm | 757 mm | 234 mm | 1.6 s |

Adult landmarks: shoulder point (206, 690, 0), armpit (207, 492, 0), front neck drop 85 mm, back neck drop 22 mm,
neck opening 184 mm wide, sleeve 206 mm along its top at 44° below horizontal, hem 25 mm, sleeve hem 22 mm, collar
20 mm high and 3.2 mm thick, fabric 1.3 mm. Sizes follow common regular-fit blank charts (29 in body length, 20 in
flat chest, 8 in sleeve, 7 in neck opening for an adult medium); the shape is as worn on a ghost mannequin, so the
body is round (about 1 m round the chest) rather than laid flat.

## Meshes and materials

| Mesh (GLB primitive) | Vertices | Triangles | Material groups |
| --- | --- | --- | --- |
| `TShirt_Body` | 78,075 | 153,664 | Fabric (outer shell, rolled hem and neck edges), Inside |
| `TShirt_Sleeve_Left` (+X) | 19,995 | 38,912 | Fabric (outer, rolled hem), Inside |
| `TShirt_Sleeve_Right` (−X) | 19,995 | 38,912 | Fabric, Inside |
| `TShirt_Collar` | 38,925 | 76,032 | Rib (ribbed folded band, closed section) |
| `TShirt_Seams` | 14,013 | 24,832 | Seam (shoulder and side seams, armholes, collar join) |

Vertex colours (`COLOR_0`) carry baked occlusion: armpits and the inside are darker. All materials are glTF PBR with
the knit normal map, the roughness map, metalness 0 and `KHR_materials_sheen`; the maps repeat with
`KHR_texture_transform`. In the app the blank colour is set at runtime and shown slightly darker than its swatch
(white cloth reflects about 80 %; a pure-white albedo burns out under studio light and hides the folds).

## Fabric (pattern) coordinates and printable areas

Every outer vertex carries flat-fabric coordinates in millimetres, measured on the cloth before the folds are added,
square to the profile lines so the mapping is isometric:

- **Front panel**: `u` from the front centre line, positive to the viewer's right (the wearer's left); `v` up from
  the hem, along the cloth.
- **Back panel**: `u` from the back centre line, positive to the viewer's right when seen from behind; `v` from the hem.
- **Sleeves**: `u` round the sleeve from its top line, positive to the viewer's right when facing the sleeve from
  outside; `v` up from the sleeve hem towards the shoulder.

Printable areas (adult medium, mm; a 22 mm margin from side seams, hems and the collar, `TeeSpec.printMargin`):

| Panel | u | v |
| --- | --- | --- |
| Front | −255 to 255 | 47 to 656 |
| Back | −242 to 242 | 47 to 701 |
| Each sleeve | −123 to 123 | 28 to 196 |

Youth, toddler and long-sleeve areas scale with the size; they are in the GLB's `asset.extras.printable` and in
`teeModel(spec).printable`.

Presets keep their placement areas, drawn on the 2D outlines (`outlines.ts`): the area's centre is carried over to
the fabric (`teePrintPlacement`), at the preset's true size, and moved inside the printable area if it pokes out
(`placeInside`). On the adult shirt a full front (11 × 11 in) is centred at u = 0, v = 388 mm; a left chest
(3.5 × 3.5 in) at u = 149 mm, v = 518 mm (219 mm below the shoulder). A test checks that every apparel preset lands
inside its panel's printable area.

## UV layout (atlas)

`TEXCOORD_0` lays every part out at true scale in one square, 1 UV unit = 2000 mm (`TEE_UV_MM`), with no overlaps:

| Island | Origin (mm) | Contents |
| --- | --- | --- |
| Torso | (20, 20) | front centre at u = 20 + C/2, back centre at both side edges |
| Left sleeve | (20, 900) | top line in the middle |
| Right sleeve | (720, 900) | top line in the middle |
| Collar | (20, 1640) | along the neckline × round the band |

Texel density is the same everywhere, so tiling maps (the knit) have one thread size on every part. The GLB's v runs
down the image, as glTF requires. Prints do not use the atlas (see below), so their resolution does not depend on it.

## How artwork reaches the shirt

1. The editor renders the design's print box on its own (`designImageUrl`): the image fitted, aligned, cropped,
   padded and flipped exactly as it will print, without the box's position or rotation on the sheet.
2. `printCanvas` puts it on a 2048 px canvas with the box's aspect: on white for sublimation (multiplied over the
   fabric, so dark blanks swallow it as real dye does), with transparency for DTF (an opaque film on top).
3. `printPatch` cuts the panel's own triangles to the print rectangle and the printable area, lifts them 0.35 mm
   along the normals and maps the rectangle to UV 0–1. The print follows every fold and keeps its aspect; a print
   larger than the area is cut, never squeezed.
4. Changing the design, colour or process rebuilds only materials and the print mesh; the garment geometry is
   cached per size and cloned for each model (`tests/v08-tshirt.test.ts` checks the cache is untouched).

Moving and scaling the artwork is done in the editor (fit mode, alignment, crop, padding, box size) and appears on
the shirt at once. The 3D preview is a mockup: its lighting and fabric shading never reach the exported files, which
come from the shared render plan (ADR 0003).

## Integration

```ts
import { buildProductModel } from "@/lib/three/product-model";

const model = buildProductModel(findProduct("tee-full-front")!, {
  color: "#ffffff",
  process: "dtf",
  textures: { overlay: artTexture, knit, knitRoughness }, // from print-textures.ts
});
scene.add(model.group); // dispose with disposeModel(model.group)
```

`Product3DView` does this already, and also applies `model.viewAzimuth`, `frontAzimuth`, `viewElevation` (sleeves open
from above the shoulder) and `environment` (matte cloth takes less studio fill light).

To use the GLB elsewhere: load it with any glTF 2.0 loader (three.js `GLTFLoader` was checked: all meshes, materials,
sheen and maps load without warnings). Regenerate it after changing the generator: `npm run model:tshirt`.

## Validation

- `npm run check` (lint, types, 216 tests, build). The T-shirt suite checks real size, unit normals, outward-facing
  outer fabric, a seamless back centre, sleeves that start on the armhole and stay outside the body, a round crew neck,
  every size, print area on the cloth equal to the transfer within 3 % on all four panels, prints within 5 mm of the
  cloth, every preset on the right panel and inside its printable area, the cached geometry unchanged by print swaps,
  the fabric maps, and the GLB matching the generator.
- Rendered in headless Chrome from the front, back, both sides, three-quarter front and back, an elevated view and a
  close-up, in white and black, and for all 12 T-shirt placements, with no console errors.

## Known limitations

- The folds are designed, not simulated; they do not respond to a body, gravity or the print.
- The collar's 3 mm ribs are below a pixel at product distance; they are kept shallow so they do not alias.
- One adult size (medium); other adult sizes would be new `TeeSpec`s.
- No `.blend` file (Blender was not available). Import the GLB in Blender to get one.
- The GLB is white with no print; prints are a runtime layer in the app.
- Hoodies and onesies still use the older outline-based model.
