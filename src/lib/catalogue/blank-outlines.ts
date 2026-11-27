/**
 * Outlines of pre-cut sublimation blanks: hearts, stars, trees, bells,
 * snowflakes, dog bones, crosses, hexagons and tags.
 *
 * Suppliers publish these blanks by name and bounding size ("Heart 2.87 ×
 * 3 in"), not by outline, so the shapes here are drawn to fill exactly that
 * bounding box and stand in for the real edge: they are close enough to place
 * artwork and to show the cut guide, and the blank itself always defines the
 * finished edge. One description serves the 2D cut guide on the sheet and the
 * extruded 3D model.
 *
 * Every outline is a closed polygon in a unit box (0–1 on both axes, y down),
 * clockwise in that frame, with no self-intersections (tested).
 */

export type OutlineKind = "heart" | "star" | "tree" | "bell" | "snowflake" | "bone" | "cross" | "hexagon" | "tag";

const TAU = Math.PI * 2;

/** Scale a polygon (flat x, y list) so its bounds fill the unit box exactly. */
function normalise(points: number[]): number[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  return points.map((v, i) => (i % 2 === 0 ? (v - minX) / w : (v - minY) / h));
}

/** Signed area in a y-down frame (positive = clockwise on screen). */
function area(points: number[]): number {
  let a = 0;
  const n = points.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += points[2 * i] * points[2 * j + 1] - points[2 * j] * points[2 * i + 1];
  }
  return a / 2;
}

function clockwise(points: number[]): number[] {
  if (area(points) > 0) return points;
  const out: number[] = [];
  for (let i = points.length - 2; i >= 0; i -= 2) out.push(points[i], points[i + 1]);
  return out;
}

function heart(n = 96): number[] {
  // Classic parametric heart, y flipped so the point is at the bottom.
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push(x, y);
  }
  return pts;
}

function star(points: number, inner: number, roundness = 0): number[] {
  const pts: number[] = [];
  const steps = points * 2;
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * TAU;
    const r = i % 2 === 0 ? 1 : inner;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
    if (roundness > 0 && i % 2 === 0) {
      // A small flat at each tip so the point is not knife-sharp (real blanks are rounded).
      const b = a + roundness;
      pts.push(Math.cos(b) * r * 0.985, Math.sin(b) * r * 0.985);
    }
  }
  return pts;
}

function tree(): number[] {
  // Three tiers and a trunk, drawn clockwise from the top.
  return [
    0.5, 0, 0.72, 0.28, 0.63, 0.28, 0.84, 0.55, 0.73, 0.55, 1, 0.86, 0.58, 0.86, 0.58, 1, 0.42, 1, 0.42, 0.86, 0, 0.86, 0.27, 0.55,
    0.16, 0.55, 0.37, 0.28, 0.28, 0.28,
  ];
}

function bell(n = 48): number[] {
  // Flared bell: a profile curve mirrored, with a small loop on top.
  const right: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 top → 1 rim
    const y = 0.12 + t * 0.78;
    const x = 0.5 + 0.1 + 0.3 * Math.pow(t, 1.6) + 0.06 * Math.sin(t * Math.PI);
    right.push(Math.min(1, x), y);
  }
  const pts: number[] = [0.44, 0, 0.56, 0, 0.58, 0.12, ...right];
  pts.push(1, 0.9, 0.95, 1, 0.05, 1, 0, 0.9);
  for (let i = right.length - 2; i >= 0; i -= 2) pts.push(1 - right[i], right[i + 1]);
  pts.push(0.42, 0.12);
  return pts;
}

