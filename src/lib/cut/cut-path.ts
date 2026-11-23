/**
 * Cut paths: the line a knife, a cutting plotter or scissors follows.
 *
 * A design has three nested rectangles that must never be confused:
 *
 *   box    the design box, the artwork area including bleed (what prints)
 *   trim   the box inset by `bleed`: the finished product edge
 *   cut    the actual cut path: the trim (rect, rounded rect, ellipse) moved
 *          out by `cut.offset`, or a contour traced from the artwork
 *
 * plus a safe area inside the trim (`cut.safeInset`) that is an editor guide
 * only. All geometry here is in millimetres in the design's *local* frame
 * (origin at the box centre, x right, y down, before rotation), exactly like
 * the render plan, so every renderer draws the same path with its own
 * transform. Paths are simple commands (move, line, cubic, close) so PDF,
 * canvas and SVG can all draw them as true vectors.
 */

import type { CutSpec, Design } from "@/types/editor";
import type { Rect } from "@/lib/image/image-fit";
import { findProduct } from "@/lib/catalogue/products";

export type PathCmd =
  | { op: "M"; x: number; y: number }
  | { op: "L"; x: number; y: number }
  | { op: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: "Z" };

export type Path = PathCmd[];

/** Cubic Bézier constant for a quarter circle. */
const KAPPA = 0.5522847498307936;

type BoxDesign = Pick<Design, "width" | "height" | "bleed">;

/** Box rectangle in local coordinates. */
export function localBox(d: Pick<Design, "width" | "height">): Rect {
  return { x: -d.width / 2, y: -d.height / 2, width: d.width, height: d.height };
}

/** Trim rectangle (box minus bleed) in local coordinates. */
export function localTrim(d: BoxDesign): Rect {
  const b = Math.max(0, Math.min(d.bleed, d.width / 2, d.height / 2));
  return { x: -d.width / 2 + b, y: -d.height / 2 + b, width: d.width - 2 * b, height: d.height - 2 * b };
}

export function insetRect(r: Rect, by: number): Rect {
  const k = Math.min(by, r.width / 2, r.height / 2);
  return { x: r.x + k, y: r.y + k, width: r.width - 2 * k, height: r.height - 2 * k };
}

export function outsetRect(r: Rect, by: number): Rect {
  if (by < 0) return insetRect(r, -by);
  return { x: r.x - by, y: r.y - by, width: r.width + 2 * by, height: r.height + 2 * by };
}

/** Rectangle with optional rounded corners (radius clamped to half the short side). */
export function roundedRectPath(r: Rect, radius = 0): Path {
  const rad = Math.max(0, Math.min(radius, r.width / 2, r.height / 2));
  const { x, y, width: w, height: h } = r;
  if (rad <= 1e-9) {
    return [
      { op: "M", x, y },
      { op: "L", x: x + w, y },
      { op: "L", x: x + w, y: y + h },
      { op: "L", x, y: y + h },
      { op: "Z" },
    ];
  }
  const k = rad * KAPPA;
  return [
    { op: "M", x: x + rad, y },
    { op: "L", x: x + w - rad, y },
    { op: "C", x1: x + w - rad + k, y1: y, x2: x + w, y2: y + rad - k, x: x + w, y: y + rad },
    { op: "L", x: x + w, y: y + h - rad },
    { op: "C", x1: x + w, y1: y + h - rad + k, x2: x + w - rad + k, y2: y + h, x: x + w - rad, y: y + h },
    { op: "L", x: x + rad, y: y + h },
    { op: "C", x1: x + rad - k, y1: y + h, x2: x, y2: y + h - rad + k, x, y: y + h - rad },
    { op: "L", x, y: y + rad },
    { op: "C", x1: x, y1: y + rad - k, x2: x + rad - k, y2: y, x: x + rad, y },
    { op: "Z" },
  ];
}

