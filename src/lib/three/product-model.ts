/**
 * Procedural 3D models of every product, at real size (1 unit = 1 mm).
 *
 * Each product's illustration kind maps to a builder:
 *
 * - Drinkware is lathed from a filleted radius profile (mugs, tumblers, cans,
 *   bottles): round lips, soft feet, a flat inside floor. Handles are swept
 *   with a moulded section; lids, straws and saucers are separate parts. The
 *   circumference comes from the wrap width; for handled mugs a gap is added
 *   for the handle, which the wrap does not cover. The print band is a thin
 *   lathe just outside the body, so its texture follows tapers exactly.
 * - Flat goods are bevelled slabs cut from their outline (round, rounded
 *   rectangle, stadium, chamfered tag) with holes, rings, strings and the
 *   right back (cork, rubber, magnet, aluminium).
 * - T-shirts (adult, youth, toddler, long sleeve) are full garment meshes from
 *   `tshirt-model.ts`: torso, set-in sleeves, ribbed collar, seams, hems, real
 *   fabric thickness. Prints are cut from the shirt's own surface in flat
 *   fabric coordinates, so they follow the folds at true size (ADR 0013).
 * - Hoodies and onesies extrude the outlines the 2D mockups use
 *   (`outlines.ts`) into a soft, slightly curved body; the print is a layer on
 *   the front at its true size and position.
 * - Caps, totes and flags have their own builders.
 *
 * Builders only create geometry and materials; the browser layer supplies the
 * textures (`print-textures.ts`), so the models can be built and checked in
 * unit tests without a canvas.
 */

import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { WRAP_SEAM_MM, type ProductPreset } from "@/lib/catalogue/products";
import { shade } from "@/lib/catalogue/colors";
import { OUTLINES, parsePath } from "@/lib/catalogue/outlines";
import { outlineFor } from "@/lib/catalogue/blank-outlines";
import type { PrintProcess } from "@/types/editor";
import { roundCorners, type Corner } from "./profile";
import { ADULT_LONGSLEEVE, ADULT_TEE, TODDLER_TEE, YOUTH_TEE, printPatch, placeInside, teeModel, type PrintRect, type TeeModel, type TeePanel, type TeeSpec } from "./tshirt-model";

export { roundCorners };

export type ModelProduct = Pick<ProductPreset, "id" | "art" | "artArea" | "wrap" | "width" | "height" | "bleed" | "group" | "shape" | "side" | "outline">;

/** How the design reaches the model: baked into an opaque print texture, or laid over fabric. */
export type PrintStyle = "wrap" | "face" | "overlay";

export function printStyle(p: Pick<ProductPreset, "wrap" | "group" | "art">): PrintStyle {
  if (p.wrap) return "wrap";
  if (p.group === "apparel" || p.art === "cap" || p.art === "tote") return "overlay";
  return "face";
}

/**
 * Part of the slot image that lands on the product, as fractions of the slot:
 * wraps lose the seam overlap (it is hidden under the other end), flat goods
 * lose their bleed (it wraps past the edge), overlays use the whole box.
 */
export function printCrop(p: ModelProduct): { x: number; y: number; w: number; h: number } {
  if (p.wrap) {
    const slotW = p.width + WRAP_SEAM_MM;
    return { x: WRAP_SEAM_MM / 2 / slotW, y: 0, w: p.width / slotW, h: 1 };
  }
  if (printStyle(p) === "face" && p.bleed > 0) {
    const sw = p.width + 2 * p.bleed;
    const sh = p.height + 2 * p.bleed;
    return { x: p.bleed / sw, y: p.bleed / sh, w: p.width / sw, h: p.height / sh };
  }
  return { x: 0, y: 0, w: 1, h: 1 };
}

export interface ModelTextures {
  /** Opaque print (blank colour + design) for wraps, flat faces and flags. */
  print: THREE.Texture | null;
  /** The design alone for garments, caps and totes (white background for sublimation). */
  overlay: THREE.Texture | null;
  /** Tileable woven-fabric normal map. */
  weave: THREE.Texture | null;
  /** Cork colour texture for coaster backs. */
  cork: THREE.Texture | null;
  /** Jersey knit normal map and roughness variation for T-shirts (repeats set for `TEE_UV_MM`). */
  knit: THREE.Texture | null;
  knitRoughness: THREE.Texture | null;
}

export interface ModelOptions {
  /** Blank colour (hex). */
  color: string;
  process: PrintProcess;
  textures?: Partial<ModelTextures>;
  /**
   * The design's own cut outline, box-relative (0–1 of the box, y down; a
   * border may reach past 0–1). Die-cut stickers are extruded from it.
   */
  cutOutline?: number[] | null;
  /** Kiss-cut stickers sit on their backing sheet. */
  kissCut?: boolean;
}

export interface ProductModel {
  group: THREE.Group;
  /** The family of builder used, for tests and diagnostics. */
  family: "drinkware" | "flat" | "garment" | "cap" | "tote" | "flag" | "pillow" | "bracelet" | "strap";
  /** Meshes carrying the print, for tests. */
  printMeshes: THREE.Mesh[];
  /** Camera angle around the vertical axis (rad from +Z) that shows the print best. */
  viewAzimuth: number;
  /** Azimuth that faces the centre of the print (Front view); 0 unless the print is turned away, as on handled mugs. */
  frontAzimuth?: number;
  /** Camera height for the opening and preset views (rad above the horizon); the viewer's default when absent. */
  viewElevation?: number;
  /**
   * Share of the studio's environment light (1 = the viewer's default). Matte
   * cloth takes its shape from the key light; the full studio fill, lighting
   * it evenly from every side, flattens the folds. (three.js applies one
   * environment intensity to the whole scene, so it is set per model.)
   */
  environment?: number;
}

// ---------------------------------------------------------------- materials

const tex = (o: ModelOptions, k: keyof ModelTextures) => o.textures?.[k] ?? null;

function ceramic(color: string) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide });
}
function coated(color: string) {
  // Sublimation polymer coating on steel: glossy, slightly less than glaze.
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
}
function steel(color = "#c9ced3", roughness = 0.32) {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness, side: THREE.DoubleSide });
}
function plastic(color: string, roughness = 0.45) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 0.3 });
}
function clearPlastic() {
  return new THREE.MeshPhysicalMaterial({ color: "#f2f6f9", roughness: 0.08, transmission: 0.85, thickness: 1.5, ior: 1.45 });
}
function glass() {
  return new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.03, transmission: 1, thickness: 2.5, ior: 1.5, side: THREE.DoubleSide });
}
function rubber(color = "#1c1c1f") {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
}
function wood(color = "#c9a46b") {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
}
function fabric(color: string, o: ModelOptions, roughness = 0.94) {
  const weave = tex(o, "weave");
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    sheen: 0.6,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(shade(color, -0.35)),
    normalMap: weave,
    normalScale: new THREE.Vector2(0.45, 0.45),
  });
}
/** Printed surface: the composite print texture (or the blank colour when there is no design yet). */
function printMaterial(o: ModelOptions, finish: { roughness: number; clearcoat?: number; metalness?: number }, side: THREE.Side = THREE.FrontSide) {
  const map = tex(o, "print");
  return new THREE.MeshPhysicalMaterial({
    color: map ? "#ffffff" : o.color,
    map,
    roughness: finish.roughness,
    clearcoat: finish.clearcoat ?? 0,
    clearcoatRoughness: 0.08,
    metalness: finish.metalness ?? 0,
    side,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}
/**
 * The design on fabric. Sublimation dye is transparent: multiply the design
 * (on white) over the lit fabric, so dark blanks swallow it as they do in
 * reality. DTF is an opaque film with a slight sheen, drawn on top.
 */
function overlayMaterial(o: ModelOptions) {
  const map = tex(o, "overlay");
  if (!map) return null;
  if (o.process === "sublimation") {
    return new THREE.MeshBasicMaterial({
      map,
      // White must stay exactly white (no ink); tone mapping would grey it.
      toneMapped: false,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    map,
    transparent: true,
    alphaTest: 0.04,
    roughness: 0.55,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], shadows = true) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  return m;
}

// ---------------------------------------------------------------- drinkware

type Profile = [r: number, y: number][];

/** Radius of a profile at height y (linear between points). */
function radiusAt(profile: Profile, y: number): number {
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1];
    const [r1, y1] = profile[i];
    if (y <= y1 || i === profile.length - 1) {
      const t = y1 === y0 ? 0 : Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
      return r0 + (r1 - r0) * t;
    }
  }
  return profile[profile.length - 1][0];
}

interface VesselOptions {
  /** Wall thickness at the rim; the lip is a half round of this width. */
  wall: number;
  /** Height of the inside floor (thick ceramic bases, insulated steel). */
  floor: number;
  /** Fillet on the outer bottom edge. */
  foot: number;
  /** Fillet where the inside wall meets the floor. */
  inside: number;
  /** Fillet on every other bend in the profile (tapers, shoulders). */
  kink?: number;
  /** Depth of the recess under the base, inside a foot ring (ceramic mugs); 0 for a flat base. */
  recess?: number;
}

/**
 * A closed vessel for the lathe, listed bottom to top so the normals face out:
 * the base (with an optional foot ring), the outer wall, a round lip, the
 * inside wall and a flat floor. Every bend is filleted; sharp corners would
 * smear the shading (the old inside ran in one line from the floor centre to
 * the rim, which drew a cone).
 */
function vesselGeometry(outer: Profile, o: VesselOptions, segments = 128) {
  const kink = o.kink ?? 2;
  const last = outer.length - 1;
  const r0 = outer[0][0];
  const base: Corner[] = o.recess ? [[0, o.recess], [r0 - 7, o.recess, 1.5], [r0 - 5, 0, 0.8]] : [[0, 0]];
  const up: Corner[] = outer.map(([r, y], i) => [r, y, i === 0 ? o.foot : i === last ? o.wall / 2 : kink]);
  const down: Corner[] = outer
    .filter(([, y]) => y > o.floor + o.inside)
    .map(([r, y], i, arr): Corner => [r - o.wall, y, i === arr.length - 1 ? o.wall / 2 : kink])
    .reverse();
  const floorR = radiusAt(outer, o.floor) - o.wall;
  const pts = roundCorners([...base, ...up, ...down, [floorR, o.floor, o.inside], [0, o.floor]]);
  return new THREE.LatheGeometry(pts, segments);
}

/** A closed lathed part (lid, cap) from a profile listed bottom to top. */
function latheClosed(profile: Corner[], material: THREE.Material, segments = 96) {
  return mesh(new THREE.LatheGeometry(roundCorners(profile), segments), material);
}

/** The print band: a lathe slice just outside the body, following its shape. */
function bandGeometry(outer: Profile, y0: number, y1: number, phiStart: number, phiLength: number) {
  const pts: THREE.Vector2[] = [];
  const n = 32;
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    pts.push(new THREE.Vector2(radiusAt(outer, y) + 0.3, y));
  }
  return new THREE.LatheGeometry(pts, 160, phiStart, phiLength);
}

