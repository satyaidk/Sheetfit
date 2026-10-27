/**
 * Procedural 3D models of every product, at real size (1 unit = 1 mm).
 *
 * Each product's illustration kind maps to a builder:
 *
 * - Drinkware is lathed from a radius profile (mugs, tumblers, cans, bottles),
 *   with handles, lids, straws and saucers added as separate parts. The
 *   circumference comes from the wrap width; for handled mugs a gap is added
 *   for the handle, which the wrap does not cover. The print band is a thin
 *   lathe just outside the body, so its texture follows tapers exactly.
 * - Flat goods are bevelled slabs cut from their outline (round, rounded
 *   rectangle, stadium, chamfered tag) with holes, rings, strings and the
 *   right back (cork, rubber, magnet, aluminium).
 * - Garments extrude the same outlines the 2D mockups use (`outlines.ts`) into
 *   a soft, slightly curved body; the print is a layer on the front at its
 *   true size and position.
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
import type { PrintProcess } from "@/types/editor";

export type ModelProduct = Pick<ProductPreset, "id" | "art" | "artArea" | "wrap" | "width" | "height" | "bleed" | "group" | "shape">;

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
}

export interface ModelOptions {
  /** Blank colour (hex). */
  color: string;
  process: PrintProcess;
  textures?: Partial<ModelTextures>;
}

export interface ProductModel {
  group: THREE.Group;
  /** The family of builder used, for tests and diagnostics. */
  family: "drinkware" | "flat" | "garment" | "cap" | "tote" | "flag";
  /** Meshes carrying the print, for tests. */
  printMeshes: THREE.Mesh[];
  /** Camera angle around the vertical axis (rad from +Z) that shows the print best. */
  viewAzimuth: number;
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

/** A closed wall: outer profile up, a rounded rim, the inner wall down, and the inside floor. */
function vesselGeometry(outer: Profile, wall: number, segments = 96) {
  const top = outer[outer.length - 1];
  const inner: Profile = outer.filter(([, y]) => y >= wall * 2).map(([r, y]) => [Math.max(0.5, r - wall), y]);
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, wall * 2),
    ...inner.map(([r, y]) => new THREE.Vector2(r, y)),
    new THREE.Vector2(top[0] - wall * 0.5, top[1] + wall * 0.35),
    ...[...outer].reverse().map(([r, y]) => new THREE.Vector2(r, y)),
    new THREE.Vector2(0.001, 0),
  ];
  return new THREE.LatheGeometry(pts, segments);
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

/** A C or D handle on the +X side, as a tube along a smooth curve. */
function handle(r: number, yTop: number, yBottom: number, reach: number, thickness: number, material: THREE.Material) {
  const mid = (yTop + yBottom) / 2;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(r - 2, yTop, 0),
    new THREE.Vector3(r + reach * 0.55, yTop + thickness * 0.4, 0),
    new THREE.Vector3(r + reach, mid + (yTop - yBottom) * 0.18, 0),
    new THREE.Vector3(r + reach * 0.95, mid - (yTop - yBottom) * 0.2, 0),
    new THREE.Vector3(r + reach * 0.5, yBottom - thickness * 0.3, 0),
    new THREE.Vector3(r - 2, yBottom, 0),
  ]);
  return mesh(new THREE.TubeGeometry(curve, 80, thickness / 2, 20, false), material);
}

function cylinderPart(rTop: number, rBottom: number, h: number, y: number, material: THREE.Material, segments = 64) {
  const m = mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material);
  m.position.y = y + h / 2;
  return m;
}

function straw(x: number, y0: number, length: number) {
  const s = mesh(new THREE.CylinderGeometry(3.4, 3.4, length, 24, 1, true), clearPlastic());
  s.position.set(x, y0 + length / 2, 0);
  s.rotation.z = -0.06;
  return s;
}

