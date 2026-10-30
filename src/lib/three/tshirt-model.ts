/**
 * A blank crew-neck T-shirt as a real garment mesh, at real size (1 unit = 1 mm).
 *
 * Why generated, not downloaded (ADR 0013): no openly licensed T-shirt mesh
 * comes with SheetFit's print placements, and a scanned mesh would need its
 * own UV work for every size. Generating the shirt the way it is sewn gives
 * exact sizes, clean grid topology and fabric coordinates for free, and the
 * same code exports `public/models/tshirt.glb` (`scripts/export-tshirt.mjs`).
 *
 * How it is built:
 * - Torso: a tube from the hem to the neckline. Every column (an angle round
 *   the body) follows a profile up the side of the body, over a filleted
 *   shoulder (or upper chest, or upper back) to the neck. Cross-sections are
 *   superellipses, wider than deep, deeper at the chest than at the back.
 * - Sleeves: tapered tubes whose top line continues the shoulder and whose
 *   underside meets the body at the armpit. Each line along a sleeve is cut
 *   where it meets the torso, so the sleeve joins the body along the armhole
 *   without poking through it.
 * - Fabric: two shells 1.3 mm apart joined by a rolled edge at the hem and
 *   sleeve hems, so the openings show real thickness and a darker inside.
 * - Detail: folded hem bands with two coverstitch grooves, drape at the hem,
 *   drag folds from the armpits and under the sleeves, a ribbed collar,
 *   raised shoulder, side and armhole seams, and baked occlusion in the
 *   vertex colours (armpits, the inside).
 *
 * Pattern coordinates: every outer vertex knows where it lies on the flat
 * fabric, in millimetres (`u` across, `v` up from the hem; sleeves: `v` up
 * from the sleeve hem). Prints are cut from the garment's own triangles in
 * these coordinates (`printPatch`), so a print lies on the cloth, follows
 * every fold, keeps its true size and never floats or sinks in.
 *
 * Only `three` and `./profile` are imported, so Node can run this file.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { roundCorners, type Corner } from "./profile";

// ---------------------------------------------------------------- sizes

export interface TeeSection {
  /** Height above the hem. */
  y: number;
  /** Half width, half depth in front and half depth at the back. */
  w: number;
  front: number;
  back: number;
}

export interface TeeSpec {
  /** Cache key and GLB name. */
  name: string;
  /** High point of the shoulder (where collar meets shoulder seam) to the hem. */
  length: number;
  /** Body cross-sections, bottom to top, as worn on a ghost mannequin (not laid flat). */
  sections: TeeSection[];
  /** Superellipse exponent of the cross-sections (2 is an ellipse, higher is boxier). */
  squareness: number;
  /** Neck opening: half width, front and back reach from the body axis, drop below the shoulder. */
  neck: { halfWidth: number; front: number; back: number; frontDrop: number; backDrop: number };
  /** Where the body turns over into the upper chest, shoulder and upper back: [height, fillet radius]. */
  shoulder: { front: [number, number]; side: [number, number]; back: [number, number] };
  sleeve: {
    /** Along the top of the sleeve, shoulder seam to hem. */
    length: number;
    /** Angle below horizontal (rad). */
    drop: number;
    /** Shoulder to armpit, measured down the side. */
    armhole: number;
    /** Half depth (front to back) where the sleeve meets the armpit. */
    rootDepth: number;
    /** Half height and half depth of the sleeve opening. */
    open: [number, number];
    /** Hem (or cuff) height. */
    hem: number;
  };
  /** Folded hem height at the bottom of the body. */
  hem: number;
  collar: { height: number; thickness: number };
  /** Distance between the outer and inner fabric surfaces. */
  thickness: number;
  /** Prints keep this far from side seams, hems and the collar. */
  printMargin: number;
}

/**
 * Adult medium, regular fit: 29 in (737 mm) body length, 20 in flat chest
 * (about 1 m round), 8 in sleeves, 7 in neck opening; from common blank
 * size charts (Gildan 5000, Bella+Canvas 3001, see docs/models/tshirt.md).
 */
export const ADULT_TEE: TeeSpec = {
  name: "tee-adult-m",
  length: 737,
  sections: [
    { y: 0, w: 206, front: 113, back: 105 },
    { y: 150, w: 204, front: 113, back: 104 },
    { y: 300, w: 202, front: 117, back: 103 },
    { y: 450, w: 207, front: 124, back: 105 },
    { y: 560, w: 212, front: 126, back: 107 },
    { y: 650, w: 216, front: 118, back: 104 },
  ],
  squareness: 2.5,
  neck: { halfWidth: 92, front: 62, back: 70, frontDrop: 85, backDrop: 22 },
  shoulder: { front: [600, 55], side: [690, 40], back: [655, 60] },
  sleeve: { length: 205, drop: 0.76, armhole: 245, rootDepth: 86, open: [72, 58], hem: 22 },
  hem: 25,
  collar: { height: 20, thickness: 3.2 },
  thickness: 1.3,
  printMargin: 22,
};

/** The same shirt with long sleeves hanging closer to the body and a cuff. */
export const ADULT_LONGSLEEVE: TeeSpec = {
  ...ADULT_TEE,
  name: "longsleeve-adult-m",
  sleeve: { length: 610, drop: 1.18, armhole: 245, rootDepth: 80, open: [46, 40], hem: 60 },
};

/** Scale every length of a spec (kids' sizes); seams, stitches and fabric stay full size. */
export function scaleTee(spec: TeeSpec, k: number, name: string): TeeSpec {
  const m = (v: number) => v * k;
  return {
    ...spec,
    name,
    length: m(spec.length),
    sections: spec.sections.map((s) => ({ y: m(s.y), w: m(s.w), front: m(s.front), back: m(s.back) })),
    neck: { halfWidth: m(spec.neck.halfWidth), front: m(spec.neck.front), back: m(spec.neck.back), frontDrop: m(spec.neck.frontDrop), backDrop: m(spec.neck.backDrop) },
    shoulder: {
      front: [m(spec.shoulder.front[0]), m(spec.shoulder.front[1])],
      side: [m(spec.shoulder.side[0]), m(spec.shoulder.side[1])],
      back: [m(spec.shoulder.back[0]), m(spec.shoulder.back[1])],
    },
    sleeve: {
      ...spec.sleeve,
      length: m(spec.sleeve.length),
      armhole: m(spec.sleeve.armhole),
      rootDepth: m(spec.sleeve.rootDepth),
      open: [m(spec.sleeve.open[0]), m(spec.sleeve.open[1])],
      hem: Math.max(14, m(spec.sleeve.hem)),
    },
    hem: Math.max(16, m(spec.hem)),
    collar: { height: Math.max(13, m(spec.collar.height)), thickness: spec.collar.thickness },
    printMargin: m(spec.printMargin),
  };
}

/** Youth medium (22 in long) and toddler 3T (15 in long). */
export const YOUTH_TEE = scaleTee(ADULT_TEE, 0.78, "tee-youth-m");
export const TODDLER_TEE = scaleTee(ADULT_TEE, 0.56, "tee-toddler-3t");