/**
 * Sweeps a rounded section along a curve in the XY plane. `a` is the half
 * width across the plane (Z), `b` the half thickness within it; the section is
 * a superellipse (exponent 2 is an ellipse, higher is squarer), which reads as
 * a moulded part rather than bent wire. Normals are the section's own, so the
 * seam where the section closes is invisible.
 */
function sweepGeometry(curve: THREE.Curve<THREE.Vector3>, section: (t: number) => { a: number; b: number }, exponent: number, steps = 120, around = 40) {
  const position: number[] = [];
  const normal: number[] = [];
  const index: number[] = [];
  const Z = new THREE.Vector3(0, 0, 1);
  const N = new THREE.Vector3();
  const n = new THREE.Vector3();
  const pow = (x: number, e: number) => Math.sign(x) * Math.abs(x) ** e;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = curve.getPointAt(t);
    N.crossVectors(Z, curve.getTangentAt(t)).normalize();
    const { a, b } = section(t);
    for (let j = 0; j <= around; j++) {
      const phi = (j / around) * Math.PI * 2;
      const u = a * pow(Math.cos(phi), 2 / exponent);
      const v = b * pow(Math.sin(phi), 2 / exponent);
      position.push(p.x + N.x * v, p.y + N.y * v, p.z + u);
      // Gradient of |u/a|^e + |v/b|^e: the outward normal of the section.
      const gu = pow(u / a, exponent - 1) / a;
      const gv = pow(v / b, exponent - 1) / b;
      n.set(N.x * gv, N.y * gv, gu).normalize();
      normal.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < around; j++) {
      const k = i * (around + 1) + j;
      const k2 = k + around + 1;
      index.push(k, k2, k + 1, k2, k2 + 1, k + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  g.setIndex(index);
  return g;
}

interface HandleSection {
  /** Half width (across the handle's plane). */
  a: number;
  /** Half thickness (within the plane). */
  b: number;
  /** How much thicker the ends are where they join the body (0.35 = 35 %). */
  flare?: number;
  exponent?: number;
}

/**
 * A handle on the +X side: a path through filleted corners, swept with a
 * moulded section that thickens near the body, as a cast handle does. The ends
 * sit inside the wall, so the joins need no caps.
 */
function handle(path: Corner[], section: HandleSection, material: THREE.Material) {
  const points = roundCorners(path, 14).map((v) => new THREE.Vector3(v.x, v.y, 0));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const flare = section.flare ?? 0.35;
  const geometry = sweepGeometry(
    curve,
    (t) => {
      const k = 1 + flare * Math.max(0, 1 - Math.min(t, 1 - t) / 0.12) ** 2;
      return { a: section.a * k, b: section.b * k };
    },
    section.exponent ?? 2.6,
  );
  return mesh(geometry, material);
}

/**
 * The classic mug handle: one continuous C, nearly level where it leaves the
 * body at the top, rounding down an outer side that leans in a little, and
 * returning low. Control points are in mm for a 96 mm mug (offset from the
 * body, height) and scale with the mug; `rAt` gives the body radius at a
 * height so tapered cups get their joins on the wall.
 */
function mugHandle(rAt: (y: number) => number, H: number, material: THREE.Material) {
  const k = H / 96;
  const C: [dx: number, y: number][] = [[-2.5, 80.5], [8, 84], [21, 82.5], [31, 73], [34.5, 57.5], [31.5, 40.5], [22, 28], [10, 22.5], [-2.5, 21]];
  const R = rAt(H / 2);
  const path: Corner[] = C.map(([dx, y], i) => [(i === 0 || i === C.length - 1 ? rAt(y * k) : R) + dx * k, y * k]);
  return handle(path, { a: 9 * k, b: 4.2 * k, exponent: 2.4 }, material);
}

function cylinderPart(rTop: number, rBottom: number, h: number, y: number, material: THREE.Material, segments = 64) {
  const m = mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material);
  m.position.y = y + h / 2;
  return m;
}

/** A straw from y0 upwards, leaning a little; steel straws are thinner and stand straight. */
function straw(x: number, y0: number, length: number, kind: "clear" | "steel" = "clear", z = 0) {
  const r = kind === "steel" ? 3.6 : 3.4;
  const s = mesh(new THREE.CylinderGeometry(r, r, length, 32, 1, kind === "clear"), kind === "steel" ? steel("#d7dbdf", 0.22) : clearPlastic());
  s.position.set(x, y0 + length / 2, z);
  if (kind === "clear") s.rotation.z = -0.06;
  return s;
}

/** Frosted press-in lid: enough of a surface to read from above, still see-through. */
function lidPlastic() {
  return new THREE.MeshPhysicalMaterial({ color: "#eef2f5", roughness: 0.28, transmission: 0.55, thickness: 2, ior: 1.45, clearcoat: 0.6, clearcoatRoughness: 0.1 });
}

interface DrinkSpec {
  outer: Profile;
  /** Lathe options for the body; wall thickness is required, the rest has defaults. */
  vessel: Partial<VesselOptions> & { wall: number };
  /** Print band on the body. */
  bandY: [number, number];
  /** Angle the wrap covers (rad); 2π for seamless wraps. */
  bandAngle: number;
  body: THREE.Material;
  bandOpacity?: number;
  extras: THREE.Object3D[];
}

function drinkSpec(p: ModelProduct, o: ModelOptions): DrinkSpec {
  const w = p.width;
  const h = p.height;
  const color = o.color;
  const full = Math.PI * 2;
  switch (p.art) {
    case "mug": {
      // An 11 oz mug is about 82 mm across and 96 mm tall; the wrap stops short of the handle.
      // A thick glazed wall with a round lip, a foot ring under a recessed base, a C handle.
      const C = w + 32;
      const R = C / (2 * Math.PI);
      const H = h + 7;
      const outer: Profile = [[R, 0], [R, H]];
      const body = ceramic(color);
      return {
        outer,
        vessel: { wall: 3.6, floor: 7, foot: 3, inside: 9, recess: 1.6 },
        bandY: [(H - h) / 2, (H + h) / 2],
        bandAngle: (w / C) * full,
        body,
        extras: [mugHandle(() => R, H, body)],
      };
    }
    case "enamel-mug": {
      const C = w + 26;
      const R = C / (2 * Math.PI);
      const H = h + 16;
      const outer: Profile = [[R, 0], [R, H]];
      const body = coated(color);
      const trim = steel("#b8bfc6", 0.25);
      const rim = mesh(new THREE.TorusGeometry(R - 0.6, 1.4, 16, 128), trim);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = H;
      const foot = mesh(new THREE.TorusGeometry(R - 1.2, 1.1, 12, 128), trim);
      foot.rotation.x = Math.PI / 2;
      foot.position.y = 1.1;
      // Pressed steel: a flat strip handle, enamelled with the body.
      const strip = handle(
        [
          [R - 0.8, H * 0.86],
          [R + R * 0.55, H * 0.9, 7],
          [R + R * 0.62, H * 0.52, 12],
          [R + R * 0.3, H * 0.3, 7],
          [R - 0.8, H * 0.32],
        ],
        { a: 5.5, b: 1.6, exponent: 4, flare: 0.3 },
        body,
      );
      return { outer, vessel: { wall: 1.2, floor: 1.4, foot: 1.5, inside: 3 }, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: (w / C) * full, body, extras: [rim, foot, strip] };
    }
    case "espresso": {
      const C = w + 22;
      const Rt = C / (2 * Math.PI);
      const Rb = Rt * 0.8;
      const H = h + 10;
      const outer: Profile = [[Rb, 0], [Rt, H]];
      const body = ceramic(color);
      const saucer = latheClosed(
        [[0, 0], [Rt * 1.45, 0, 1.5], [Rt * 1.85, 5.5, 3], [Rt * 1.82, 7.5, 1], [Rt * 1.45, 3.2, 6], [Rt * 0.9, 2.6, 2], [0, 2.6]],
        ceramic(color),
      );
      saucer.position.y = -6;
      return {
        outer,
        vessel: { wall: 3, floor: 6, foot: 2.5, inside: 6, recess: 1.2 },
        bandY: [(H - h) / 2, (H + h) / 2],
        bandAngle: (w / C) * full,
        body,
        extras: [saucer, mugHandle((y) => radiusAt(outer, y), H, body)],
      };
    }
    case "glass-can": {
      const R = (w * 0.94) / (2 * Math.PI);
      const H = h + 24;
      const outer: Profile = [[R - 5, 0], [R - 1, 1.5], [R, 6], [R, H - 6], [R - 2.5, H - 1], [R - 2.5, H]];
      const lid = cylinderPart(R - 1.5, R - 1.5, 8, H - 2, wood());
      return { outer, vessel: { wall: 2.2 }, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: full, body: glass(), bandOpacity: 0.94, extras: [lid, straw(R * 0.35, H - 40, 120)] };
    }
    case "tumbler": {
      // Coated steel skinny tumbler with a frosted press-in lid, a slider and a straw.
      const R = w / (2 * Math.PI);
      const H = h + 20;
      const outer: Profile = [[R, 0], [R, H]];
      const lid = latheClosed(
        [[R - 1.8, H - 10], [R - 1.8, H - 0.5, 0.5], [R + 1, H - 0.5, 0.8], [R + 1, H + 5, 1.5], [R * 0.86, H + 7, 2.5], [0, H + 7]],
        lidPlastic(),
      );
      const slider = mesh(new RoundedBoxGeometry(R * 0.7, 2.4, 11, 3, 1.1), plastic("#f4f6f8", 0.35));
      slider.position.set(-R * 0.05, H + 8, -R * 0.42);
      return {
        outer,
        vessel: { wall: 1.5, floor: 8, foot: 3, inside: 4 },
        bandY: [(H - h) / 2, (H + h) / 2],
        bandAngle: full,
        body: coated(color),
        extras: [lid, slider, straw(R * 0.3, H - 60, 210)],
      };
    }
    case "tumbler-handle": {
      // 40 oz handled tumbler: a tapered cup-holder base with a small step, a straight
      // coated body, a bare steel rim band, a flat lid with a slider and a steel
      // straw, and a chunky D handle. The base holds the bottom wrap (98 mm), the
      // straight section the top wrap; both products share one body.
      const isBottom = p.id.endsWith("bottom");
      const R = w / (2 * Math.PI);
      const hTop = isBottom ? 147.6 : h;
      const taper = 108;
      const Hs = taper + 9 + hTop;
      const H = Hs + 16;
      const outer: Profile = [[R * 0.76, 0], [R * 0.9, taper - 4], [R * 0.95, taper], [R, taper + 3], [R, H]];
      const bandY: [number, number] = isBottom ? [taper - 6 - h, taper - 6] : [taper + 5, taper + 5 + hTop];
      const body = coated(color);
      // Satin brushed steel: a mirror finish would only reflect the dark studio.
      const bare = steel("#dfe2e5", 0.42);
      const band = mesh(new THREE.CylinderGeometry(R + 0.2, R + 0.2, H - Hs - 1.6, 128, 1, true), bare);
      band.position.y = (Hs + H - 1.6) / 2;
      const lid = latheClosed([[R - 1.7, H - 14], [R - 1.7, H - 3.5, 1], [0, H - 3.5]], steel("#c9ced3", 0.34));
      const slider = mesh(new RoundedBoxGeometry(17, 6, (R - 5) * 2, 4, 2.6), plastic(color, 0.4));
      slider.position.set(0, H - 1.5, 0);
      const D = R * 0.98;
      const grip = handle(
        [
          [R - 2, Hs - 16],
          [R + D, Hs - 16, 16],
          [R + D, taper + 24, 16],
          [R - 2, taper + 24],
        ],
        { a: 10, b: 7.5, exponent: 3.2, flare: 0.22 },
        body,
      );
      return {
        outer,
        vessel: { wall: 1.6, floor: 10, foot: 4, inside: 4, kink: 6 },
        bandY,
        bandAngle: (w / (2 * Math.PI * R)) * full,
        body,
        extras: [band, lid, slider, straw(0, H - 40, 135, "steel", R * 0.45), grip],
      };
    }
    case "travel-tumbler": {
      const R = w / (2 * Math.PI);
      const H = h + 36;
      const outer: Profile = [[R * 0.88 - 3, 0], [R * 0.88, 3], [R, H * 0.4], [R, H]];
      const lid = cylinderPart(R + 1, R + 1, 26, H - 2, plastic("#2e3338"));
      return { outer, vessel: { wall: 4 }, bandY: [8, 8 + h], bandAngle: full, body: ceramic(color), extras: [lid] };
    }
    case "wine-tumbler": {
      const Rm = w / (2 * Math.PI);
      const H = h + 12;
      const outer: Profile = [[Rm * 0.62 - 3, 0], [Rm * 0.62, 2], [Rm * 0.86, H * 0.18], [Rm, H * 0.45], [Rm * 0.97, H * 0.75], [Rm * 0.9, H]];
      const lid = cylinderPart(Rm * 0.9 + 0.6, Rm * 0.9 + 0.6, 8, H - 3, clearPlastic());
      return { outer, vessel: { wall: 1.5 }, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: full, body: coated(color), extras: [lid] };
    }
    case "can-cooler": {
      const R = w / (2 * Math.PI);
      const H = h + 10;
      const outer: Profile = [[R - 3, 0], [R, 3], [R, H]];
      const gasket = mesh(new THREE.TorusGeometry(R - 2, 2.2, 12, 96), rubber());
      gasket.rotation.x = Math.PI / 2;
      gasket.position.y = H - 1;
      return { outer, vessel: { wall: 1.4 }, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: full, body: coated(color), extras: [gasket] };
    }
    case "bottle":
    default: {
      const R = w / (2 * Math.PI);
      const Hb = h + 16;
      const outer: Profile = [[R - 4, 0], [R, 4], [R, Hb], [R * 0.86, Hb + 14], [R * 0.55, Hb + 26], [15, Hb + 34], [15, Hb + 46]];
      const cap = cylinderPart(17, 17, 28, Hb + 44, plastic("#2e3338", 0.6));
      const loop = mesh(new THREE.TorusGeometry(8, 2.4, 12, 48), plastic("#2e3338", 0.6));
      loop.position.set(0, Hb + 78, 0);
      return { outer, vessel: { wall: 1.4 }, bandY: [(Hb - h) / 2 + 2, (Hb - h) / 2 + 2 + h], bandAngle: full, body: coated(color), extras: [cap, loop] };
    }
  }
}

function buildDrinkware(p: ModelProduct, o: ModelOptions): ProductModel {
  const spec = drinkSpec(p, o);
  const group = new THREE.Group();
  const v = spec.vessel;
  group.add(mesh(vesselGeometry(spec.outer, { floor: v.wall * 2, foot: 2, inside: 3, ...v }), spec.body));
  // Full wraps face the viewer. Wraps that stop at a handle (on +X) are centred
  // opposite it, as on the real mug. A centred emblem covers about 120 degrees
  // of a mug, so the camera starts 24 degrees off the print centre to show it
  // whole; the handle is then behind the body and comes into view on turning.
  const handled = spec.bandAngle < Math.PI * 2 - 1e-6;
  const phiCenter = handled ? -Math.PI / 2 : 0;
  const phiStart = phiCenter - spec.bandAngle / 2;
  const bandMat = printMaterial(o, { roughness: 0.22, clearcoat: 1 }, THREE.FrontSide);
  if (spec.bandOpacity) {
    bandMat.transparent = true;
    bandMat.opacity = spec.bandOpacity;
  }
  const band = mesh(bandGeometry(spec.outer, spec.bandY[0], spec.bandY[1], phiStart, spec.bandAngle), bandMat);
  group.add(band, ...spec.extras);
  return { group, family: "drinkware", printMeshes: [band], viewAzimuth: handled ? -1.15 : 0.3, frontAzimuth: handled ? -Math.PI / 2 : 0 };
}

// ---------------------------------------------------------------- flat goods

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const rr = Math.min(r, w / 2, h / 2);
  const x = -w / 2;
  s.moveTo(x + rr, 0);
  s.lineTo(x + w - rr, 0);
  s.quadraticCurveTo(x + w, 0, x + w, rr);
  s.lineTo(x + w, h - rr);
  s.quadraticCurveTo(x + w, h, x + w - rr, h);
  s.lineTo(x + rr, h);
  s.quadraticCurveTo(x, h, x, h - rr);
  s.lineTo(x, rr);
  s.quadraticCurveTo(x, 0, x + rr, 0);
  return s;
}

