# ADR 0012: Detailed procedural drinkware instead of stock 3D meshes

- Status: accepted
- Date: 2026-10-28

## Context

The user compared our 3D mugs and tumblers with Pacdora's mockups (pacdora.com) and asked to use Pacdora's models
or open-source ones. Side-by-side renders from the same angles showed concrete defects in ours: the mug's inside was
a cone (one line from the floor centre to the rim), handles were round wire tubes with kinks, rims were flat, and the
40 oz handled tumbler had a wire handle, a dark cylinder lid and a plastic straw. The options:

- **Pacdora's models.** Proprietary. Pacdora exports only images and video, never model files, and taking the meshes
  from its website would break its terms and copyright. A paid Editor API exists, but it needs a backend and an
  account.
- **Open-source meshes.** Poly Haven (521 CC0 models) has no mug, tumbler, shirt or cap. The only free 40 oz model
  found copies a trademarked product. Sketchfab mugs carry conflicting licence labels. Any stock mesh also has its
  own scale and UV layout, while our previews must put the wrap exactly where it prints (ADR 0001, rule 7).
- **Better procedural geometry**, built to the same level of detail as Pacdora's.

## Decision

Keep drinkware procedural and model it properly (`lib/three/product-model.ts`):

- Profiles are filleted (`roundCorners`): round lips, soft feet, a foot ring under a recessed base, and a flat inside
  floor with a fillet. `vesselGeometry` lists the profile bottom to top so the lathe's normals face outwards.
- Handles are swept (`sweepGeometry`) with a superellipse section (flattened and rounded, not a round tube) that
  thickens where it meets the body. The mug's C handle follows control points measured from a reference side view.
- The 40 oz handled tumbler has a stepped cup-holder base, a satin steel rim band, a flat lid with a slider, a steel
  straw and a chunky D handle. Skinny tumblers have a frosted lid with a slider.

## Consequences

- No licence or trademark questions, and every model stays at real size with exact print placement.
- New shapes cost code, not downloads. Imported glTF models remain possible later for products where geometry alone
  cannot reach realism (cloth, caps); that would need its own ADR.
- `tests/v05-3d-models.test.ts` guards the flat floor (it fails on the old cone) and the fillet maths.
- The rendered product pictures (ADR 0011) of the changed drinkware are out of date until re-rendered.
