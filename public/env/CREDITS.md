# Environment maps

| File | Source | Author | Licence |
| --- | --- | --- | --- |
| `studio_small_09_1k.hdr` | [Poly Haven: Studio Small 09](https://polyhaven.com/a/studio_small_09) | Sergej Majboroda | [CC0 1.0](https://polyhaven.com/license) |

The 3D viewer (`src/components/products/Product3DView.tsx`) uses it for studio lighting and reflections.
The 1k file (1.6 MB, md5 `d5d7eb9d26d341d6aa4d11c1a54fd97c`) is enough: three.js filters it down to a
256 px reflection map, and the HDRI is never shown as a background.