function circle(d: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(0, d / 2, d / 2, 0, Math.PI * 2, false);
  return s;
}

function hole(x: number, y: number, r: number): THREE.Path {
  const path = new THREE.Path();
  path.absarc(x, y, r, 0, Math.PI * 2, true);
  return path;
}

/** An ellipse filling w × h, standing on y = 0. */
function ellipseShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absellipse(0, h / 2, w / 2, h / 2, 0, Math.PI * 2, false, 0);
  return s;
}

/** A box-relative polygon (0–1, y down) as a shape of w × h mm standing on y = 0 (y up). */
function unitPolygonShape(points: number[], w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < points.length; i += 2) {
    const x = -w / 2 + points[i] * w;
    const y = h - points[i + 1] * h;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/**
 * Where a ring or loop hangs on a shaped blank: the middle of a flat top
 * edge, or else the top-most point nearest the middle (a heart's lobe, a
 * star's tip).
 */
function hangPoint(points: number[], w: number, h: number): { x: number; y: number } {
  let minY = Infinity;
  for (let i = 1; i < points.length; i += 2) minY = Math.min(minY, points[i]);
  const top: number[] = [];
  for (let i = 0; i < points.length; i += 2) if (points[i + 1] - minY < 0.02) top.push(points[i]);
  const mid = top.reduce((a, b) => a + b, 0) / top.length;
  const poly = Array.from({ length: points.length / 2 }, (_, i) => ({ x: points[2 * i], y: points[2 * i + 1] }));
  const x = insidePolygon(poly, mid, minY + 0.04) ? mid : top.reduce((a, b) => (Math.abs(b - 0.5) < Math.abs(a - 0.5) ? b : a), top[0]);
  return { x: -w / 2 + x * w, y: h - minY * h };
}

/** Map a shape geometry's UVs onto its bounds, so the print fills the face. */
function fitUVs(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox!;
  const pos = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - b.min.x) / (b.max.x - b.min.x), (pos.getY(i) - b.min.y) / (b.max.y - b.min.y));
  }
  uv.needsUpdate = true;
}