// ---------------------------------------------------------------- resolution and layout

const N_AROUND = 224; // torso columns; a multiple of 4 so front, sides and back fall on columns
const N_SLEEVE = 128;
const N_COLLAR = 864;
/** Millimetres per UV unit: one square atlas holds torso, sleeves and collar at true scale. */
export const TEE_UV_MM = 2000;
const ATLAS = { torso: [20, 20], sleeveLeft: [20, 900], sleeveRight: [720, 900], collar: [20, 1640] } as const;

// ---------------------------------------------------------------- small maths

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

function superRadius(theta: number, a: number, b: number, n: number) {
  return (Math.abs(Math.sin(theta) / a) ** n + Math.abs(Math.cos(theta) / b) ** n) ** (-1 / n);
}

/** Front, side and back weights of an angle round the body (0 = front, π/2 = the wearer's left). */
function weights(theta: number) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { f: c > 0 ? c * c : 0, b: c < 0 ? c * c : 0, s: s * s };
}

function sectionAt(spec: TeeSpec, y: number): TeeSection {
  const ss = spec.sections;
  if (y <= ss[0].y) return ss[0];
  for (let i = 1; i < ss.length; i++) {
    if (y <= ss[i].y) {
      const t = (y - ss[i - 1].y) / (ss[i].y - ss[i - 1].y);
      const a = ss[i - 1];
      const b = ss[i];
      return { y, w: a.w + (b.w - a.w) * t, front: a.front + (b.front - a.front) * t, back: a.back + (b.back - a.back) * t };
    }
  }
  return ss[ss.length - 1];
}

function bodyRadius(spec: TeeSpec, theta: number, y: number) {
  const s = sectionAt(spec, y);
  return superRadius(theta, s.w, Math.cos(theta) >= 0 ? s.front : s.back, spec.squareness);
}

function neckRadius(spec: TeeSpec, theta: number) {
  const n = spec.neck;
  return superRadius(theta, n.halfWidth, Math.cos(theta) >= 0 ? n.front : n.back, 2.2);
}

/** The torso profile at one angle: (radius, height) from the hem up to the neckline. */
export function torsoProfile(spec: TeeSpec, theta: number): THREE.Vector2[] {
  const w = weights(theta);
  const sh = spec.shoulder;
  const yc = w.f * sh.front[0] + w.s * sh.side[0] + w.b * sh.back[0];
  const fillet = w.f * sh.front[1] + w.s * sh.side[1] + w.b * sh.back[1];
  const rn = neckRadius(spec, theta);
  // A crew neck is round seen from the front: the drop follows a quarter ellipse across the neck's width.
  const across = Math.min(1, Math.abs(rn * Math.sin(theta)) / spec.neck.halfWidth);
  const drop = Math.cos(theta) >= 0 ? spec.neck.frontDrop : spec.neck.backDrop;
  const yn = spec.length - drop * Math.sqrt(1 - across * across);
  const pts: Corner[] = [[bodyRadius(spec, theta, 0), 0]];
  // Intermediate sections get huge fillets (clamped to half of each edge): a smooth wall, no kinks.
  for (const s of spec.sections) if (s.y > 0 && s.y < yc - 0.04 * spec.length) pts.push([bodyRadius(spec, theta, s.y), s.y, 1e4]);
  pts.push([bodyRadius(spec, theta, yc), yc, fillet], [rn, yn]);
  return roundCorners(pts, 12);
}

function cumulative(pts: THREE.Vector2[]) {
  const c = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) c[i] = c[i - 1] + pts[i].distanceTo(pts[i - 1]);
  return c;
}

function sampleAt(pts: THREE.Vector2[], cum: Float64Array, s: number, out = new THREE.Vector2()) {
  let lo = 0;
  let hi = pts.length - 1;
  if (s <= 0) return out.copy(pts[0]);
  if (s >= cum[hi]) return out.copy(pts[hi]);
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const t = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return out.copy(pts[lo]).lerp(pts[hi], t);
}

/**
 * The torso as a field: its radius at any angle and height, for testing
 * whether a point is inside the body (used to cut the sleeves at the armhole).
 * Heights along a profile only ever rise, so radius is a function of height.
 */
class TorsoField {
  private readonly steps = 720;
  private readonly radii: Float32Array;
  private readonly rows: number;
  // A plain field, not a parameter property: Node's type stripping does not support those.
  constructor(spec: TeeSpec) {
    this.rows = Math.ceil(spec.length) + 1;
    this.radii = new Float32Array((this.steps + 1) * this.rows).fill(NaN);
    for (let i = 0; i <= this.steps; i++) {
      const pts = torsoProfile(spec, -Math.PI + (2 * Math.PI * i) / this.steps);
      let seg = 1;
      for (let y = 0; y < this.rows; y++) {
        while (seg < pts.length - 1 && pts[seg].y < y) seg++;
        const a = pts[seg - 1];
        const b = pts[seg];
        if (y > b.y) break;
        const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
        this.radii[i * this.rows + y] = a.x + (b.x - a.x) * Math.min(1, Math.max(0, t));
      }
    }
  }
  /** Radius of the body surface at an angle and height, or NaN above the neckline. */
  radius(theta: number, y: number): number {
    if (y < 0) return NaN;
    const fi = ((theta + Math.PI) / (2 * Math.PI)) * this.steps;
    const i = Math.min(this.steps - 1, Math.max(0, Math.floor(fi)));
    const ti = fi - i;
    const fy = Math.min(this.rows - 1.001, y);
    const j = Math.floor(fy);
    const tj = fy - j;
    const r = (ii: number, jj: number) => this.radii[ii * this.rows + jj];
    const v = (r(i, j) * (1 - tj) + r(i, j + 1) * tj) * (1 - ti) + (r(i + 1, j) * (1 - tj) + r(i + 1, j + 1) * tj) * ti;
    return v;
  }
  inside(p: THREE.Vector3): boolean {
    const r = this.radius(Math.atan2(p.x, p.z), p.y);
    return Number.isFinite(r) && Math.hypot(p.x, p.z) < r;
  }
}

// ---------------------------------------------------------------- mesh assembly

type MaterialKind = "fabric" | "inside" | "rib" | "seam";

