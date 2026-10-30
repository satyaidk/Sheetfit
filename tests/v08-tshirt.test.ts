import { describe, expect, it } from "vitest";
import fs from "node:fs";
import * as THREE from "three";
import { PRODUCTS, findProduct } from "@/lib/catalogue/products";
import { buildProductModel, disposeModel, teePrintPlacement, teeSpecFor } from "@/lib/three/product-model";
import { ADULT_LONGSLEEVE, ADULT_TEE, TODDLER_TEE, YOUTH_TEE, placeInside, printPatch, surfaceArea, teeModel, torsoProfile } from "@/lib/three/tshirt-model";
import { fabricRoughnessPixels, knitNormalPixels } from "@/lib/three/fabric-maps";
import { whiteBalance } from "@/lib/three/studio";

const tee = teeModel(ADULT_TEE);
const textures = { overlay: new THREE.Texture() };
const part = (name: string) => tee.parts.find((p) => p.name === name)!;

function bounds(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  return g.boundingBox!;
}

describe("T-shirt garment mesh", () => {
  it("is an adult medium at real size: 737 mm long, sleeves out, a body with depth", () => {
    const body = bounds(part("TShirt_Body").geometry);
    // The rolled hem edge reaches half the fabric thickness below the hem line.
    expect(body.min.y).toBeLessThan(0);
    expect(body.min.y).toBeGreaterThan(-ADULT_TEE.thickness);
    expect(body.max.y).toBeCloseTo(737, 0);
    // About a metre round the chest: wider than deep, as worn.
    expect(body.max.x - body.min.x).toBeGreaterThan(400);
    expect(body.max.z - body.min.z).toBeGreaterThan(200);
    expect(body.max.z - body.min.z).toBeLessThan(body.max.x - body.min.x);
    const all = new THREE.Box3();
    for (const p of tee.parts) all.union(bounds(p.geometry));
    expect(all.max.x - all.min.x).toBeGreaterThan(650);
    expect(all.max.x - all.min.x).toBeLessThan(800);
    // The collar stands above the shoulder.
    expect(bounds(part("TShirt_Collar").geometry).max.y).toBeGreaterThan(737);
  });

  it("has named parts with outside and inside fabric, and no broken vertices", () => {
    expect(tee.parts.map((p) => p.name)).toEqual(["TShirt_Body", "TShirt_Sleeve_Left", "TShirt_Sleeve_Right", "TShirt_Collar", "TShirt_Seams"]);
    for (const p of tee.parts) {
      const g = p.geometry;
      expect(g.groups.length || 1, p.name).toBe(p.materials.length);
      const pos = g.getAttribute("position");
      const nor = g.getAttribute("normal");
      // Count problems in plain loops and assert once: an expect per vertex is slow under coverage.
      let bad = 0;
      for (let i = 0; i < pos.count; i++) {
        if (!Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))) bad++;
        if (Math.abs(Math.hypot(nor.getX(i), nor.getY(i), nor.getZ(i)) - 1) > 0.01) bad++;
      }
      expect(bad, p.name).toBe(0);
      const index = g.index!.array;
      let maxIndex = 0;
      for (let i = 0; i < index.length; i++) maxIndex = Math.max(maxIndex, index[i]);
      expect(maxIndex, p.name).toBeLessThan(pos.count);
    }
  });

  it("faces the outer fabric outwards all round the body", () => {
    const s = tee.panels.front;
    let checked = 0;
    for (let i = 0; i < s.position.length / 3; i += 13) {
      const y = s.position[i * 3 + 1];
      if (y < 60 || y > 450) continue; // the body wall, below the sleeves
      const out = s.position[i * 3] * s.normal[i * 3] + s.position[i * 3 + 2] * s.normal[i * 3 + 2];
      expect(out).toBeGreaterThan(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(500);
  });

  it("closes round the back without a seam in the surface or its shading", () => {
    // The first and last columns of the torso grid are the same line on the back centre.
    const s = tee.panels.back;
    const cols = 225;
    const rows = s.position.length / 3 / cols;
    for (let r = 0; r < rows; r += 5) {
      const a = r * cols;
      const b = r * cols + cols - 1;
      for (let c = 0; c < 3; c++) {
        expect(s.position[b * 3 + c]).toBeCloseTo(s.position[a * 3 + c], 4);
        expect(s.normal[b * 3 + c]).toBeCloseTo(s.normal[a * 3 + c], 4);
      }
    }
  });

  it("sews the sleeves onto the body along the armhole, without passing through it", () => {
    const body = tee.panels.front.position;
    const sleeve = tee.panels.sleeveLeft;
    const nearestBody = (p: THREE.Vector3) => {
      let best = Infinity;
      for (let i = 0; i < body.length; i += 3) best = Math.min(best, (body[i] - p.x) ** 2 + (body[i + 1] - p.y) ** 2 + (body[i + 2] - p.z) ** 2);
      return Math.sqrt(best);
    };
    // Row 0 of the sleeve is the armhole: every point lies on the torso (within the grid spacing).
    for (let j = 0; j < 129; j += 8) expect(nearestBody(new THREE.Vector3().fromArray(sleeve.position, j * 3))).toBeLessThan(6);
    // Every other sleeve vertex lies outside the body (further from the axis than the torso at that angle and height).
    const pts = new Map<number, THREE.Vector2[]>();
    for (let i = 129 * 3; i < sleeve.position.length / 3; i += 11) {
      const [x, y, z] = [sleeve.position[i * 3], sleeve.position[i * 3 + 1], sleeve.position[i * 3 + 2]];
      const theta = Math.atan2(x, z);
      const key = Math.round(theta * 50);
      if (!pts.has(key)) pts.set(key, torsoProfile(ADULT_TEE, key / 50));
      const profile = pts.get(key)!;
      const hit = profile.findIndex((q) => q.y >= y);
      if (hit <= 0) continue; // above the neckline: nothing to pass through
      expect(Math.hypot(x, z)).toBeGreaterThan(profile[hit].x - 3);
    }
  });

  it("has a round crew neck: the front drops 85 mm in a curve, not a V", () => {
    const front = torsoProfile(ADULT_TEE, 0).at(-1)!;
    expect(front.y).toBeCloseTo(737 - 85, 0);
    // Halfway across the neck the drop is still most of the way down (a V would be at half).
    const side = (theta: number) => {
      const p = torsoProfile(ADULT_TEE, theta).at(-1)!;
      return { x: p.x * Math.sin(theta), drop: 737 - p.y };
    };
    let theta = 0;
    while (side(theta).x < 46) theta += 0.01;
    expect(side(theta).drop).toBeGreaterThan(0.75 * 85);
  });

  it("builds youth, toddler and long-sleeve sizes in proportion", () => {
    const height = (t: ReturnType<typeof teeModel>) => bounds(t.parts[0].geometry).max.y;
    expect(height(teeModel(YOUTH_TEE))).toBeCloseTo(737 * 0.78, 0);
    expect(height(teeModel(TODDLER_TEE))).toBeCloseTo(737 * 0.56, 0);
    const long = teeModel(ADULT_LONGSLEEVE);
    expect(long.landmarks.sleeveTop).toBeGreaterThan(550);
    expect(bounds(long.parts[1].geometry).min.y).toBeGreaterThan(0);
  });

  it("returns the same cached geometry for a size", () => {
    expect(teeModel(ADULT_TEE)).toBe(tee);
  });
});