interface SlabSpec {
  shape: THREE.Shape;
  thickness: number;
  face: { roughness: number; clearcoat?: number; metalness?: number };
  back: THREE.Material;
  side: THREE.Material;
  extras: THREE.Object3D[];
  /** Map the print to the design box rather than the shape's bounds (a sticker border lies outside the box). */
  boxUV?: boolean;
}

function ring(x: number, y: number, z: number, r: number, tube: number) {
  const m = mesh(new THREE.TorusGeometry(r, tube, 12, 48), steel("#c7ccd1", 0.25));
  m.position.set(x, y, z);
  m.rotation.y = Math.PI / 2;
  return m;
}

function slabSpec(p: ModelProduct, o: ModelOptions): SlabSpec {
  const w = p.width;
  const h = p.height;
  const white = new THREE.MeshPhysicalMaterial({ color: "#f4f4f2", roughness: 0.5 });
  const alu = steel("#cfd3d8", 0.3);
  const corkTex = tex(o, "cork");
  const cork = new THREE.MeshStandardMaterial({ color: corkTex ? "#ffffff" : "#b58b5a", map: corkTex, roughness: 1 });
  // Shaped blanks (heart, star, tree...) are cut from their outline.
  const outline = p.outline ? outlineFor(p.outline, w / h) : null;
  const shaped = outline ? unitPolygonShape(outline, w, h) : null;
  const hang = outline ? hangPoint(outline, w, h) : { x: 0, y: h };
  const holeIfInside = (shape: THREE.Shape, x: number, y: number, r: number) => {
    const inside = !outline || insidePolygon(outline.reduce<Vec[]>((acc, v, i) => (i % 2 ? acc : [...acc, { x: -w / 2 + v * w, y: h - outline[i + 1] * h }]), []), x, y);
    if (inside) shape.holes.push(hole(x, y, r));
  };
  switch (p.art) {
    case "mousepad":
      return { shape: roundedRect(w, h, 9), thickness: 3, face: { roughness: 0.85 }, back: rubber("#2a2a2d"), side: rubber("#151517"), extras: [] };
    case "mousepad-round":
      return { shape: circle(w), thickness: 3, face: { roughness: 0.85 }, back: rubber("#2a2a2d"), side: rubber("#151517"), extras: [] };
    case "coaster-square":
      return { shape: roundedRect(w, h, 6), thickness: 5, face: { roughness: 0.3, clearcoat: 0.8 }, back: cork, side: white, extras: [] };
    case "coaster-round":
      return { shape: circle(w), thickness: 5, face: { roughness: 0.3, clearcoat: 0.8 }, back: cork, side: white, extras: [] };
    case "ornament": {
      const cap = mesh(new THREE.CylinderGeometry(5, 5, 8, 24), steel("#c8a74a", 0.25));
      cap.position.set(hang.x, hang.y + 3, 0);
      const loop = mesh(new THREE.TorusGeometry(9, 0.9, 8, 48), new THREE.MeshStandardMaterial({ color: "#b3122e", roughness: 0.8 }));
      loop.position.set(hang.x, hang.y + 15, 0);
      const shape = shaped ?? (p.shape === "circle" ? (Math.abs(w - h) < 0.5 ? circle(w) : ellipseShape(w, h)) : roundedRect(w, h, 3));
      return { shape, thickness: 3.2, face: { roughness: 0.25, clearcoat: 1 }, back: white, side: white, extras: [cap, loop] };
    }
    case "keychain": {
      // Ovals (circle shape, unequal sides) are drawn as a stadium of the right size.
      const shape = shaped ?? (p.shape === "circle" ? (Math.abs(w - h) < 0.5 ? circle(w) : roundedRect(w, h, Math.min(w, h) / 2)) : roundedRect(w, h, 4));
      holeIfInside(shape, hang.x, hang.y - 5.5, 2.4);
      return { shape, thickness: 3, face: { roughness: 0.25, clearcoat: 1 }, back: white, side: white, extras: [ring(hang.x, hang.y + 6.5, 1.5, 12, 1.2)] };
    }
    case "pet-tag": {
      const shape = shaped ?? roundedRect(w, h, w / 2);
      holeIfInside(shape, hang.x, hang.y - 4.5, 2);
      return { shape, thickness: 2, face: { roughness: 0.25, clearcoat: 1, metalness: 0.2 }, back: alu, side: alu, extras: [ring(hang.x, hang.y + 5.5, 1, 9, 1)] };
    }
    case "luggage-tag": {
      if (p.shape === "circle") {
        const round = circle(w);
        const slot = new THREE.Path();
        slot.moveTo(-6, h - 12);
        slot.lineTo(6, h - 12);
        slot.lineTo(6, h - 8);
        slot.lineTo(-6, h - 8);
        slot.lineTo(-6, h - 12);
        round.holes.push(slot);
        return { shape: round, thickness: 3, face: { roughness: 0.3, clearcoat: 0.6 }, back: white, side: white, extras: [] };
      }
      const c = w * 0.22;
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2 + 3, 0);
      shape.lineTo(w / 2 - 3, 0);
      shape.quadraticCurveTo(w / 2, 0, w / 2, 3);
      shape.lineTo(w / 2, h - c);
      shape.lineTo(w / 2 - c, h);
      shape.lineTo(-w / 2 + c, h);
      shape.lineTo(-w / 2, h - c);
      shape.lineTo(-w / 2, 3);
      shape.quadraticCurveTo(-w / 2, 0, -w / 2 + 3, 0);
      const slot = new THREE.Path();
      slot.moveTo(-6, h - 9);
      slot.lineTo(6, h - 9);
      slot.lineTo(6, h - 5);
      slot.lineTo(-6, h - 5);
      slot.lineTo(-6, h - 9);
      shape.holes.push(slot);
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-5, h - 7, 4),
        new THREE.Vector3(-8, h + 20, 0),
        new THREE.Vector3(0, h + 42, 0),
        new THREE.Vector3(8, h + 20, 0),
        new THREE.Vector3(5, h - 7, -2),
      ]);
      const strap = mesh(new THREE.TubeGeometry(strapCurve, 48, 2.2, 10, false), new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 0.7 }));
      return { shape, thickness: 3, face: { roughness: 0.3, clearcoat: 0.6 }, back: white, side: white, extras: [strap] };
    }
    case "bookmark": {
      const shape = roundedRect(w, h, 3);
      shape.holes.push(hole(0, h - 6, 2));
      const tassel = mesh(new THREE.ConeGeometry(3, 26, 16), new THREE.MeshStandardMaterial({ color: "#c0185a", roughness: 0.9 }));
      tassel.position.set(4, h + 2, 0);
      const cord = mesh(new THREE.CylinderGeometry(0.6, 0.6, 22, 8), new THREE.MeshStandardMaterial({ color: "#c0185a", roughness: 0.9 }));
      cord.position.set(2, h + 6, 0);
      cord.rotation.z = 0.5;
      return { shape, thickness: 1, face: { roughness: 0.25, clearcoat: 1, metalness: 0.2 }, back: alu, side: alu, extras: [tassel, cord] };
    }
    case "card":
      return { shape: roundedRect(w, h, 3.2), thickness: 0.8, face: { roughness: 0.25, clearcoat: 1 }, back: white, side: white, extras: [] };
    case "photo-panel": {
      const easel = mesh(new THREE.BoxGeometry(14, h * 0.62, 2), new THREE.MeshStandardMaterial({ color: "#1d1d20", roughness: 0.6 }));
      easel.position.set(0, h * 0.3, -h * 0.13);
      easel.rotation.x = -0.32;
      return { shape: roundedRect(w, h, 1.6), thickness: 1.1, face: { roughness: 0.12, clearcoat: 1, metalness: 0.25 }, back: alu, side: alu, extras: [easel] };
    }
    case "puzzle":
      return { shape: roundedRect(w, h, 2), thickness: 2, face: { roughness: 0.4, clearcoat: 0.5 }, back: new THREE.MeshStandardMaterial({ color: "#d9cdb4", roughness: 0.95 }), side: white, extras: [] };
    case "plate": {
      const shape = roundedRect(w, h, 6);
      for (const [x, y] of [[-w / 2 + 12, 14], [w / 2 - 12, 14], [-w / 2 + 12, h - 14], [w / 2 - 12, h - 14]]) shape.holes.push(hole(x, y, 3.2));
      return { shape, thickness: 0.6, face: { roughness: 0.2, clearcoat: 1, metalness: 0.3 }, back: alu, side: alu, extras: [] };
    }
    case "tile":
      return { shape: roundedRect(w, h, 1), thickness: 6, face: { roughness: 0.15, clearcoat: 1 }, back: new THREE.MeshStandardMaterial({ color: "#d8d2c6", roughness: 1 }), side: white, extras: [] };
    case "sticker": {
      const vinyl = new THREE.MeshPhysicalMaterial({ color: "#f6f6f4", roughness: 0.45 });
      // A die-cut sticker is its own cut outline (artwork plus border); otherwise the preset shape.
      const shape = o.cutOutline && o.cutOutline.length >= 6 ? unitPolygonShape(o.cutOutline, w, h) : p.shape === "circle" ? circle(w) : roundedRect(w, h, 3);
      const extras: THREE.Object3D[] = [];
      if (o.kissCut) {
        // Kiss-cut: the sticker stays on its backing sheet.
        const b = new THREE.Box3().setFromPoints(shape.getPoints(32).map((v) => new THREE.Vector3(v.x, v.y, 0)));
        const pad = 5;
        const backing = mesh(new THREE.BoxGeometry(b.max.x - b.min.x + pad * 2, b.max.y - b.min.y + pad * 2, 0.25), new THREE.MeshStandardMaterial({ color: "#e9ebef", roughness: 0.7 }));
        backing.position.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, -0.35);
        extras.push(backing);
      }
      return { shape, thickness: 0.3, face: { roughness: 0.35, clearcoat: 0.6 }, back: vinyl, side: vinyl, extras, boxUV: !!o.cutOutline };
    }
    case "clock": {
      const hub = mesh(new THREE.CylinderGeometry(4.5, 4.5, 5, 24), steel("#2b2f33", 0.4));
      hub.rotation.x = Math.PI / 2;
      hub.position.set(0, h / 2, 4.4);
      const hand = (len: number, width: number, angle: number, z: number) => {
        const m = mesh(new THREE.BoxGeometry(width, len, 0.8), new THREE.MeshStandardMaterial({ color: "#1d2024", roughness: 0.5 }));
        m.geometry.translate(0, len / 2 - 6, 0);
        m.position.set(0, h / 2, z);
        m.rotation.z = angle;
        return m;
      };
      return {
        shape: circle(w),
        thickness: 4,
        face: { roughness: 0.25, clearcoat: 1 },
        back: new THREE.MeshStandardMaterial({ color: "#6b5b48", roughness: 0.95 }),
        side: white,
        extras: [hub, hand(w * 0.26, 3.2, 0.9, 3.4), hand(w * 0.38, 2.2, -0.6, 4.4)],
      };
    }
    case "sign": {
      const stakes = [-w * 0.22, w * 0.22].map((x) => {
        const s = mesh(new THREE.BoxGeometry(3, h * 0.9, 1.5), steel("#5d6166", 0.45));
        s.position.set(x, -h * 0.45 + 6, -1.2);
        return s;
      });
      return { shape: roundedRect(w, h, 3), thickness: 1, face: { roughness: 0.2, clearcoat: 1, metalness: 0.3 }, back: alu, side: alu, extras: stakes };
    }
    case "wall-panel":
      return { shape: roundedRect(w, h, 1.5), thickness: 9, face: { roughness: 0.3, clearcoat: 0.7 }, back: wood("#b88d58"), side: wood("#c9a46b"), extras: [] };
    case "clipboard": {
      const clip = mesh(new RoundedBoxGeometry(w * 0.42, 22, 9, 3, 3), steel("#c9ced3", 0.22));
      clip.position.set(0, h - 9, 5);
      return { shape: roundedRect(w, h, 6), thickness: 3, face: { roughness: 0.3, clearcoat: 0.8 }, back: new THREE.MeshStandardMaterial({ color: "#7a5a3a", roughness: 0.9 }), side: wood("#8a6a46"), extras: [clip] };
    }
    case "pendant": {
      const bezelShape = p.shape === "circle" ? circle(w + 6) : roundedRect(w + 6, h + 6, 2.5);
      const bezel = mesh(new THREE.ExtrudeGeometry(bezelShape, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 2, curveSegments: 48 }), steel("#c8a74a", 0.2));
      // The tray sits behind the insert, its rim showing round it.
      bezel.position.set(0, -3, -4.2);
      const bail = mesh(new THREE.TorusGeometry(3.6, 0.9, 10, 32), steel("#c8a74a", 0.2));
      bail.position.set(0, h + 7, -0.8);
      bail.rotation.y = Math.PI / 2;
      return { shape: p.shape === "circle" ? circle(w) : roundedRect(w, h, 1.5), thickness: 1.2, face: { roughness: 0.15, clearcoat: 1 }, back: white, side: white, extras: [bezel, bail] };
    }
    case "cutting-board": {
      const glassSide = new THREE.MeshPhysicalMaterial({ color: "#dfe9e6", roughness: 0.12, transmission: 0.2, thickness: 4 });
      const feet = [-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => {
          const f = mesh(new THREE.CylinderGeometry(5, 5, 3, 20), rubber());
          f.rotation.x = Math.PI / 2;
          f.position.set(sx * (w / 2 - 14), h / 2 + sy * (h / 2 - 14), -3.6);
          return f;
        }),
      );
      return { shape: roundedRect(w, h, 10), thickness: 4, face: { roughness: 0.08, clearcoat: 1 }, back: glassSide, side: glassSide, extras: feet };
    }
    case "magnet":
    default: {
      const shape = shaped ?? (p.shape === "circle" ? circle(w) : roundedRect(w, h, 4));
      return { shape, thickness: 1.2, face: { roughness: 0.25, clearcoat: 1, metalness: 0.2 }, back: rubber("#202022"), side: alu, extras: [] };
    }
  }
}