/** Collects vertices and triangles; triangles are grouped by material, in the order added. */
class MeshBuilder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  groups: { start: number; count: number; materialIndex: number }[] = [];
  vertex(p: ArrayLike<number>, po: number, n: ArrayLike<number>, no: number, u: number, v: number, ao: number, flipNormal = false) {
    const s = flipNormal ? -1 : 1;
    this.pos.push(p[po], p[po + 1], p[po + 2]);
    this.nor.push(s * n[no], s * n[no + 1], s * n[no + 2]);
    this.uv.push(u / TEE_UV_MM, v / TEE_UV_MM);
    this.col.push(ao, ao, ao);
    return this.pos.length / 3 - 1;
  }
  /** Triangles of a (cols × rows) grid of vertices starting at `base`, row-major. */
  grid(base: number, cols: number, rows: number, flip: boolean, materialIndex: number) {
    const start = this.idx.length;
    for (let k = 0; k < rows - 1; k++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = base + k * cols + j;
        const b = a + 1;
        const d = a + cols;
        const c = d + 1;
        if (flip) this.idx.push(a, c, b, a, d, c);
        else this.idx.push(a, b, c, a, c, d);
      }
    }
    this.addGroup(start, materialIndex);
  }
  private addGroup(start: number, materialIndex: number) {
    const last = this.groups[this.groups.length - 1];
    if (last && last.materialIndex === materialIndex && last.start + last.count === start) last.count += this.idx.length - start;
    else this.groups.push({ start, count: this.idx.length - start, materialIndex });
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    for (const gr of this.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * Vertex normals of a row-major grid by central differences. `wrapJ`: the
 * last column repeats the first (closed round the body), so normals match
 * across the join and no seam shows in the shading.
 */
function gridNormals(P: Float32Array, cols: number, rows: number, wrapJ: boolean, wrapK = false): Float32Array {
  const N = new Float32Array(P.length);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const at = (k: number, j: number, v: THREE.Vector3) => v.fromArray(P, (k * cols + j) * 3);
  const t1 = new THREE.Vector3();
  const t2 = new THREE.Vector3();
  for (let k = 0; k < rows; k++) {
    const km = k > 0 ? k - 1 : wrapK ? rows - 2 : 0;
    const kp = k < rows - 1 ? k + 1 : wrapK ? 1 : rows - 1;
    for (let j = 0; j < cols; j++) {
      const jm = j > 0 ? j - 1 : wrapJ ? cols - 2 : 0;
      const jp = j < cols - 1 ? j + 1 : wrapJ ? 1 : cols - 1;
      t1.subVectors(at(k, jp, a), at(k, jm, b));
      t2.subVectors(at(kp, j, a), at(km, j, b));
      t1.cross(t2).normalize();
      t1.toArray(N, (k * cols + j) * 3);
    }
  }
  return N;
}

/** Whether a grid's (column, row) winding faces against `outward` at a sample vertex (so it must be flipped). */
function needsFlip(P: Float32Array, cols: number, rows: number, outward: THREE.Vector3, k = rows >> 1, j = cols >> 1) {
  const p = new THREE.Vector3().fromArray(P, (k * cols + j) * 3);
  const dj = new THREE.Vector3().fromArray(P, (k * cols + j + 1) * 3).sub(p);
  const dk = new THREE.Vector3().fromArray(P, ((k + 1) * cols + j) * 3).sub(p);
  return dj.cross(dk).dot(outward) < 0;
}

/** Folded hem: the double fabric stands a little proud, with two coverstitch grooves near its top. */
function hemRelief(v: number, hem: number) {
  return 0.42 * (1 - smooth(hem - 1.2, hem + 1.2, v)) - 0.34 * (gauss(v, hem - 1.6, 0.55) + gauss(v, hem - 8, 0.55));
}

/** Rolled edge joining an outer edge row to the inner shell (thickness `t`), as a half round. */
function addRim(mb: MeshBuilder, P: Float32Array, N: Float32Array, cols: number, edgeRow: number, nextRow: number, t: number, uvAt: (j: number) => [number, number], materialIndex: number) {
  const STEPS = 6;
  const pts = new Float32Array(cols * (STEPS + 1) * 3);
  const nor = new Float32Array(pts.length);
  const e = new THREE.Vector3();
  const n = new THREE.Vector3();
  const out = new THREE.Vector3();
  const q = new THREE.Vector3();
  const qn = new THREE.Vector3();
  for (let j = 0; j < cols; j++) {
    e.fromArray(P, (edgeRow * cols + j) * 3);
    n.fromArray(N, (edgeRow * cols + j) * 3);
    out.subVectors(e, q.fromArray(P, (nextRow * cols + j) * 3)).normalize();
    for (let s = 0; s <= STEPS; s++) {
      const beta = (Math.PI * s) / STEPS;
      q.copy(e).addScaledVector(n, -t / 2 + (t / 2) * Math.cos(beta)).addScaledVector(out, (t / 2) * Math.sin(beta));
      qn.copy(n).multiplyScalar(Math.cos(beta)).addScaledVector(out, Math.sin(beta)).normalize();
      q.toArray(pts, (s * cols + j) * 3);
      qn.toArray(nor, (s * cols + j) * 3);
    }
  }
  const base = mb.pos.length / 3;
  for (let s = 0; s <= STEPS; s++) for (let j = 0; j < cols; j++) mb.vertex(pts, (s * cols + j) * 3, nor, (s * cols + j) * 3, ...uvAt(j), 1);
  const ref = new THREE.Vector3().fromArray(nor, ((STEPS >> 1) * cols + (cols >> 1)) * 3);
  mb.grid(base, cols, STEPS + 1, needsFlip(pts, cols, STEPS + 1, ref, STEPS >> 1), materialIndex);
}

/** Inner shell: the outer rows `rowsIn`, moved inward by the fabric thickness, facing in. */
function addInner(mb: MeshBuilder, P: Float32Array, N: Float32Array, cols: number, rowsIn: number[], t: number, uvAt: (k: number, j: number) => [number, number], aoAt: (k: number, j: number) => number) {
  const pts = new Float32Array(cols * rowsIn.length * 3);
  rowsIn.forEach((k, r) => {
    for (let j = 0; j < cols; j++) {
      const o = (k * cols + j) * 3;
      const w = (r * cols + j) * 3;
      for (let c = 0; c < 3; c++) pts[w + c] = P[o + c] - N[o + c] * t;
    }
  });
  const base = mb.pos.length / 3;
  rowsIn.forEach((k, r) => {
    for (let j = 0; j < cols; j++) mb.vertex(pts, (r * cols + j) * 3, N, (k * cols + j) * 3, ...uvAt(k, j), aoAt(k, j), true);
  });
  const mid = rowsIn.length >> 1;
  const inward = new THREE.Vector3().fromArray(N, (rowsIn[mid] * cols + (cols >> 1)) * 3).negate();
  mb.grid(base, cols, rowsIn.length, needsFlip(pts, cols, rowsIn.length, inward, mid), 1);
}

// ---------------------------------------------------------------- panels and prints

export type TeePanel = "front" | "back" | "sleeveLeft" | "sleeveRight";

/** The outer surface of one panel, with flat-fabric coordinates per vertex (mm). */
export interface PanelSurface {
  position: Float32Array;
  normal: Float32Array;
  /** (u, v) per vertex: u across (to the viewer's right when looking at the panel), v up. */
  coord: Float32Array;
  /** Triangles of the outer surface. */
  index: Uint32Array;
}

export interface PrintRect {
  /** Centre and size on the flat fabric (mm). */
  u: number;
  v: number;
  w: number;
  h: number;
}

export interface TeePart {
  name: string;
  geometry: THREE.BufferGeometry;
  /** Material of each geometry group, in group order. */
  materials: MaterialKind[];
}

export interface TeeModel {
  spec: TeeSpec;
  parts: TeePart[];
  panels: Record<TeePanel, PanelSurface>;
  /** Where prints may go on each panel, in that panel's fabric coordinates. */
  printable: Record<TeePanel, { u0: number; u1: number; v0: number; v1: number }>;
  /** Measurements used to place prints: arc from the front centre to the side seam at the chest, sleeve top length, neck heights. */
  landmarks: { frontHalfArc: number; backHalfArc: number; sleeveTop: number; frontNeckV: number; backNeckV: number };
  /** Lowest point of the armhole and the shoulder point (+x side), for tests and docs. */
  armpit: THREE.Vector3;
  shoulderPoint: THREE.Vector3;
}

// ---------------------------------------------------------------- build

interface SleeveShape {
  side: 1 | -1;
  /** Points on the armhole (on the torso) and on the hem opening; `phi` runs round the sleeve: 0 on top, +π/2 in front. */
  hole: (phi: number) => THREE.Vector3;
  open: (phi: number) => THREE.Vector3;
  /** Direction of the sleeve (out and down). */
  d: THREE.Vector3;
  holeCentre: THREE.Vector3;
  openCentre: THREE.Vector3;
  shoulder: THREE.Vector3;
  armpit: THREE.Vector3;
}

/**
 * A sleeve as it is sewn: the armhole is a loop drawn on the torso (an
 * ellipse seen from the side, from the shoulder point down to the armpit),
 * the hem an ellipse across the sleeve, and the sleeve runs between them.
 * Starting on the body's own surface, it meets the torso exactly along the
 * armhole and never passes through it.
 */
function sleeveShape(spec: TeeSpec, field: TorsoField, side: 1 | -1): SleeveShape {
  const sl = spec.sleeve;
  const yTop = spec.shoulder.side[0];
  const yBot = spec.length - sl.armhole;
  const yMid = (yTop + yBot) / 2;
  const ah = (yTop - yBot) / 2;
  const sink = 1.5;
  const p = new THREE.Vector3();
  // Distance from the body axis to the surface at a height and depth (the body is symmetric, so +x serves both sides).
  const surfaceX = (y: number, z: number) => {
    let lo = 0.45 * sectionAt(spec, y).w;
    let hi = 2 * sectionAt(spec, y).w;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (field.inside(p.set(mid, y, z))) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const hole = (phi: number) => {
    const y = yMid + ah * Math.cos(phi);
    const z = sl.rootDepth * Math.sin(phi);
    return new THREE.Vector3(side * (surfaceX(y, z) - sink), y, z);
  };
  const shoulder = hole(0);
  const armpit = hole(Math.PI);
  const d = new THREE.Vector3(side * Math.cos(sl.drop), -Math.sin(sl.drop), 0);
  // Across the sleeve, in the plane of the sleeve and the vertical: points down and in, towards the underarm.
  const e1 = new THREE.Vector3(0, -1, 0).addScaledVector(d, -Math.sin(sl.drop)).normalize();
  const [a1, b1] = sl.open;
  const openCentre = shoulder.clone().addScaledVector(d, sl.length).addScaledVector(e1, a1);
  const open = (phi: number) =>
    openCentre
      .clone()
      .addScaledVector(e1, -a1 * Math.cos(phi))
      .add(new THREE.Vector3(0, 0, b1 * Math.sin(phi)));
  const holeCentre = new THREE.Vector3(side * surfaceX(yMid, 0), yMid, 0);
  return { side, hole, open, d, holeCentre, openCentre, shoulder, armpit };
}

/** One line along the sleeve, armhole to hem, bowed out over the shoulder (the sleeve cap) and less underneath. */
function sleeveLine(sh: SleeveShape, phi: number, samples = 48): THREE.Vector3[] {
  const h = sh.hole(phi);
  const o = sh.open(phi);
  const cap = 4 + (7 * (1 + Math.cos(phi))) / 2;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const q = h.clone().lerp(o, t);
    const radial = q.clone().sub(sh.holeCentre.clone().lerp(sh.openCentre, t)).normalize();
    pts.push(q.addScaledVector(radial, cap * Math.sin(Math.PI * t) * (1 - t * 0.5)));
  }
  return pts;
}

function cumulative3(pts: THREE.Vector3[]) {
  const c = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) c[i] = c[i - 1] + pts[i].distanceTo(pts[i - 1]);
  return c;
}

function sample3(pts: THREE.Vector3[], cum: Float64Array, s: number, out: THREE.Vector3) {
  let i = 1;
  while (i < pts.length - 1 && cum[i] < s) i++;
  const t = Math.min(1, Math.max(0, (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)));
  return out.copy(pts[i - 1]).lerp(pts[i], t);
}

/**
 * Distance across the fabric between two neighbouring columns of a row,
 * measured square to the columns: rows may climb (they do towards the
 * shoulders), and measuring along them would stretch the fabric coordinates.
 */
function across(B: Float32Array, cols: number, rows: number, r: number, ja: number, jb: number) {
  const at = (k: number, j: number) => new THREE.Vector3().fromArray(B, (k * cols + j) * 3);
  const rm = Math.max(0, r - 1);
  const rp = Math.min(rows - 1, r + 1);
  const t = at(rp, ja).sub(at(rm, ja)).add(at(rp, jb).sub(at(rm, jb))).normalize();
  const d = at(r, jb).sub(at(r, ja));
  return d.addScaledVector(t, -d.dot(t)).length();
}

interface SleeveBuild {
  P: Float32Array;
  N: Float32Array;
  coord: Float32Array;
  rows: number;
  cols: number;
  /** Underside weight per column, for occlusion near the armpit. */
  under: Float32Array;
  index: Uint32Array;
}

function buildSleeve(spec: TeeSpec, sh: SleeveShape, mb: MeshBuilder, atlas: readonly [number, number]): SleeveBuild {
  const cols = N_SLEEVE + 1;
  const hem = spec.sleeve.hem;
  const hz = hem + 9;
  const nH = Math.ceil(hz / 0.65);
  const nM = Math.max(24, Math.round(spec.sleeve.length / 5));
  const rows = nM + nH + 1;
  const long = spec.sleeve.length > 400;
  const B = new Float32Array(cols * rows * 3);
  const vArr = new Float32Array(cols * rows);
  const lArr = new Float32Array(cols);
  const under = new Float32Array(cols);
  const q = new THREE.Vector3();
  for (let j = 0; j < cols; j++) {
    // Columns start and end under the arm (the underarm seam), with the top of the sleeve in the middle.
    const phi = -Math.PI + (2 * Math.PI * j) / N_SLEEVE;
    const line = sleeveLine(sh, phi);
    const cum = cumulative3(line);
    const l = cum[cum.length - 1];
    lArr[j] = l;
    under[j] = smooth(1.9, 2.8, Math.abs(phi));
    const hzj = Math.min(hz, l * 0.55);
    for (let k = 0; k < rows; k++) {
      // v: distance from the hem, up the sleeve; k = 0 at the armhole.
      const v = k < nM ? l - ((l - hzj) * k) / nM : hzj * (1 - (k - nM) / nH);
      sample3(line, cum, l - v, q).toArray(B, (k * cols + j) * 3);
      vArr[k * cols + j] = v;
    }
  }
  // Fabric u: across the sleeve from the top line, to the viewer's right when facing the sleeve from outside.
  const coord = new Float32Array(cols * rows * 2);
  const top = N_SLEEVE / 2;
  for (let k = 0; k < rows; k++) {
    const arc = new Float32Array(cols);
    for (let j = top + 1; j < cols; j++) arc[j] = arc[j - 1] + across(B, cols, rows, k, j - 1, j);
    for (let j = top - 1; j >= 0; j--) arc[j] = arc[j + 1] - across(B, cols, rows, k, j, j + 1);
    for (let j = 0; j < cols; j++) {
      coord[(k * cols + j) * 2] = -sh.side * arc[j];
      coord[(k * cols + j) * 2 + 1] = vArr[k * cols + j];
    }
  }
  const outward = new THREE.Vector3(0, 1, 0).sub(sh.d.clone().multiplyScalar(sh.d.y)).normalize(); // up, at the top line
  const flip = needsFlip(B, cols, rows, outward, rows >> 1, top);
  const sign = flip ? -1 : 1;
  const Nb = gridNormals(B, cols, rows, true);
  for (let i = 0; i < Nb.length; i++) Nb[i] *= sign;
  const P = new Float32Array(B.length);
  for (let k = 0; k < rows; k++) {
    for (let j = 0; j < cols; j++) {
      const phi = -Math.PI + (2 * Math.PI * j) / N_SLEEVE;
      const v = vArr[k * cols + j];
      const fromRoot = lArr[j] - v;
      let D = hemRelief(v, hem);
      // Fabric bunches under the arm, near the body.
      D += 3.6 * under[j] * (1 - smooth(0, 70, fromRoot)) * Math.sin(fromRoot / 11 + phi * 2);
      // Soft drape along the sleeve.
      D += 1.8 * Math.sin(phi * 3 + v / 37) * smooth(hem + 5, hem + 30, v);
      // Long sleeves stack above the cuff.
      if (long) D += 2.2 * Math.sin(v / 16 + phi * 2) * smooth(hem, hem + 25, v) * (1 - smooth(hem + 90, hem + 150, v));
      const o = (k * cols + j) * 3;
      for (let c = 0; c < 3; c++) P[o + c] = B[o + c] + Nb[o + c] * D;
    }
  }
  const N = gridNormals(P, cols, rows, true);
  for (let i = 0; i < N.length; i++) N[i] *= sign;

  const circ = Math.max(...Array.from({ length: rows }, (_, k) => coord[(k * cols + cols - 1) * 2] - coord[k * cols * 2]).map(Math.abs));
  const uvAt = (k: number, j: number): [number, number] => [atlas[0] + circ / 2 + coord[(k * cols + j) * 2] * -sh.side, atlas[1] + vArr[k * cols + j]];
  const aoOut = (k: number, j: number) => 1 - 0.3 * under[j] * Math.exp(-(lArr[j] - vArr[k * cols + j]) / 30);
  const base = mb.pos.length / 3;
  for (let k = 0; k < rows; k++) for (let j = 0; j < cols; j++) mb.vertex(P, (k * cols + j) * 3, N, (k * cols + j) * 3, ...uvAt(k, j), aoOut(k, j));
  mb.grid(base, cols, rows, flip, 0);
  addRim(mb, P, N, cols, rows - 1, rows - 2, spec.thickness, (j) => uvAt(rows - 1, j), 0);
  const rowsIn = Array.from({ length: rows }, (_, k) => k).filter((k) => k < nM || (k - nM) % 3 === 0 || k === rows - 1);
  addInner(mb, P, N, cols, rowsIn, spec.thickness, uvAt, (k) => 0.5 + 0.32 * (1 - smooth(0, 90, vArr[k * cols + top])));

  const index: number[] = [];
  for (let k = 0; k < rows - 1; k++)
    for (let j = 0; j < cols - 1; j++) {
      const a = k * cols + j;
      const b = a + 1;
      const d = a + cols;
      const c = d + 1;
      if (flip) index.push(a, c, b, a, d, c);
      else index.push(a, b, c, a, c, d);
    }
  return { P, N, coord, rows, cols, under, index: new Uint32Array(index) };
}

/** A raised seam: a thin tube along points, sunk so only a ridge stands proud. */
function seamTube(points: THREE.Vector3[], radius: number, closed: boolean) {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  return new THREE.TubeGeometry(curve, Math.max(16, points.length * 2), radius, 8, closed);
}

const cache = new Map<string, TeeModel>();

/** Build (once per size) the T-shirt geometry and its panels. Treat the result as read-only. */
export function teeModel(spec: TeeSpec = ADULT_TEE): TeeModel {
  const hit = cache.get(spec.name);
  if (hit) return hit;
  const model = buildTee(spec);
  cache.set(spec.name, model);
  return model;
}

function buildTee(spec: TeeSpec): TeeModel {
  const field = new TorsoField(spec);
  const k = spec.length / ADULT_TEE.length;
  const L = spec.sleeve;
  // +x is the wearer's left (the shirt faces +z).
  const leftArm = sleeveShape(spec, field, 1);
  const rightArm = sleeveShape(spec, field, -1);

  // ---- torso grid
  const cols = N_AROUND + 1;
  const profiles: { pts: THREE.Vector2[]; cum: Float64Array }[] = [];
  for (let j = 0; j < cols; j++) {
    if (j === N_AROUND) profiles.push(profiles[0]);
    else {
      const pts = torsoProfile(spec, -Math.PI + (2 * Math.PI * j) / N_AROUND);
      profiles.push({ pts, cum: cumulative(pts) });
    }
  }
  const jFront = N_AROUND / 2;
  const jLeft = (3 * N_AROUND) / 4; // +x, the wearer's left
  const hz = spec.hem + 9;
  const nH = Math.ceil(hz / 0.65);
  const tz = 12 * k;
  const nT = 8;
  const sFront = profiles[jFront].cum[profiles[jFront].cum.length - 1];
  const nM = Math.round((sFront - hz - tz) / 5.2);
  const rows = nH + nM + nT + 1;
  const sAt = (j: number, r: number) => {
    const S = profiles[j].cum[profiles[j].cum.length - 1];
    if (r < nH) return (hz * r) / nH;
    if (r < nH + nM) return hz + ((S - tz - hz) * (r - nH)) / nM;
    return S - tz + (tz * (r - nH - nM)) / nT;
  };
  const B = new Float32Array(cols * rows * 3);
  const V = new Float32Array(cols * rows);
  const pv = new THREE.Vector2();
  for (let j = 0; j < cols; j++) {
    const theta = -Math.PI + (2 * Math.PI * j) / N_AROUND;
    const { pts, cum } = profiles[j];
    for (let r = 0; r < rows; r++) {
      const s = sAt(j, r);
      sampleAt(pts, cum, s, pv);
      const o = (r * cols + j) * 3;
      B[o] = pv.x * Math.sin(theta);
      B[o + 1] = pv.y;
      B[o + 2] = pv.x * Math.cos(theta);
      V[r * cols + j] = s;
    }
  }
  // Fabric u along each row from the front centre; C is the row's full round.
  const U = new Float32Array(cols * rows);
  const C = new Float32Array(rows);
  const uSide = new Float32Array(rows);
  for (let r = 0; r < rows; r++) {
    for (let j = jFront + 1; j < cols; j++) U[r * cols + j] = U[r * cols + j - 1] + across(B, cols, rows, r, j - 1, j);
    for (let j = jFront - 1; j >= 0; j--) U[r * cols + j] = U[r * cols + j + 1] - across(B, cols, rows, r, j, j + 1);
    C[r] = U[r * cols + cols - 1] - U[r * cols];
    uSide[r] = U[r * cols + jLeft];
  }
  const Cmax = Math.max(...C);
  const flipT = needsFlip(B, cols, rows, new THREE.Vector3(0, 0, 1), rows >> 1, jFront);
  const signT = flipT ? -1 : 1;
  const Nb = gridNormals(B, cols, rows, true);
  for (let i = 0; i < Nb.length; i++) Nb[i] *= signT;

  // The armpit's height in fabric v, on the side column.
  const side = profiles[jLeft];
  let vArmpit = 0;
  for (let i = 1; i < side.pts.length; i++) if (side.pts[i].y >= leftArm.armpit.y) {
    const t = (leftArm.armpit.y - side.pts[i - 1].y) / (side.pts[i].y - side.pts[i - 1].y || 1);
    vArmpit = side.cum[i - 1] + (side.cum[i] - side.cum[i - 1]) * t;
    break;
  }

  const P = new Float32Array(B.length);
  for (let r = 0; r < rows; r++) {
    for (let j = 0; j < cols; j++) {
      const i = r * cols + j;
      const u = U[i];
      const v = V[i];
      const S = profiles[j].cum[profiles[j].cum.length - 1];
      const au = Math.abs(u);
      const front = au <= uSide[r];
      const xin = front ? uSide[r] - au : au - uSide[r];
      // Folds measured from the side seams must fade out at the centre lines, where |u| has a kink.
      const centre = smooth(10 * k, 70 * k, front ? au : C[r] / 2 - au);
      // Angle round the body: waves in it close up seamlessly at the back centre, where u jumps by a whole round.
      const round = (wavelength: number) => (2 * Math.PI * Math.max(1, Math.round(C[r] / (2 * Math.PI * wavelength * k))) * u) / C[r];
      let D = hemRelief(v, spec.hem);
      // Drape: the hem hangs in soft waves that die away up the body.
      D += 3.2 * k * (1 - smooth(20 * k, 260 * k, v)) * (0.65 * Math.sin(round(41) + 0.9 * Math.sin(v / (73 * k))) + 0.35 * Math.sin(round(17.5) + 1.3));
      // Drag folds fanning from each armpit towards the chest (front) and the shoulder blades (back).
      const dv = vArmpit - v;
      const rr = Math.hypot(xin, dv);
      const ang = Math.atan2(dv, xin);
      const fan = smooth(-0.25, 0.15, ang) * (1 - smooth(0.95, 1.35, ang));
      D += (front ? 6 : 4.5) * k * centre * fan * smooth(8 * k, 40 * k, rr) * Math.exp(-rr / (120 * k)) * Math.sin(ang * 10 + 0.4);
      // Ripples down the sides at the waist, where the cloth gathers.
      D += 1.8 * k * Math.exp(-xin / (55 * k)) * Math.sin(v / (30 * k) + 0.7) * smooth(110 * k, 180 * k, v) * (1 - smooth(380 * k, 460 * k, v));
      // Broad, low swells over the whole body: cloth is never perfectly smooth.
      D += 1.6 * k * Math.sin(round(95) + 1.7 * Math.sin(v / (180 * k))) * Math.sin(v / (140 * k) + 0.5);
      // Soft vertical folds below the shoulder blades.
      if (!front) D += 2 * k * centre * Math.sin(xin / (48 * k)) * smooth(260 * k, 360 * k, v) * (1 - smooth(520 * k, 600 * k, v)) * smooth(30 * k, 90 * k, xin);
      // The neckline stays clean under the collar.
      D *= 1 - smooth(S - 60 * k, S - 15 * k, v) * (v > spec.hem + 10 ? 1 : 0);
      const o = i * 3;
      for (let c = 0; c < 3; c++) P[o + c] = B[o + c] + Nb[o + c] * D;
    }
  }
  const N = gridNormals(P, cols, rows, true);
  for (let i = 0; i < N.length; i++) N[i] *= signT;

  // Sleeves (built first so the torso can be darkened where they meet it).
  const sleeveMb = { left: new MeshBuilder(), right: new MeshBuilder() };
  const sLeft = buildSleeve(spec, leftArm, sleeveMb.left, ATLAS.sleeveLeft);
  const sRight = buildSleeve(spec, rightArm, sleeveMb.right, ATLAS.sleeveRight);

  // Occlusion on the torso near the underside of each armhole.
  const ring: { p: THREE.Vector3; w: number }[] = [];
  for (const s of [sLeft, sRight]) for (let j = 0; j < s.cols - 1; j++) if (s.under[j] > 0.02) ring.push({ p: new THREE.Vector3().fromArray(s.P, j * 3), w: s.under[j] });
  const occ = new Float32Array(cols * rows);
  const pp = new THREE.Vector3();
  for (let i = 0; i < cols * rows; i++) {
    pp.fromArray(P, i * 3);
    if (pp.y < leftArm.armpit.y - 220 * k || Math.abs(pp.x) < 90 * k) continue;
    let o = 0;
    for (const q of ring) o = Math.max(o, q.w * Math.exp(-pp.distanceTo(q.p) / (28 * k)));
    occ[i] = o;
  }

  const body = new MeshBuilder();
  const uvT = (r: number, j: number): [number, number] => [ATLAS.torso[0] + U[r * cols + j] + Cmax / 2, ATLAS.torso[1] + V[r * cols + j]];
  for (let r = 0; r < rows; r++) for (let j = 0; j < cols; j++) body.vertex(P, (r * cols + j) * 3, N, (r * cols + j) * 3, ...uvT(r, j), 1 - 0.32 * occ[r * cols + j]);
  body.grid(0, cols, rows, flipT, 0);
  addRim(body, P, N, cols, 0, 1, spec.thickness, (j) => uvT(0, j), 0);
  addRim(body, P, N, cols, rows - 1, rows - 2, spec.thickness, (j) => uvT(rows - 1, j), 0);
  const rowsIn = Array.from({ length: rows }, (_, r) => r).filter((r) => r >= nH || r % 3 === 0);
  addInner(body, P, N, cols, rowsIn, spec.thickness, uvT, (r, j) => {
    const v = V[r * cols + j];
    const S = profiles[j].cum[profiles[j].cum.length - 1];
    return Math.min(0.86, 0.48 + 0.34 * (1 - smooth(0, 180 * k, v)) + 0.3 * smooth(S - 140 * k, S, v));
  });

  // ---- collar: a folded rib band along the neckline
  const top = rows - 1;
  const neckPts: THREE.Vector3[] = [];
  const Ucol: THREE.Vector3[] = [];
  const Ocol: THREE.Vector3[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let j = 0; j < N_AROUND; j++) {
    const p = new THREE.Vector3().fromArray(P, (top * cols + j) * 3);
    const tangent = p.clone().sub(new THREE.Vector3().fromArray(P, ((top - 4) * cols + j) * 3)).normalize();
    const uDir = tangent.multiplyScalar(0.25).addScaledVector(up, 0.75).normalize();
    const n = new THREE.Vector3().fromArray(N, (top * cols + j) * 3);
    const oDir = n.addScaledVector(uDir, -n.dot(uDir)).normalize();
    neckPts.push(p);
    Ucol.push(uDir);
    Ocol.push(oDir);
  }
  const neckCurve = new THREE.CatmullRomCurve3(neckPts, true, "centripetal");
  const neckLen = neckCurve.getLength();
  const tc = spec.collar.thickness;
  const hc = spec.collar.height;
  const oOut = 1.0;
  const oIn = oOut - tc;
  const sectionPts = roundCorners(
    [
      [(oOut + oIn) / 2, -3],
      [oOut, -3, 0.6],
      [oOut, hc, tc / 2],
      [oIn, hc, tc / 2],
      [oIn, -3, 0.6],
      [(oOut + oIn) / 2, -3],
    ],
    8,
  );
  const sCum = cumulative(sectionPts);
  const Q = 44;
  const sec: THREE.Vector2[] = [];
  for (let q = 0; q <= Q; q++) sec.push(sampleAt(sectionPts, sCum, (sCum[sCum.length - 1] * q) / Q));
  const ccols = Q + 1;
  const crows = N_COLLAR + 1;
  const CP = new Float32Array(ccols * crows * 3);
  const sideFace = sec.map((s, q) => {
    const prev = sec[Math.max(0, q - 1)];
    const next = sec[Math.min(Q, q + 1)];
    return Math.abs(next.y - prev.y) > Math.abs(next.x - prev.x) * 1.5 ? Math.sign(s.x - (oOut + oIn) / 2) : 0;
  });
  for (let i = 0; i < crows; i++) {
    const uu = (i % N_COLLAR) / N_COLLAR;
    // A zero distance means "map u", which is what we want.
    const t = neckCurve.getUtoTmapping(uu, 0);
    const p = neckCurve.getPointAt(uu);
    const fj = t * N_AROUND;
    const j0 = Math.floor(fj) % N_AROUND;
    const j1 = (j0 + 1) % N_AROUND;
    const w = fj - Math.floor(fj);
    const uDir = Ucol[j0].clone().lerp(Ucol[j1], w).normalize();
    const oDir = Ocol[j0].clone().lerp(Ocol[j1], w).normalize();
    const rib = 0.12 * Math.cos((2 * Math.PI * Math.round(neckLen / 3) * uu));
    for (let q = 0; q < ccols; q++) {
      const s = sec[q];
      const along = Math.min(1, smooth(-3, 2, s.y) * (1 - smooth(hc - 2.5, hc, s.y) * 0.6));
      const x = s.x + sideFace[q] * rib * along;
      const o = (i * ccols + q) * 3;
      CP[o] = p.x + oDir.x * x + uDir.x * s.y;
      CP[o + 1] = p.y + oDir.y * x + uDir.y * s.y;
      CP[o + 2] = p.z + oDir.z * x + uDir.z * s.y;
    }
  }
  const CN = gridNormals(CP, ccols, crows, true, true);
  const qOuter = sec.findIndex((s, q) => sideFace[q] > 0 && s.y > hc / 2);
  const flipC = needsFlip(CP, ccols, crows, Ocol[0], 0, qOuter);
  if (flipC) for (let i = 0; i < CN.length; i++) CN[i] *= -1;
  const collar = new MeshBuilder();
  for (let i = 0; i < crows; i++)
    for (let q = 0; q < ccols; q++) {
      const ao = sideFace[q] < 0 ? 0.74 : sec[q].y < 1 ? 0.85 : 1;
      collar.vertex(CP, (i * ccols + q) * 3, CN, (i * ccols + q) * 3, ATLAS.collar[0] + (neckLen * i) / N_COLLAR, ATLAS.collar[1] + sCum[sCum.length - 1] * (q / Q), ao);
    }
  collar.grid(0, ccols, crows, flipC, 0);

  // ---- seams: shoulder and side seams, armholes, and the collar join
  const seamPts = (jCol: number) => {
    const out: THREE.Vector3[] = [];
    for (let r = 0; r < rows; r += r < nH ? 3 : 1) {
      const o = (r * cols + jCol) * 3;
      out.push(new THREE.Vector3(P[o] - N[o] * 0.55, P[o + 1] - N[o + 1] * 0.55, P[o + 2] - N[o + 2] * 0.55));
    }
    return out;
  };
  const armhole = (s: SleeveBuild) => Array.from({ length: s.cols - 1 }, (_, j) => new THREE.Vector3().fromArray(s.P, j * 3));
  const seams = mergeGeometries([
    seamTube(seamPts(jLeft), 0.95, false),
    seamTube(seamPts(N_AROUND / 4), 0.95, false),
    seamTube(armhole(sLeft), 1.3, true),
    seamTube(armhole(sRight), 1.3, true),
    seamTube(
      neckPts.map((p, j) => p.clone().addScaledVector(Ocol[j], 0.45).addScaledVector(Ucol[j], 0.2)),
      0.85,
      true,
    ),
  ])!;

  const parts: TeePart[] = [
    { name: "TShirt_Body", geometry: body.build(), materials: ["fabric", "inside"] },
    { name: "TShirt_Sleeve_Left", geometry: sleeveMb.left.build(), materials: ["fabric", "inside"] },
    { name: "TShirt_Sleeve_Right", geometry: sleeveMb.right.build(), materials: ["fabric", "inside"] },
    { name: "TShirt_Collar", geometry: collar.build(), materials: ["rib"] },
    { name: "TShirt_Seams", geometry: seams, materials: ["seam"] },
  ];

  // ---- panels: the outer surfaces with fabric coordinates
  const torsoIndex: number[] = [];
  for (let r = 0; r < rows - 1; r++)
    for (let j = 0; j < cols - 1; j++) {
      const a = r * cols + j;
      const b = a + 1;
      const d = a + cols;
      const c = d + 1;
      if (flipT) torsoIndex.push(a, c, b, a, d, c);
      else torsoIndex.push(a, b, c, a, c, d);
    }
  const frontCoord = new Float32Array(cols * rows * 2);
  const backCoord = new Float32Array(cols * rows * 2);
  for (let r = 0; r < rows; r++)
    for (let j = 0; j < cols; j++) {
      const i = r * cols + j;
      frontCoord[i * 2] = U[i];
      frontCoord[i * 2 + 1] = V[i];
      // Seen from behind, the viewer's right is the wearer's right (-x); u = 0 on the back centre.
      backCoord[i * 2] = U[i] > 0 ? U[i] - C[r] / 2 : U[i] + C[r] / 2;
      backCoord[i * 2 + 1] = V[i];
    }
  const tIndex = new Uint32Array(torsoIndex);
  const chestRow = (() => {
    let best = 0;
    for (let r = 0; r < rows; r++) if (Math.abs(V[r * cols + jFront] - 0.62 * spec.length) < Math.abs(V[best * cols + jFront] - 0.62 * spec.length)) best = r;
    return best;
  })();
  const frontHalfArc = uSide[chestRow];
  const backHalfArc = C[chestRow] / 2 - uSide[chestRow];
  const frontNeckV = V[top * cols + jFront];
  const backNeckV = V[top * cols];
  const sleeveTop = sLeft.coord[(N_SLEEVE / 2) * 2 + 1];
  const m = spec.printMargin;
  const sleeveCirc = 2 * Math.PI * Math.sqrt((L.open[0] ** 2 + L.open[1] ** 2) / 2);
  const sleeveBox = { u0: -0.3 * sleeveCirc, u1: 0.3 * sleeveCirc, v0: L.hem + 6, v1: sleeveTop - 10 };
  return {
    spec,
    parts,
    panels: {
      front: { position: P, normal: N, coord: frontCoord, index: tIndex },
      back: { position: P, normal: N, coord: backCoord, index: tIndex },
      sleeveLeft: { position: sLeft.P, normal: sLeft.N, coord: sLeft.coord, index: sLeft.index },
      sleeveRight: { position: sRight.P, normal: sRight.N, coord: sRight.coord, index: sRight.index },
    },
    printable: {
      front: { u0: -(frontHalfArc - m), u1: frontHalfArc - m, v0: spec.hem + m, v1: frontNeckV - m },
      back: { u0: -(backHalfArc - m), u1: backHalfArc - m, v0: spec.hem + m, v1: backNeckV - m },
      sleeveLeft: sleeveBox,
      sleeveRight: sleeveBox,
    },
    landmarks: { frontHalfArc, backHalfArc, sleeveTop, frontNeckV, backNeckV },
    armpit: leftArm.armpit,
    shoulderPoint: leftArm.shoulder,
  };
}

// ---------------------------------------------------------------- prints

interface ClipVertex {
  p: THREE.Vector3;
  n: THREE.Vector3;
  u: number;
  v: number;
}

function clip(poly: ClipVertex[], inside: (c: ClipVertex) => number): ClipVertex[] {
  const out: ClipVertex[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = inside(a);
    const db = inside(b);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push({ p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t), u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t });
    }
  }
  return out;
}