describe("prints on the T-shirt", () => {
  it("keeps a print at its true size on the cloth on every panel", () => {
    for (const [panel, rect] of [
      ["front", { u: 0, v: 420, w: 279, h: 279 }],
      ["back", { u: 0, v: 420, w: 305, h: 356 }],
      ["sleeveLeft", { u: 0, v: 100, w: 89, h: 89 }],
      ["sleeveRight", { u: 0, v: 100, w: 76, h: 25 }],
    ] as const) {
      const g = printPatch(tee, panel, rect)!;
      const ratio = surfaceArea(g) / (rect.w * rect.h);
      expect(ratio, panel).toBeGreaterThan(0.97);
      expect(ratio, panel).toBeLessThan(1.03);
      // UVs cover exactly 0 to 1: the design keeps its aspect and is not repeated or squeezed.
      const uv = g.getAttribute("uv");
      let [u0, u1, v0, v1] = [1, 0, 1, 0];
      for (let i = 0; i < uv.count; i++) {
        u0 = Math.min(u0, uv.getX(i));
        u1 = Math.max(u1, uv.getX(i));
        v0 = Math.min(v0, uv.getY(i));
        v1 = Math.max(v1, uv.getY(i));
      }
      expect([u0, u1, v0, v1].map((x) => Number(x.toFixed(3)))).toEqual([0, 1, 0, 1]);
    }
  });

  it("lies on the cloth, lifted a fraction of a millimetre, following the folds", () => {
    const g = printPatch(tee, "front", { u: 0, v: 420, w: 279, h: 279 }, 0.35)!;
    const pos = g.getAttribute("position");
    const body = tee.panels.front;
    // Compare with the nearest garment vertex along a sample of print vertices.
    for (let i = 0; i < pos.count; i += 97) {
      const p = new THREE.Vector3().fromBufferAttribute(pos, i);
      let best = Infinity;
      for (let k = 0; k < body.position.length; k += 3) best = Math.min(best, p.distanceToSquared(new THREE.Vector3().fromArray(body.position, k)));
      expect(Math.sqrt(best)).toBeLessThan(5);
    }
  });

  it("puts each preset on the right panel, facing the camera that opens on it", () => {
    const panelOf = (id: string) => {
      const p = findProduct(id)!;
      return teePrintPlacement(p, teeModel(teeSpecFor(p)!)).panel;
    };
    expect(panelOf("tee-full-front")).toBe("front");
    expect(panelOf("tee-left-chest")).toBe("front");
    expect(panelOf("tee-full-back")).toBe("back");
    expect(panelOf("tee-back-neck")).toBe("back");
    // The illustration's left sleeve is the wearer's right.
    expect(panelOf("tee-sleeve")).toBe("sleeveRight");
    expect(panelOf("longsleeve-arm")).toBe("sleeveRight");
    const sleeve = buildProductModel(findProduct("tee-sleeve")!, { color: "#ffffff", process: "dtf", textures });
    expect(new THREE.Box3().setFromObject(sleeve.printMeshes[0]).getCenter(new THREE.Vector3()).x).toBeLessThan(-150);
    expect(sleeve.frontAzimuth).toBeCloseTo(-Math.PI / 2);
    expect(sleeve.viewElevation).toBeGreaterThan(0.3);
    disposeModel(sleeve.group);
  });

  it("keeps every apparel preset's print inside its panel's printable area", () => {
    for (const p of PRODUCTS.filter((x) => teeSpecFor(x))) {
      const t = teeModel(teeSpecFor(p)!);
      const { panel, rect } = teePrintPlacement(p, t);
      const a = t.printable[panel];
      expect(rect.u - rect.w / 2, p.id).toBeGreaterThanOrEqual(a.u0 - 1e-6);
      expect(rect.u + rect.w / 2, p.id).toBeLessThanOrEqual(a.u1 + 1e-6);
      expect(rect.v - rect.h / 2, p.id).toBeGreaterThanOrEqual(a.v0 - 1e-6);
      expect(rect.v + rect.h / 2, p.id).toBeLessThanOrEqual(a.v1 + 1e-6);
    }
  });

  it("moves an overhanging print inside, and cuts (never shrinks) one larger than the area", () => {
    const a = tee.printable.front;
    expect(placeInside(tee, "front", { u: a.u1, v: 400, w: 100, h: 100 }).u).toBeCloseTo(a.u1 - 50);
    const huge = { u: 0, v: 400, w: 2000, h: 300 };
    expect(placeInside(tee, "front", huge).u).toBeCloseTo((a.u0 + a.u1) / 2);
    const g = printPatch(tee, "front", huge)!;
    // Cut to the printable width; the UVs still map the full 2 m design, so its aspect is kept.
    expect(surfaceArea(g)).toBeLessThan((a.u1 - a.u0) * 300 * 1.03);
    expect(printPatch(tee, "front", { u: 5000, v: 400, w: 10, h: 10 })).toBeNull();
  });

  it("swaps the print at runtime without touching the garment's cached geometry", () => {
    const p = findProduct("tee-full-front")!;
    const before = part("TShirt_Body").geometry.getAttribute("position").array.slice(0, 30);
    const a = buildProductModel(p, { color: "#ffffff", process: "dtf", textures: { overlay: new THREE.Texture() } });
    disposeModel(a.group);
    const b = buildProductModel(p, { color: "#c4302b", process: "sublimation", textures: { overlay: new THREE.Texture() } });
    expect(b.printMeshes).toHaveLength(1);
    expect(part("TShirt_Body").geometry.getAttribute("position").array.slice(0, 30)).toEqual(before);
    disposeModel(b.group);
  });
});