function buildFlat(p: ModelProduct, o: ModelOptions): ProductModel {
  const spec = slabSpec(p, o);
  const bevel = Math.min(0.6, spec.thickness / 4);
  const body = new THREE.ExtrudeGeometry(spec.shape, {
    depth: spec.thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 64,
  });
  body.translate(0, 0, -spec.thickness / 2 + bevel);
  const slab = mesh(body, [spec.back, spec.side]);
  const faceGeo = new THREE.ShapeGeometry(spec.shape, 64);
  if (spec.boxUV) {
    // The print image is the design box; the border around the artwork is outside 0–1 and shows the clamped (white) edge.
    const pos = faceGeo.getAttribute("position");
    const uv = faceGeo.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + p.width / 2) / p.width, pos.getY(i) / p.height);
    uv.needsUpdate = true;
  } else fitUVs(faceGeo);
  const face = mesh(faceGeo, printMaterial(o, spec.face));
  face.position.z = spec.thickness / 2 + 0.05;
  const group = new THREE.Group();
  group.add(slab, face, ...spec.extras);
  // Stand the piece up, leaning back slightly, as in a product photo.
  group.rotation.x = -0.12;
  return { group, family: "flat", printMeshes: [face], viewAzimuth: 0.35 };
}

function buildFlag(p: ModelProduct, o: ModelOptions): ProductModel {
  const w = p.width;
  const h = p.height;
  const geo = new THREE.PlaneGeometry(w, h, 48, 32);
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + w / 2;
    // Cloth hangs from the pole on the left; ripples grow away from it.
    pos.setZ(i, Math.sin(x / 38 + pos.getY(i) / 160) * 7 * (x / w));
  }
  geo.computeVertexNormals();
  const cloth = mesh(geo, printMaterial(o, { roughness: 0.9 }, THREE.DoubleSide));
  cloth.position.set(w / 2, h / 2 + 140, 0);
  const metal = steel("#2f3338", 0.4);
  const pole = mesh(new THREE.CylinderGeometry(3.5, 3.5, h + 200, 20), metal);
  pole.position.set(-4, (h + 200) / 2, 0);
  const bar = mesh(new THREE.CylinderGeometry(2.5, 2.5, w + 16, 16), metal);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(w / 2, h + 142, 0);
  const finial = mesh(new THREE.SphereGeometry(6, 20, 14), metal);
  finial.position.set(-4, h + 204, 0);
  const group = new THREE.Group();
  group.add(cloth, pole, bar, finial);
  return { group, family: "flag", printMeshes: [cloth], viewAzimuth: 0.3 };
}

// ---------------------------------------------------------------- garments

/** Millimetres per unit of the 100 × 100 illustration box, per garment. */
const GARMENT_SCALE: Partial<Record<ModelProduct["art"], number>> = {
  tshirt: 10.5,
  longsleeve: 10.5,
  hoodie: 11,
  "kids-tee": 7.6,
  onesie: 5.2,
};

function shapeFromPath(d: string, scale: number, bottom: number): THREE.Shape {
  const { points } = parsePath(d, 14);
  return new THREE.Shape(points.map((pt) => new THREE.Vector2((pt.x - 50) * scale, (bottom - pt.y) * scale)));
}

/** Curve a flat garment around the torso (front bulges toward the viewer). */
function bend(geometry: THREE.BufferGeometry, k: number) {
  const pos = geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) - k * pos.getX(i) ** 2);
  geometry.computeVertexNormals();
}

type Vec = { x: number; y: number };