/**
 * Move a print so it lies within the panel's printable area (keeping its
 * size). A print larger than the area stays centred on it; `printPatch` then
 * cuts off what falls outside rather than shrinking the design.
 */
export function placeInside(model: TeeModel, panel: TeePanel, rect: PrintRect): PrintRect {
  const a = model.printable[panel];
  const fit = (c: number, size: number, lo: number, hi: number) => (size >= hi - lo ? (lo + hi) / 2 : Math.min(hi - size / 2, Math.max(lo + size / 2, c)));
  return { ...rect, u: fit(rect.u, rect.w, a.u0, a.u1), v: fit(rect.v, rect.h, a.v0, a.v1) };
}

/**
 * The print as its own mesh: the panel's triangles inside `rect` (fabric mm),
 * cut exactly at its edges and lifted `lift` mm off the cloth along the
 * normals. UVs run 0 to 1 across the rect, so the design keeps its aspect;
 * anything outside the panel's printable area is cut away, never squeezed in.
 */
export function printPatch(model: TeeModel, panel: TeePanel, rect: PrintRect, lift = 0.35): THREE.BufferGeometry | null {
  const s = model.panels[panel];
  const area = model.printable[panel];
  const u0 = rect.u - rect.w / 2;
  const v0 = rect.v - rect.h / 2;
  const lo = { u: Math.max(u0, area.u0), v: Math.max(v0, area.v0) };
  const hi = { u: Math.min(u0 + rect.w, area.u1), v: Math.min(v0 + rect.h, area.v1) };
  if (hi.u <= lo.u || hi.v <= lo.v) return null;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const vert = (i: number): ClipVertex => ({
    p: new THREE.Vector3().fromArray(s.position, i * 3),
    n: new THREE.Vector3().fromArray(s.normal, i * 3),
    u: s.coord[i * 2],
    v: s.coord[i * 2 + 1],
  });
  for (let t = 0; t < s.index.length; t += 3) {
    const ia = s.index[t];
    const ib = s.index[t + 1];
    const ic = s.index[t + 2];
    const us = [s.coord[ia * 2], s.coord[ib * 2], s.coord[ic * 2]];
    const vs = [s.coord[ia * 2 + 1], s.coord[ib * 2 + 1], s.coord[ic * 2 + 1]];
    // Skip triangles across the coordinate seam (u jumps by a whole round there).
    if (Math.max(...us) - Math.min(...us) > 100) continue;
    if (Math.max(...us) < lo.u || Math.min(...us) > hi.u || Math.max(...vs) < lo.v || Math.min(...vs) > hi.v) continue;
    let poly = [vert(ia), vert(ib), vert(ic)];
    poly = clip(poly, (c) => c.u - lo.u);
    poly = clip(poly, (c) => hi.u - c.u);
    poly = clip(poly, (c) => c.v - lo.v);
    poly = clip(poly, (c) => hi.v - c.v);
    for (let i = 1; i + 1 < poly.length; i++) {
      for (const c of [poly[0], poly[i], poly[i + 1]]) {
        const n = c.n.clone().normalize();
        positions.push(c.p.x + n.x * lift, c.p.y + n.y * lift, c.p.z + n.z * lift);
        normals.push(n.x, n.y, n.z);
        uvs.push((c.u - u0) / rect.w, (c.v - v0) / rect.h);
      }
    }
  }
  if (!positions.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}

/** Total area of a triangle-soup geometry (mm²), for checking prints keep their true size. */
export function surfaceArea(g: THREE.BufferGeometry): number {
  const p = g.getAttribute("position");
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let sum = 0;
  const count = g.index ? g.index.count : p.count;
  for (let i = 0; i < count; i += 3) {
    const ia = g.index ? g.index.getX(i) : i;
    const ib = g.index ? g.index.getX(i + 1) : i + 1;
    const ic = g.index ? g.index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(p, ia);
    b.fromBufferAttribute(p, ib).sub(a);
    c.fromBufferAttribute(p, ic).sub(a);
    sum += b.cross(c).length() / 2;
  }
  return sum;
}