/** Ellipse inscribed in a rectangle, as four cubic arcs. */
export function ellipsePath(r: Rect): Path {
  const rx = r.width / 2;
  const ry = r.height / 2;
  const cx = r.x + rx;
  const cy = r.y + ry;
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { op: "M", x: cx + rx, y: cy },
    { op: "C", x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
    { op: "C", x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
    { op: "C", x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
    { op: "C", x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
    { op: "Z" },
  ];
}

/** Closed polygon from flat [x0, y0, x1, y1, ...] points. */
export function polygonPath(points: number[]): Path {
  const path: Path = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    path.push(i === 0 ? { op: "M", x: points[0], y: points[1] } : { op: "L", x: points[i], y: points[i + 1] });
  }
  if (path.length > 0) path.push({ op: "Z" });
  return path;
}

/**
 * The cut spec a design really uses: its own, or the default its product
 * implies (round products cut as an ellipse, cards with their corner radius),
 * or a plain cut at the trim.
 */
export function resolvedCut(d: Pick<Design, "cut" | "productId">): CutSpec {
  if (d.cut) return d.cut;
  const p = findProduct(d.productId);
  return {
    shape: p?.shape === "circle" ? "ellipse" : "rect",
    radius: p?.cornerRadius ?? 0,
    offset: 0,
    through: "die",
    safeInset: 0,
    contour: null,
  };
}

/** Cut paths of a design in local coordinates (several for contour islands). */
export function cutPaths(d: BoxDesign & Pick<Design, "cut" | "productId">): Path[] {
  const cut = resolvedCut(d);
  const trim = localTrim(d);
  if (cut.shape === "contour") {
    const paths = cut.contour?.paths ?? [];
    if (paths.length > 0) {
      return paths.map((flat) => {
        const pts: number[] = [];
        for (let i = 0; i + 1 < flat.length; i += 2) {
          pts.push(-d.width / 2 + flat[i] * d.width, -d.height / 2 + flat[i + 1] * d.height);
        }
        return polygonPath(pts);
      });
    }
    // No contour generated yet: fall back to the trim rectangle so nothing goes uncut.
    return [roundedRectPath(trim, 0)];
  }
  const outline = outsetRect(trim, cut.offset);
  if (cut.shape === "ellipse") return [ellipsePath(outline)];
  return [roundedRectPath(outline, cut.radius + Math.max(0, cut.offset))];
}

/** Inputs a contour depends on; when they change, the stored contour is out of date. */
export function contourKey(
  d: Pick<Design, "assetId" | "crop" | "view" | "fitMode" | "flipX" | "flipY" | "padding" | "alignX" | "alignY">,
): string {
  return JSON.stringify([d.assetId, d.crop, d.view ?? null, d.fitMode, d.flipX, d.flipY, d.padding, d.alignX, d.alignY]);
}

/** True when a contour cut no longer matches the artwork, box size or offset it was traced for. */
export function contourIsStale(d: Design): boolean {
  const c = d.cut;
  if (!c || c.shape !== "contour") return false;
  const g = c.contour?.generatedFor;
  if (!g) return true;
  return (
    g.assetId !== d.assetId ||
    Math.abs(g.width - d.width) > 0.01 ||
    Math.abs(g.height - d.height) > 0.01 ||
    Math.abs(g.offset - c.offset) > 1e-6 ||
    g.key !== contourKey(d)
  );
}

/** Safe-area guide (inside the trim), or null when the design has none. */
export function safeAreaPath(d: BoxDesign & Pick<Design, "cut" | "productId">): Path | null {
  const cut = resolvedCut(d);
  if (cut.safeInset <= 0 || cut.shape === "contour") return null;
  const r = insetRect(localTrim(d), cut.safeInset);
  return cut.shape === "ellipse" ? ellipsePath(r) : roundedRectPath(r, Math.max(0, cut.radius - cut.safeInset));
}

/** Bounding rectangle of paths (control points included: conservative and exact for our arcs). */
export function pathsBounds(paths: Path[]): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const path of paths) {
    for (const c of path) {
      if (c.op === "Z") continue;
      if (c.op === "C") {
        add(c.x1, c.y1);
        add(c.x2, c.y2);
      }
      add(c.x, c.y);
    }
  }
  return Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null;
}

/** Apply a point transform to every coordinate of a path. */
export function mapPath(path: Path, f: (x: number, y: number) => { x: number; y: number }): Path {
  return path.map((c) => {
    if (c.op === "Z") return c;
    if (c.op === "C") {
      const p1 = f(c.x1, c.y1);
      const p2 = f(c.x2, c.y2);
      const p = f(c.x, c.y);
      return { op: "C", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y };
    }
    const p = f(c.x, c.y);
    return { op: c.op, x: p.x, y: p.y };
  });
}

const num = (v: number) => +v.toFixed(4);

/** SVG path data. */
export function pathToSvgD(path: Path): string {
  return path
    .map((c) =>
      c.op === "Z"
        ? "Z"
        : c.op === "C"
          ? `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`
          : `${c.op}${num(c.x)} ${num(c.y)}`,
    )
    .join(" ");
}

/* ------------------------------ validation ------------------------------ */

export interface PathProblem {
  kind: "open" | "too-few-points" | "self-intersecting" | "too-small" | "not-finite";
  message: string;
}

function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Signed area of a flat polygon (positive = clockwise in a y-down frame). */
export function polygonArea(points: number[]): number {
  let a = 0;
  const n = points.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += points[2 * i] * points[2 * j + 1] - points[2 * j] * points[2 * i + 1];
  }
  return a / 2;
}

/**
 * Check a polygon cut path: finite, at least three points, a real area and no
 * self-intersection (a cutter would cut a figure eight). O(n²); contours are
 * simplified to a few hundred points before this runs.
 */
export function validatePolygon(points: number[], minArea = 1e-6): PathProblem[] {
  const problems: PathProblem[] = [];
  if (points.some((v) => !Number.isFinite(v))) return [{ kind: "not-finite", message: "The cut path has invalid coordinates." }];
  const n = Math.floor(points.length / 2);
  if (n < 3) return [{ kind: "too-few-points", message: "A cut path needs at least three points." }];
  if (Math.abs(polygonArea(points)) <= minArea) problems.push({ kind: "too-small", message: "The cut path encloses no area." });
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    for (let j = i + 1; j < n; j++) {
      const j2 = (j + 1) % n;
      if (i === j2 || j === i2) continue; // neighbours share a point
      if (
        segmentsIntersect(
          points[2 * i], points[2 * i + 1], points[2 * i2], points[2 * i2 + 1],
          points[2 * j], points[2 * j + 1], points[2 * j2], points[2 * j2 + 1],
        )
      ) {
        problems.push({ kind: "self-intersecting", message: "The cut path crosses itself." });
        return problems;
      }
    }
  }
  return problems;
}

/** Validate a path made of M/L/Z commands (curves are produced by us and are always valid). */
export function validatePath(path: Path): PathProblem[] {
  if (path.length === 0) return [{ kind: "too-few-points", message: "The cut path is empty." }];
  if (path[path.length - 1].op !== "Z") return [{ kind: "open", message: "The cut path is not closed." }];
  if (path.some((c) => c.op === "C")) return [];
  const pts = path.flatMap((c) => (c.op === "Z" ? [] : [c.x, c.y]));
  return validatePolygon(pts);
}