interface DrinkSpec {
  outer: Profile;
  wall: number;
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
      const C = w + 32;
      const R = C / (2 * Math.PI);
      const H = h + 7;
      const outer: Profile = [[R - 3, 0], [R - 0.6, 1.2], [R, 3], [R, H - 1], [R - 0.4, H]];
      const body = ceramic(color);
      return { outer, wall: 3.6, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: (w / C) * full, body, extras: [handle(R, H * 0.84, H * 0.2, R * 0.72, 11, body)] };
    }
    case "enamel-mug": {
      const C = w + 26;
      const R = C / (2 * Math.PI);
      const H = h + 16;
      const outer: Profile = [[R - 2, 0], [R, 2], [R, H]];
      const body = coated(color);
      const rim = mesh(new THREE.TorusGeometry(R - 0.6, 1.4, 12, 96), steel("#b8bfc6", 0.25));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = H;
      const foot = mesh(new THREE.TorusGeometry(R - 1.2, 1.1, 10, 96), steel("#b8bfc6", 0.25));
      foot.rotation.x = Math.PI / 2;
      foot.position.y = 1.1;
      return { outer, wall: 1.2, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: (w / C) * full, body, extras: [rim, foot, handle(R, H * 0.85, H * 0.32, R * 0.6, 6, steel("#b8bfc6", 0.25))] };
    }
    case "espresso": {
      const C = w + 22;
      const Rt = C / (2 * Math.PI);
      const Rb = Rt * 0.8;
      const H = h + 10;
      const outer: Profile = [[Rb - 3, 0], [Rb, 3], [Rt, H]];
      const body = ceramic(color);
      const saucerProfile = [new THREE.Vector2(0.001, 0), new THREE.Vector2(Rt * 1.55, 0.5), new THREE.Vector2(Rt * 1.85, 6), new THREE.Vector2(Rt * 1.8, 7.5), new THREE.Vector2(Rt * 1.45, 3), new THREE.Vector2(0.001, 2.5)];
      const saucer = mesh(new THREE.LatheGeometry(saucerProfile, 96), ceramic(color));
      saucer.position.y = -6;
      return { outer, wall: 3, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: (w / C) * full, body, extras: [saucer, handle(radiusAt(outer, H * 0.6), H * 0.82, H * 0.3, Rt * 0.55, 7, body)] };
    }
    case "glass-can": {
      const R = (w * 0.94) / (2 * Math.PI);
      const H = h + 24;
      const outer: Profile = [[R - 5, 0], [R - 1, 1.5], [R, 6], [R, H - 6], [R - 2.5, H - 1], [R - 2.5, H]];
      const lid = cylinderPart(R - 1.5, R - 1.5, 8, H - 2, wood());
      return { outer, wall: 2.2, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: full, body: glass(), bandOpacity: 0.94, extras: [lid, straw(R * 0.35, H - 40, 120)] };
    }
    case "tumbler": {
      const R = w / (2 * Math.PI);
      const H = h + 20;
      const outer: Profile = [[R - 4, 0], [R - 0.5, 1.5], [R, 4], [R, H]];
      const lid = cylinderPart(R + 0.8, R + 0.8, 11, H - 4, clearPlastic());
      const lidTop = cylinderPart(R * 0.82, R + 0.8, 4, H + 7, clearPlastic());
      return { outer, wall: 1.5, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: full, body: coated(color), extras: [lid, lidTop, straw(R * 0.3, H - 60, 210)] };
    }
    case "tumbler-handle": {
      // 40 oz quencher: tapered base, straight top section, big D handle.
      const R = w / (2 * Math.PI);
      const taper = 112;
      const H = taper + (p.id.endsWith("bottom") ? 148 : h);
      const outer: Profile = [[R * 0.7 - 4, 0], [R * 0.7, 4], [R * 0.74, 20], [R, taper], [R, H]];
      const isBottom = p.id.endsWith("bottom");
      const bandY: [number, number] = isBottom ? [taper - h - 4, taper - 4] : [taper + 4, Math.min(H - 6, taper + 4 + h)];
      const steelPart = steel("#d3d7db", 0.35);
      const lid = cylinderPart(R + 1, R + 1, 14, H - 2, plastic("#3b4149"));
      const dome = cylinderPart(R * 0.5, R + 1, 10, H + 12, plastic("#3b4149"));
      return {
        outer,
        wall: 1.6,
        bandY,
        bandAngle: (w / (2 * Math.PI * R)) * full,
        body: coated(color),
        extras: [lid, dome, straw(R * 0.25, H - 80, 250), handle(R, H - 22, taper + 10, R * 0.95, 16, steelPart)],
      };
    }
    case "travel-tumbler": {
      const R = w / (2 * Math.PI);
      const H = h + 36;
      const outer: Profile = [[R * 0.88 - 3, 0], [R * 0.88, 3], [R, H * 0.4], [R, H]];
      const lid = cylinderPart(R + 1, R + 1, 26, H - 2, plastic("#2e3338"));
      return { outer, wall: 4, bandY: [8, 8 + h], bandAngle: full, body: ceramic(color), extras: [lid] };
    }
    case "wine-tumbler": {
      const Rm = w / (2 * Math.PI);
      const H = h + 12;
      const outer: Profile = [[Rm * 0.62 - 3, 0], [Rm * 0.62, 2], [Rm * 0.86, H * 0.18], [Rm, H * 0.45], [Rm * 0.97, H * 0.75], [Rm * 0.9, H]];
      const lid = cylinderPart(Rm * 0.9 + 0.6, Rm * 0.9 + 0.6, 8, H - 3, clearPlastic());
      return { outer, wall: 1.5, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: full, body: coated(color), extras: [lid] };
    }
    case "can-cooler": {
      const R = w / (2 * Math.PI);
      const H = h + 10;
      const outer: Profile = [[R - 3, 0], [R, 3], [R, H]];
      const gasket = mesh(new THREE.TorusGeometry(R - 2, 2.2, 12, 96), rubber());
      gasket.rotation.x = Math.PI / 2;
      gasket.position.y = H - 1;
      return { outer, wall: 1.4, bandY: [(H - h) / 2, (H + h) / 2], bandAngle: full, body: coated(color), extras: [gasket] };
    }
    case "bottle":
    default: {
      const R = w / (2 * Math.PI);
      const Hb = h + 16;
      const outer: Profile = [[R - 4, 0], [R, 4], [R, Hb], [R * 0.86, Hb + 14], [R * 0.55, Hb + 26], [15, Hb + 34], [15, Hb + 46]];
      const cap = cylinderPart(17, 17, 28, Hb + 44, plastic("#2e3338", 0.6));
      const loop = mesh(new THREE.TorusGeometry(8, 2.4, 12, 48), plastic("#2e3338", 0.6));
      loop.position.set(0, Hb + 78, 0);
      return { outer, wall: 1.4, bandY: [(Hb - h) / 2 + 2, (Hb - h) / 2 + 2 + h], bandAngle: full, body: coated(color), extras: [cap, loop] };
    }
  }
}