function insidePolygon(poly: Vec[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function nearestOnPolygon(poly: Vec[], x: number, y: number): Vec {
  let best = { x, y };
  let bestD = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const d = (px - x) ** 2 + (py - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { x: px, y: py };
    }
  }
  return best;
}

/**
 * A garment as a soft, filled cloth body: a grid over the outline, puffed up
 * from the edge inward (the distance to the edge drives the height, rounding
 * every edge like a garment on a form), with gentle drape folds. Grid nodes
 * just outside the outline are pulled onto it, so the silhouette is smooth.
 * Returns front and back sheets and a height lookup for things that sit on
 * the surface (the print, collar, pocket seams).
 */
export function clothSurface(outline: Vec[], options: { puff: number; round: number; cells?: number }) {
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const minX = Math.min(...xs) - 2;
  const minY = Math.min(...ys) - 2;
  const W = Math.max(...xs) + 2 - minX;
  const H = Math.max(...ys) + 2 - minY;
  const cols = options.cells ?? 150;
  const cell = W / cols;
  const rows = Math.ceil(H / cell);
  const nx = cols + 1;
  const ny = rows + 1;
  const inside = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) inside[j * nx + i] = insidePolygon(outline, minX + i * cell, minY + j * cell) ? 1 : 0;

  // Chamfer distance (in cells) from each inside node to the nearest outside node.
  const INF = 1e9;
  const dist = new Float32Array(nx * ny);
  for (let k = 0; k < dist.length; k++) dist[k] = inside[k] ? INF : 0;
  const relax = (k: number, n: number, w: number) => {
    if (dist[n] + w < dist[k]) dist[k] = dist[n] + w;
  };
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (!inside[k]) continue;
      if (i > 0) relax(k, k - 1, 1);
      if (j > 0) relax(k, k - nx, 1);
      if (i > 0 && j > 0) relax(k, k - nx - 1, 1.414);
      if (i < nx - 1 && j > 0) relax(k, k - nx + 1, 1.414);
    }
  for (let j = ny - 1; j >= 0; j--)
    for (let i = nx - 1; i >= 0; i--) {
      const k = j * nx + i;
      if (!inside[k]) continue;
      if (i < nx - 1) relax(k, k + 1, 1);
      if (j < ny - 1) relax(k, k + nx, 1);
      if (i < nx - 1 && j < ny - 1) relax(k, k + nx + 1, 1.414);
      if (i > 0 && j < ny - 1) relax(k, k + nx - 1, 1.414);
    }

  const heightOf = (x: number, y: number, d: number) => {
    const t = Math.min(1, d / options.round);
    const puff = options.puff * Math.sqrt(1 - (1 - t) * (1 - t));
    // Drape: soft vertical folds that fade out towards the edges.
    const folds = (Math.sin(x / 38 + 1.3 * Math.sin(y / 110)) * 1.4 + Math.sin((x + y) / 61) * 0.9) * Math.min(1, d / 40);
    return puff + folds * (options.puff / 14);
  };

  // Node positions: inside nodes on the grid; edge nodes (outside, next to inside) on the outline.
  const px = new Float32Array(nx * ny);
  const py = new Float32Array(nx * ny);
  const pz = new Float32Array(nx * ny);
  const used = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const x = minX + i * cell;
      const y = minY + j * cell;
      if (inside[k]) {
        px[k] = x;
        py[k] = y;
        pz[k] = heightOf(x, y, dist[k] * cell);
        used[k] = 1;
      }
    }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (inside[k]) continue;
      let near = false;
      for (let dj = -1; dj <= 1 && !near; dj++)
        for (let di = -1; di <= 1 && !near; di++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && inside[jj * nx + ii]) near = true;
        }
      if (!near) continue;
      const q = nearestOnPolygon(outline, minX + i * cell, minY + j * cell);
      px[k] = q.x;
      py[k] = q.y;
      pz[k] = 0;
      used[k] = 1;
    }

  const sheet = (sign: 1 | -1, scaleZ: number) => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const map = new Int32Array(nx * ny).fill(-1);
    for (let k = 0; k < nx * ny; k++) {
      if (!used[k]) continue;
      map[k] = positions.length / 3;
      positions.push(px[k], py[k], sign * pz[k] * scaleZ);
      uvs.push(px[k], py[k]);
    }
    const index: number[] = [];
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i;
        const b = a + 1;
        const c = a + nx;
        const d = c + 1;
        // Keep cells with at least one inside corner; the rest lie outside the outline.
        if (!(inside[a] || inside[b] || inside[c] || inside[d])) continue;
        if (map[a] < 0 || map[b] < 0 || map[c] < 0 || map[d] < 0) continue;
        if (sign > 0) index.push(map[a], map[b], map[d], map[a], map[d], map[c]);
        else index.push(map[a], map[d], map[b], map[a], map[c], map[d]);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  };

  const heightAt = (x: number, y: number) => {
    const fi = (x - minX) / cell;
    const fj = (y - minY) / cell;
    const i = Math.floor(fi);
    const j = Math.floor(fj);
    if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) return 0;
    const u = fi - i;
    const v = fj - j;
    const z = (ii: number, jj: number) => (inside[jj * nx + ii] ? pz[jj * nx + ii] : 0);
    return z(i, j) * (1 - u) * (1 - v) + z(i + 1, j) * u * (1 - v) + z(i, j + 1) * (1 - u) * v + z(i + 1, j + 1) * u * v;
  };

  return { front: sheet(1, 1), back: sheet(-1, 0.75), heightAt };
}

// ---------------------------------------------------------------- T-shirts

/**
 * Landmarks of the 2D outlines (`outlines.ts`, a 100 × 100 box) that the
 * presets' placement areas are drawn on: high point of the shoulder, hem,
 * half the body width, and where the sleeve's top edge starts and ends.
 */
const TEE_ILLUSTRATION: Partial<Record<ModelProduct["art"], { hps: number; hem: number; half: number; shoulder: number; cuff: number }>> = {
  tshirt: { hps: 14, hem: 88, half: 26, shoulder: 22, cuff: 40 },
  "kids-tee": { hps: 20, hem: 84, half: 22, shoulder: 28, cuff: 44 },
  longsleeve: { hps: 14, hem: 86, half: 24, shoulder: 22, cuff: 82 },
};

/** The garment size a product is shown on. */
export function teeSpecFor(p: Pick<ProductPreset, "id" | "art">): TeeSpec | null {
  if (p.art === "tshirt") return ADULT_TEE;
  if (p.art === "longsleeve") return ADULT_LONGSLEEVE;
  if (p.art === "kids-tee") return p.id.startsWith("toddler") ? TODDLER_TEE : YOUTH_TEE;
  return null;
}

/**
 * Where a preset's print goes on the shirt: the placement area drawn on the
 * 2D outline, carried over to the fabric (centre and panel), at the preset's
 * true size, then moved inside the panel's printable area if it pokes out.
 */
export function teePrintPlacement(p: ModelProduct, tee: TeeModel): { panel: TeePanel; rect: PrintRect } {
  const ill = TEE_ILLUSTRATION[p.art] ?? TEE_ILLUSTRATION.tshirt!;
  const a = p.artArea ?? { x: 50 - ill.half / 2, y: ill.hps + 16, w: ill.half, h: ill.half / 2 };
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  let panel: TeePanel;
  let rect: PrintRect;
  if (Math.abs(cx - 50) > ill.half) {
    // The illustration's left sleeve is the wearer's right.
    panel = cx < 50 ? "sleeveRight" : "sleeveLeft";
    const f = THREE.MathUtils.clamp((cy - ill.shoulder) / (ill.cuff - ill.shoulder), 0.15, 0.85);
    rect = { u: 0, v: tee.landmarks.sleeveTop * (1 - f), w: p.width, h: p.height };
  } else {
    // Back areas are drawn as seen from behind, as the back panel's u runs.
    panel = p.side === "back" ? "back" : "front";
    const half = panel === "back" ? tee.landmarks.backHalfArc : tee.landmarks.frontHalfArc;
    rect = { u: ((cx - 50) / ill.half) * half, v: ((ill.hem - cy) / (ill.hem - ill.hps)) * tee.spec.length, w: p.width, h: p.height };
  }
  return { panel, rect: placeInside(tee, panel, rect) };
}

/** Environment share for T-shirts, tuned by measuring rendered fold contrast (docs/models/tshirt.md). */
export const TEE_ENVIRONMENT = 0.4;

function teeMaterials(o: ModelOptions) {
  const knit = tex(o, "knit");
  const rough = tex(o, "knitRoughness");
  const make = (color: string, vertexColors: boolean, normal = 0.55) =>
    new THREE.MeshPhysicalMaterial({
      color,
      vertexColors,
      roughness: rough ? 1 : 0.88,
      roughnessMap: rough,
      normalMap: knit,
      // The knit pixels follow image rows (row 0 at the top); UV v runs up the shirt.
      normalScale: new THREE.Vector2(normal, -normal),
      // Polyester jersey: a faint sheen at grazing angles, no gloss (more would light up the edges that should fall off).
      sheen: 0.15,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color(shade(color, -0.3)),
    });
  return {
    // Shown below the swatch: white cloth reflects about 80 %, and a full-white albedo burns out under studio light,
    // which hides every fold.
    fabric: make(shade(o.color, 0.05), true),
    inside: make(shade(o.color, 0.12), true),
    rib: make(shade(o.color, 0.05), true, 0.35),
    seam: make(shade(o.color, 0.09), false),
  };
}

function buildTee(p: ModelProduct, o: ModelOptions, spec: TeeSpec): ProductModel {
  const tee = teeModel(spec);
  const materials = teeMaterials(o);
  const group = new THREE.Group();
  for (const part of tee.parts) {
    // The cached geometry is shared by every build of this size; each model gets its own copy to dispose.
    const m = mesh(part.geometry.clone(), part.materials.length > 1 ? part.materials.map((k) => materials[k]) : materials[part.materials[0]]);
    m.name = part.name;
    group.add(m);
  }
  const printMeshes: THREE.Mesh[] = [];
  const overlay = overlayMaterial(o);
  const { panel, rect } = teePrintPlacement(p, tee);
  if (overlay) {
    const geometry = printPatch(tee, panel, rect);
    if (geometry) {
      const print = mesh(geometry, overlay, false);
      print.name = "TShirt_Print";
      print.renderOrder = 2;
      group.add(print);
      printMeshes.push(print);
    }
  }
  // Open looking at the print: three-quarter on the front or back, from above the shoulder for sleeves.
  const front = panel === "back" ? Math.PI : panel === "sleeveLeft" ? Math.PI / 2 : panel === "sleeveRight" ? -Math.PI / 2 : 0;
  const sleeve = panel === "sleeveLeft" || panel === "sleeveRight";
  return {
    group,
    family: "garment",
    printMeshes,
    viewAzimuth: sleeve ? front - Math.sign(front) * 0.45 : front + 0.35,
    frontAzimuth: front,
    viewElevation: sleeve ? 0.55 : undefined,
    environment: TEE_ENVIRONMENT,
  };
}