function bone(n = 28): number[] {
  // A vertical dog bone: two overlapping lobes at each end joined by a shaft.
  // Each lobe arc runs (clockwise in y-down) from one junction to the next:
  // the notch between the two lobes of an end, or the shaft edge.
  const r = 0.22;
  const lx = 0.3;
  const rx = 0.7;
  const top = 0.22;
  const bottom = 0.78;
  const s = 0.16; // half the shaft width
  const notch = Math.sqrt(r * r - (0.5 - lx) ** 2); // half the gap between overlapping lobes
  const shaftY = Math.sqrt(r * r - (0.5 + s - rx) ** 2); // where a lobe meets the shaft edge
  const pts: number[] = [];
  const arc = (cx: number, cy: number, from: [number, number], to: [number, number]) => {
    const a0 = Math.atan2(from[1] - cy, from[0] - cx);
    let a1 = Math.atan2(to[1] - cy, to[0] - cx);
    while (a1 <= a0) a1 += TAU;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  };
  arc(rx, top, [0.5, top - notch], [0.5 + s, top + shaftY]);
  arc(rx, bottom, [0.5 + s, bottom - shaftY], [0.5, bottom + notch]);
  arc(lx, bottom, [0.5, bottom + notch], [0.5 - s, bottom - shaftY]);
  arc(lx, top, [0.5 - s, top + shaftY], [0.5, top - notch]);
  // Arcs share their end points; drop the duplicates so no edge has zero length.
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const k = out.length;
    if (k >= 2 && Math.abs(out[k - 2] - pts[i]) < 1e-9 && Math.abs(out[k - 1] - pts[i + 1]) < 1e-9) continue;
    out.push(pts[i], pts[i + 1]);
  }
  if (Math.abs(out[0] - out[out.length - 2]) < 1e-9 && Math.abs(out[1] - out[out.length - 1]) < 1e-9) out.length -= 2;
  return out;
}

function cross(): number[] {
  // Latin cross: the cross bar a third of the way down.
  const a = 0.36;
  const b = 0.64;
  return [a, 0, b, 0, b, 0.24, 1, 0.24, 1, 0.46, b, 0.46, b, 1, a, 1, a, 0.46, 0, 0.46, 0, 0.24, a, 0.24];
}

function hexagon(): number[] {
  // Pointy-top hexagon (taller than wide, as the 2.6 × 3 in blank).
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU;
    pts.push(Math.cos(a), Math.sin(a));
  }
  return pts;
}

function tag(): number[] {
  // Gift-tag: a rectangle with the top corners clipped.
  const c = 0.22;
  return [c, 0, 1 - c, 0, 1, c * 0.7, 1, 1, 0, 1, 0, c * 0.7];
}

const CACHE = new Map<OutlineKind, number[]>();

/** The outline as a closed, clockwise polygon in the unit box (flat x, y list). */
export function outlinePoints(kind: OutlineKind): number[] {
  const hit = CACHE.get(kind);
  if (hit) return hit;
  const raw =
    kind === "heart"
      ? heart()
      : kind === "star"
        ? star(5, 0.48, 0.04)
        : kind === "tree"
          ? tree()
          : kind === "bell"
            ? bell()
            : kind === "snowflake"
              ? star(6, 0.62, 0.05)
              : kind === "bone"
                ? bone()
                : kind === "cross"
                  ? cross()
                  : kind === "hexagon"
                    ? hexagon()
                    : tag();
  const pts = clockwise(normalise(raw));
  CACHE.set(kind, pts);
  return pts;
}

/**
 * The outline for a box of `aspect` (width / height), in the unit box. A dog
 * bone lies along the long side of its box (a 38 × 25 mm tag is horizontal).
 */
export function outlineFor(kind: OutlineKind, aspect: number): number[] {
  const pts = outlinePoints(kind);
  if (kind !== "bone" || aspect <= 1) return pts;
  const swapped: number[] = [];
  for (let i = 0; i < pts.length; i += 2) swapped.push(pts[i + 1], pts[i]);
  return clockwise(swapped);
}

/** The outline scaled to a rectangle (any frame with y down), as a flat x, y list. */
export function outlineIn(kind: OutlineKind, r: { x: number; y: number; width: number; height: number }): number[] {
  return outlineFor(kind, r.width / Math.max(r.height, 1e-9)).map((v, i) => (i % 2 === 0 ? r.x + v * r.width : r.y + v * r.height));
}

export const OUTLINE_LABELS: Record<OutlineKind, string> = {
  heart: "Heart",
  star: "Star",
  tree: "Tree",
  bell: "Bell",
  snowflake: "Snowflake",
  bone: "Dog bone",
  cross: "Cross",
  hexagon: "Hexagon",
  tag: "Tag",
};