describe("fabric detail maps", () => {
  it("draws a knit normal map of unit normals pointing out of the cloth", () => {
    const { size, data } = knitNormalPixels(64, 8, 10);
    expect(data.length).toBe(64 * 64 * 4);
    for (let i = 0; i < data.length; i += 4 * 17) {
      const n = [data[i], data[i + 1], data[i + 2]].map((v) => (v / 255) * 2 - 1);
      expect(Math.hypot(...n)).toBeCloseTo(1, 1);
      expect(n[2]).toBeGreaterThan(0.3);
    }
    expect(size).toBe(64);
  });

  it("keeps roughness within its range in the green channel", () => {
    const { data } = fabricRoughnessPixels(32, 0.8, 0.95);
    for (let i = 1; i < data.length; i += 4) {
      expect(data[i]).toBeGreaterThanOrEqual(Math.floor(0.8 * 255));
      expect(data[i]).toBeLessThanOrEqual(Math.ceil(0.95 * 255));
    }
  });
});

describe("studio lighting", () => {
  it("white-balances a cool panorama to neutral grey, keeping its brightness", () => {
    const px = new Float32Array([0.5, 0.6, 0.7, 1, 2, 2.3, 2.6, 1]);
    const lumBefore = (0.2126 * 2.5 + 0.7152 * 2.9 + 0.0722 * 3.3) / 2;
    whiteBalance(px);
    const mean = [0, 1, 2].map((c) => (px[c] + px[4 + c]) / 2);
    expect(mean[0]).toBeCloseTo(mean[2], 5);
    expect(mean[1]).toBeCloseTo(mean[2], 5);
    expect(mean[0]).toBeCloseTo(lumBefore, 5);
  });
});

describe("exported model file", () => {
  it("public/models/tshirt.glb is current: same parts and vertex counts as the generator (npm run model:tshirt)", () => {
    const glb = fs.readFileSync("public/models/tshirt.glb");
    expect(glb.readUInt32LE(0)).toBe(0x46546c67); // "glTF"
    expect(glb.readUInt32LE(4)).toBe(2);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8"));
    const counts = new Map<string, number>();
    for (const mesh of json.meshes) counts.set(mesh.name, mesh.primitives.reduce((n: number, p: { attributes: { POSITION: number } }) => n + json.accessors[p.attributes.POSITION].count, 0));
    for (const p of tee.parts) expect(counts.get(p.name), p.name).toBe(p.geometry.getAttribute("position").count);
    expect(json.asset.extras.printable.front.u1).toBeCloseTo(tee.printable.front.u1, 0);
    expect(json.extensionsUsed).toContain("KHR_materials_sheen");
  });
});