function buildGarment(p: ModelProduct, o: ModelOptions): ProductModel {
  const teeSpec = teeSpecFor(p);
  if (teeSpec) return buildTee(p, o, teeSpec);
  const scale = GARMENT_SCALE[p.art] ?? 10;
  const kid = p.art === "kids-tee";
  const outlineD =
    p.art === "hoodie" ? OUTLINES.hoodie : p.art === "longsleeve" ? OUTLINES.longsleeve : p.art === "onesie" ? OUTLINES.onesie : kid ? OUTLINES.kidsTee : OUTLINES.tee;
  const bottom = p.art === "onesie" ? 94 : kid ? 90 : p.art === "hoodie" ? 98 : 96;
  const toMm = (pt: Vec) => ({ x: (pt.x - 50) * scale, y: (bottom - pt.y) * scale });
  const outline = parsePath(outlineD, 16).points.map(toMm);
  const k = scale / 10;
  const curvature = 2.2e-4 / k;
  const cloth = clothSurface(outline, { puff: 16 * k, round: 55 * k });
  const surfaceZ = (x: number, y: number) => cloth.heightAt(x, y);
  const material = fabric(o.color, o);
  const backMaterial = fabric(shade(o.color, 0.06), o);
  bend(cloth.front, curvature);
  bend(cloth.back, curvature);
  const group = new THREE.Group();
  group.add(mesh(cloth.front, material), mesh(cloth.back, backMaterial));

  const deep = new THREE.MeshPhysicalMaterial({ color: shade(o.color, 0.24), roughness: 0.95, sheen: 0.4, sheenColor: new THREE.Color(shade(o.color, -0.3)), side: THREE.DoubleSide });
  const rib = new THREE.MeshPhysicalMaterial({ color: shade(o.color, 0.07), roughness: 0.9, sheen: 0.5, sheenColor: new THREE.Color(shade(o.color, -0.3)) });
  const onSurface = (pt: Vec, lift: number) => {
    const m = toMm(pt);
    return new THREE.Vector3(m.x, m.y, surfaceZ(m.x, m.y) + lift - curvature * m.x * m.x);
  };

  // Inside of the back neck, seen through the neck opening.
  const backNeckD = kid ? OUTLINES.kidsBackNeck : p.art === "onesie" || p.art === "hoodie" ? null : OUTLINES.teeBackNeck;
  if (backNeckD) {
    const backNeck = new THREE.ShapeGeometry(shapeFromPath(backNeckD, scale, bottom), 8);
    bend(backNeck, curvature);
    group.add(mesh(backNeck, deep));
  }
  // Ribbed collar (or hood edge) along the neckline.
  const collarD = p.art === "hoodie" ? OUTLINES.hoodieHood : p.art === "onesie" ? OUTLINES.onesieCollar : kid ? OUTLINES.kidsCollar : OUTLINES.teeCollar;
  const collarPts = parsePath(collarD, 24).points.map((pt) => onSurface(pt, 2 * k));
  group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(collarPts), 64, (p.art === "hoodie" ? 9 : 4.5) * k, 12, false), rib));

  if (p.art === "hoodie") {
    // The hood lies folded behind the shoulders: wide, low, set back, showing its darker inside.
    const hood = mesh(new THREE.SphereGeometry(95, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), deep);
    hood.scale.set(1.55, 0.42, 0.42);
    hood.position.set(0, (bottom - 18) * scale - 26, -34);
    group.add(hood);
    // Kangaroo pocket seam and drawstrings, lying on the cloth.
    const seam = parsePath(OUTLINES.hoodiePocket, 8).points.map((pt) => onSurface(pt, 1));
    group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...seam, seam[0]], true), 80, 1.6, 6, true), deep));
    for (const x of [44, 56]) {
      const cord = [onSurface({ x, y: 29 }, 3), onSurface({ x: x + (x < 50 ? -1 : 1), y: 38 }, 3), onSurface({ x, y: 44 }, 3)];
      group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cord), 24, 2.4, 8, false), rib));
    }
  }
  if (p.art === "onesie") {
    for (const x of [44, 50, 56]) {
      const snap = mesh(new THREE.CylinderGeometry(3, 3, 2, 20), steel("#c7ccd1", 0.25));
      snap.rotation.x = Math.PI / 2;
      snap.position.copy(onSurface({ x, y: 88 }, 1));
      group.add(snap);
    }
  }

  // The print at its true size, centred on the placement area, lying on the cloth.
  // Back placements lie on the back sheet, facing backwards: the placement area
  // is drawn as seen from behind, so its x is mirrored onto the model.
  const printMeshes: THREE.Mesh[] = [];
  const overlay = overlayMaterial(o);
  const back = p.side === "back";
  if (overlay && p.artArea) {
    const c = toMm({ x: p.artArea.x + p.artArea.w / 2, y: p.artArea.y + p.artArea.h / 2 });
    const plane = new THREE.PlaneGeometry(p.width, p.height, 32, 32);
    if (back) plane.rotateY(Math.PI);
    plane.translate(back ? -c.x : c.x, c.y, 0);
    const pos = plane.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const h = surfaceZ(pos.getX(i), pos.getY(i));
      pos.setZ(i, back ? -0.75 * h - 0.9 : h + 0.9);
    }
    bend(plane, curvature);
    const print = mesh(plane, overlay, false);
    print.renderOrder = 2;
    group.add(print);
    printMeshes.push(print);
  }
  // Back placements open facing the back, where the print is.
  return { group, family: "garment", printMeshes, viewAzimuth: back ? Math.PI + 0.3 : 0.3, frontAzimuth: back ? Math.PI : 0 };
}

/**
 * Crown surface of a structured six-panel cap: a dome whose height rises
 * from the back (about 95 mm) to a taller, fuller front panel (about
 * 115 mm), over an oval band about 190 × 210 mm (a typical adult crown).
 * Returns the point at polar angle t (0 = button, π/2 = band) and azimuth a
 * (0 = front centre).
 */
function capCrownPoint(t: number, a: number): THREE.Vector3 {
  const rx = 95;
  const rz = 106;
  const front = Math.cos(a); // 1 at the front, -1 at the back
  const height = 104 + 11 * front;
  // A structured front stays fuller near the band (less rounded than a dome).
  const fullness = 1 + 0.08 * Math.max(0, front) * Math.sin(t);
  const s = Math.pow(Math.sin(t), 0.85);
  return new THREE.Vector3(Math.sin(a) * s * rx, Math.cos(t) * height, Math.cos(a) * s * rz * fullness);
}

function buildCap(p: ModelProduct, o: ModelOptions): ProductModel {
  const material = fabric(o.color, o, 0.9);
  const under = new THREE.MeshStandardMaterial({ color: shade(o.color, -0.12), roughness: 0.92 });
  // Crown: a parametric surface (rows from the button to the band, columns around).
  const rows = 40;
  const cols = 96;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const v = capCrownPoint((j / rows) * (Math.PI / 2), (i / cols) * Math.PI * 2);
      positions.push(v.x, v.y, v.z);
      uvs.push(i / cols, 1 - j / rows);
    }
  const index: number[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + cols + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const crownGeo = new THREE.BufferGeometry();
  crownGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  crownGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  crownGeo.setIndex(index);
  crownGeo.computeVertexNormals();
  // One material: a material array needs geometry groups, and this geometry has none (it would draw nothing).
  material.side = THREE.DoubleSide;
  const crown = mesh(crownGeo, material);
  const group = new THREE.Group();
  group.add(crown);

  // Six panel seams from the button down to the band.
  const seamMat = new THREE.MeshStandardMaterial({ color: shade(o.color, 0.25), roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const pts: THREE.Vector3[] = [];
    for (let j = 1; j <= 24; j++) pts.push(capCrownPoint((j / 24) * (Math.PI / 2), a).multiplyScalar(1.004));
    group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.7, 6, false), seamMat, false));
  }
  // Eyelets on the side panels.
  for (const a of [Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55, Math.PI - 0.6, Math.PI + 0.6]) {
    const pos = capCrownPoint(0.55, a);
    const e = mesh(new THREE.TorusGeometry(2.2, 0.8, 8, 20), seamMat, false);
    e.position.copy(pos.multiplyScalar(1.01));
    e.lookAt(pos.clone().multiplyScalar(2));
    group.add(e);
  }
  const button = mesh(new THREE.SphereGeometry(6, 20, 12), material);
  button.position.y = capCrownPoint(0, 0).y;
  button.scale.y = 0.55;
  group.add(button);
  // Sweatband: a soft roll round the opening, following the crown's band.
  const bandPts = Array.from({ length: 96 }, (_, i) => capCrownPoint(Math.PI / 2, (i / 96) * Math.PI * 2).setY(3));
  group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bandPts, true), 192, 3.2, 8, true), under));

  // Brim: its inner edge follows the front of the band (about 156° of it), it reaches about 76 mm in front of the
  // crown at the centre and tapers to nothing at the sides, droops towards the tip (more at the sides, the way a
  // pre-curved brim does), with a darker edge.
  const a0 = (78 * Math.PI) / 180;
  const N = 48;
  const inner: THREE.Vector2[] = [];
  const outer: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const a = -a0 + (2 * a0 * i) / N;
    const b = capCrownPoint(Math.PI / 2, a);
    // Tucked 3 % inside the band so the brim meets the crown without a gap.
    inner.push(new THREE.Vector2(b.x * 0.97, b.z * 0.97));
    const reach = 76 * Math.pow(Math.cos((a / a0) * (Math.PI / 2)), 0.7);
    outer.push(new THREE.Vector2(b.x * (1 + reach / 600), b.z + reach));
  }
  const brimShape = new THREE.Shape([...outer, ...inner.reverse()]);
  const brimGeo = new THREE.ExtrudeGeometry(brimShape, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.9, bevelSegments: 2, curveSegments: 8 });
  // Shape y becomes the forward direction (+z); the extrusion becomes the brim's thickness (downwards).
  brimGeo.rotateX(Math.PI / 2);
  const bp = brimGeo.getAttribute("position");
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i);
    const z = bp.getZ(i);
    // Distance beyond the band ellipse at this direction drives the droop.
    const phi = Math.atan2(x, z);
    const rz = 106 * (1 + 0.08 * Math.max(0, Math.cos(phi)));
    const band = 1 / Math.hypot(Math.sin(phi) / 95, Math.cos(phi) / rz);
    const d = Math.max(0, Math.hypot(x, z) - band);
    bp.setY(i, bp.getY(i) - (0.1 + 0.32 * Math.sin(phi) ** 2) * d);
  }
  brimGeo.computeVertexNormals();
  const brim = mesh(brimGeo, [material, under]);
  brim.position.y = 2.5;
  group.add(brim);

  const printMeshes: THREE.Mesh[] = [];
  const overlay = overlayMaterial(o);
  if (overlay) {
    crown.updateMatrixWorld(true);
    // Project the print onto the front panel at its real size, centred about 40 % up the crown.
    const at = capCrownPoint(0.95, 0);
    const decal = new DecalGeometry(crown, at, new THREE.Euler(-0.55, 0, 0), new THREE.Vector3(p.width, p.height, 140));
    const print = mesh(decal, overlay, false);
    print.renderOrder = 2;
    group.add(print);
    printMeshes.push(print);
  }
  // Rest it the way a cap sits on a table: tipped forward onto the brim, so the brim and front panel face the camera.
  group.rotation.x = 0.28;
  return { group, family: "cap", printMeshes, viewAzimuth: 0.5 };
}