function buildDrinkware(p: ModelProduct, o: ModelOptions): ProductModel {
  const spec = drinkSpec(p, o);
  const group = new THREE.Group();
  group.add(mesh(vesselGeometry(spec.outer, spec.wall), spec.body));
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
  return { group, family: "drinkware", printMeshes: [band], viewAzimuth: handled ? -1.15 : 0.3 };
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
      cap.position.set(0, h + 3, 0);
      const loop = mesh(new THREE.TorusGeometry(9, 0.9, 8, 48), new THREE.MeshStandardMaterial({ color: "#b3122e", roughness: 0.8 }));
      loop.position.set(0, h + 15, 0);
      return { shape: circle(w), thickness: 3.2, face: { roughness: 0.25, clearcoat: 1 }, back: white, side: white, extras: [cap, loop] };
    }
    case "keychain": {
      const shape = p.shape === "circle" ? circle(w) : roundedRect(w, h, 4);
      shape.holes.push(hole(0, h - 5.5, 2.4));
      return { shape, thickness: 3, face: { roughness: 0.25, clearcoat: 1 }, back: white, side: white, extras: [ring(0, h + 6.5, 1.5, 12, 1.2)] };
    }
    case "pet-tag": {
      const shape = roundedRect(w, h, w / 2);
      shape.holes.push(hole(0, h - 4.5, 2));
      return { shape, thickness: 2, face: { roughness: 0.25, clearcoat: 1, metalness: 0.2 }, back: alu, side: alu, extras: [ring(0, h + 5.5, 1, 9, 1)] };
    }
    case "luggage-tag": {
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
    case "magnet":
    default:
      return { shape: roundedRect(w, h, 4), thickness: 1.2, face: { roughness: 0.25, clearcoat: 1, metalness: 0.2 }, back: rubber("#202022"), side: alu, extras: [] };
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
  fitUVs(faceGeo);
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

function buildGarment(p: ModelProduct, o: ModelOptions): ProductModel {
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
  const printMeshes: THREE.Mesh[] = [];
  const overlay = overlayMaterial(o);
  if (overlay && p.artArea) {
    const c = toMm({ x: p.artArea.x + p.artArea.w / 2, y: p.artArea.y + p.artArea.h / 2 });
    const plane = new THREE.PlaneGeometry(p.width, p.height, 32, 32);
    plane.translate(c.x, c.y, 0);
    const pos = plane.getAttribute("position");
    for (let i = 0; i < pos.count; i++) pos.setZ(i, surfaceZ(pos.getX(i), pos.getY(i)) + 0.9);
    bend(plane, curvature);
    const print = mesh(plane, overlay, false);
    print.renderOrder = 2;
    group.add(print);
    printMeshes.push(print);
  }
  return { group, family: "garment", printMeshes, viewAzimuth: 0.3 };
}

function buildCap(p: ModelProduct, o: ModelOptions): ProductModel {
  const R = 92;
  const material = fabric(o.color, o, 0.9);
  const crownGeo = new THREE.SphereGeometry(R, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const crown = mesh(crownGeo, material);
  crown.scale.set(1, 0.78, 1.08);
  const group = new THREE.Group();
  group.add(crown);
  // Six panel seams from the button down to the band.
  const seamMat = new THREE.MeshStandardMaterial({ color: shade(o.color, 0.25), roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 24; j++) {
      const t = (j / 24) * (Math.PI / 2);
      pts.push(new THREE.Vector3(Math.sin(a) * Math.sin(t) * R * 1.003, Math.cos(t) * R * 0.78 * 1.003, Math.cos(a) * Math.sin(t) * R * 1.08 * 1.003));
    }
    group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.7, 6, false), seamMat, false));
  }
  const button = mesh(new THREE.SphereGeometry(6, 20, 12), material);
  button.position.y = R * 0.78;
  button.scale.y = 0.6;
  group.add(button);
  // Brim: a flattened half-oval, curved down at the sides.
  const brimShape = new THREE.Shape();
  brimShape.absellipse(0, 0, R * 0.98, R * 0.85, Math.PI, Math.PI * 2, false, 0);
  const brimGeo = new THREE.ExtrudeGeometry(brimShape, { depth: 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 48 });
  brimGeo.rotateX(-Math.PI / 2);
  const bp = brimGeo.getAttribute("position");
  for (let i = 0; i < bp.count; i++) bp.setY(i, bp.getY(i) - 1.6e-3 * bp.getX(i) ** 2);
  brimGeo.computeVertexNormals();
  const brim = mesh(brimGeo, material);
  brim.position.set(0, 4, R * 0.95);
  brim.rotation.x = -0.12;
  group.add(brim);

  const printMeshes: THREE.Mesh[] = [];
  const overlay = overlayMaterial(o);
  if (overlay) {
    crown.updateMatrixWorld(true);
    // Project the print onto the front panel at its real size.
    const decal = new DecalGeometry(crown, new THREE.Vector3(0, R * 0.78 * 0.42, R * 1.08 * 0.9), new THREE.Euler(-0.4, 0, 0), new THREE.Vector3(p.width, p.height, 120));
    const print = mesh(decal, overlay, false);
    print.renderOrder = 2;
    group.add(print);
    printMeshes.push(print);
  }
  return { group, family: "cap", printMeshes, viewAzimuth: 0.45 };
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