/** A cushion: a puffed, rounded square in front, a flatter back, piping round the seam. */
function buildPillow(p: ModelProduct, o: ModelOptions): ProductModel {
  const w = p.width;
  const h = p.height;
  const outline: Vec[] = [];
  const n = 160;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    // Superellipse (a rounded square), edges drawn in a little as stuffing pulls the seams.
    const k = 1 - 0.035 * Math.abs(Math.sin(2 * t));
    outline.push({ x: (Math.sign(c) * Math.pow(Math.abs(c), 2 / 6) * w * k) / 2, y: (Math.sign(s) * Math.pow(Math.abs(s), 2 / 6) * h * k) / 2 });
  }
  const surf = clothSurface(outline, { puff: Math.min(w, h) * 0.13, round: Math.min(w, h) * 0.32, cells: 96 });
  const remap = (g: THREE.BufferGeometry) => {
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
    uv.needsUpdate = true;
  };
  remap(surf.front);
  const front = mesh(surf.front, printMaterial(o, { roughness: 0.9 }));
  const back = mesh(surf.back, fabric(o.color, o, 0.95));
  const piping = mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline.map((v) => new THREE.Vector3(v.x, v.y, 0)), true), 240, 2.2, 8, true),
    fabric(shade(o.color, -0.05), o, 0.95),
  );
  const group = new THREE.Group();
  group.add(front, back, piping);
  group.position.y = h / 2;
  group.rotation.x = -0.12;
  const wrap = new THREE.Group();
  wrap.add(group);
  return { group: wrap, family: "pillow", printMeshes: [front], viewAzimuth: 0.3 };
}

/** A cuff bracelet: the print runs round the outside of an open band. */
function buildBracelet(p: ModelProduct, o: ModelOptions): ProductModel {
  const length = p.width;
  const bandH = p.height;
  // An open cuff wraps about 80 % of a circle; the gap faces away from the camera.
  const arc = 1.6 * Math.PI;
  const r = length / arc;
  const start = Math.PI + (Math.PI * 2 - arc) / 2;
  const outer = mesh(new THREE.CylinderGeometry(r, r, bandH, 128, 1, true, start, arc), printMaterial(o, { roughness: 0.2, clearcoat: 1, metalness: 0.25 }));
  const inner = mesh(new THREE.CylinderGeometry(r - 0.8, r - 0.8, bandH, 128, 1, true, start, arc), new THREE.MeshPhysicalMaterial({ color: "#d6d9dd", roughness: 0.25, metalness: 0.8, side: THREE.BackSide }));
  const edgeMat = steel("#d6d9dd", 0.25);
  const edges = [-1, 1].map((sy) => {
    const e = mesh(new THREE.TorusGeometry(r - 0.4, 0.45, 6, 128, arc), edgeMat, false);
    e.rotation.x = Math.PI / 2;
    e.rotation.z = -(start - Math.PI / 2);
    e.position.y = (sy * bandH) / 2;
    return e;
  });
  const group = new THREE.Group();
  group.add(outer, inner, ...edges);
  group.position.y = bandH / 2;
  const wrap = new THREE.Group();
  wrap.add(group);
  return { group: wrap, family: "bracelet", printMeshes: [outer], viewAzimuth: 0 };
}

/**
 * A keychain strap of white sublimation ribbon, folded through a split ring
 * and clamped at the ends. The front face shows the first half of the strap
 * image (the printed side that faces out).
 */
function buildStrap(p: ModelProduct, o: ModelOptions): ProductModel {
  const w = p.width;
  const visible = Math.max(30, p.height / 2 - 6);
  const satin = new THREE.MeshPhysicalMaterial({ color: "#f7f7f5", roughness: 0.38, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color("#ffffff") });
  const face = new THREE.PlaneGeometry(w, visible, 1, 32);
  const pos = face.getAttribute("position");
  const uv = face.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + visible / 2) / visible;
    // The ribbon bows out a little between the ring and the clamp.
    pos.setZ(i, 2.4 * Math.sin(Math.PI * t));
    // First half of the strap image: v from 1 (top, at the ring) down to 0.5.
    uv.setY(i, 0.5 + 0.5 * uv.getY(i) * (visible / (p.height / 2)) + 0.5 * (1 - visible / (p.height / 2)));
  }
  face.computeVertexNormals();
  const front = mesh(face, printMaterial(o, { roughness: 0.4, clearcoat: 0.2 }));
  front.position.y = visible / 2 + 10;
  const backLayer = mesh(new THREE.PlaneGeometry(w, visible), satin);
  backLayer.rotation.y = Math.PI;
  backLayer.position.set(0, visible / 2 + 10, -1.6);
  const fold = mesh(new THREE.CylinderGeometry(2.6, 2.6, w, 24, 1, true, 0, Math.PI), satin);
  fold.rotation.z = Math.PI / 2;
  fold.rotation.y = Math.PI / 2;
  fold.position.set(0, visible + 10, -0.8);
  const clamp = mesh(new RoundedBoxGeometry(w + 2.4, 11, 5.5, 2, 1.2), steel("#c7ccd1", 0.25));
  clamp.position.set(0, 7, -0.8);
  const keyring = ring(0, visible + 10 + 12, -0.8, 13, 1.4);
  const group = new THREE.Group();
  group.add(front, backLayer, fold, clamp, keyring);
  return { group, family: "strap", printMeshes: [front], viewAzimuth: 0.25 };
}

function buildTote(p: ModelProduct, o: ModelOptions): ProductModel {
  const W = 380;
  const H = 420;
  const material = fabric(o.color, o, 0.98);
  const body = mesh(new RoundedBoxGeometry(W, H, 26, 6, 10), material);
  body.position.y = H / 2;
  const group = new THREE.Group();
  group.add(body);
  const strap = new THREE.MeshPhysicalMaterial({ color: shade(o.color, 0.06), roughness: 0.95 });
  for (const z of [11, -11]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-85, H - 4, z), new THREE.Vector3(-70, H + 120, z * 0.6), new THREE.Vector3(0, H + 190, 0), new THREE.Vector3(70, H + 120, z * 0.6), new THREE.Vector3(85, H - 4, z)]);
    group.add(mesh(new THREE.TubeGeometry(curve, 64, 6, 10, false), strap));
  }
  const printMeshes: THREE.Mesh[] = [];
  const overlay = overlayMaterial(o);
  if (overlay) {
    const print = mesh(new THREE.PlaneGeometry(p.width, p.height), overlay, false);
    print.position.set(0, H * 0.46, 13.2);
    print.renderOrder = 2;
    group.add(print);
    printMeshes.push(print);
  }
  return { group, family: "tote", printMeshes, viewAzimuth: 0.35 };
}

// ---------------------------------------------------------------- entry point

/**
 * How often the woven-fabric normal map repeats across a model's UVs, so a
 * thread is about the same size on every product: garment caps have UVs in
 * millimetres (one tile per 6 mm); tote and cap UVs run 0 to 1 per surface.
 */
export function weaveRepeat(p: Pick<ProductPreset, "art" | "group">): number {
  if (p.art === "tote") return 64;
  if (p.art === "cap") return 90;
  return 1 / 6;
}

// ---------------------------------------------------------------- entry point

export function buildProductModel(p: ModelProduct, o: ModelOptions): ProductModel {
  if (p.wrap) return buildDrinkware(p, o);
  if (p.art === "flag") return buildFlag(p, o);
  if (p.art === "cap") return buildCap(p, o);
  if (p.art === "tote") return buildTote(p, o);
  if (p.art === "pillow") return buildPillow(p, o);
  if (p.art === "bracelet") return buildBracelet(p, o);
  if (p.art === "strap") return buildStrap(p, o);
  if (p.group === "apparel") return buildGarment(p, o);
  return buildFlat(p, o);
}

/** Free every geometry and material in a model (textures are owned by the caller). */
export function disposeModel(root: THREE.Object3D) {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.dispose();
  });
}
