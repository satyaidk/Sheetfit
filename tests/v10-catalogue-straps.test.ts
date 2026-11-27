/**
 * v0.10: sourced catalogue additions, shaped-blank outlines, lanyard and
 * keychain straps on sheets, the new 3D builders, and what the live preview
 * shows for stickers and straps.
 */

import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { PRODUCTS, findProduct, GROUP_LABELS } from "@/lib/catalogue/products";
import { V10_PRODUCTS } from "@/lib/catalogue/products-v10";
import { OUTLINE_LABELS, outlineFor, outlineIn, outlinePoints, type OutlineKind } from "@/lib/catalogue/blank-outlines";
import { boxOutline, cutPaths, flattenPath, polygonArea, validatePolygon } from "@/lib/cut/cut-path";
import { RIBBON_WIDTHS, strapArtPlacements, strapDesign, strapImageSize, strapPreset, strapSections, validateStrap, type StrapSpec } from "@/lib/layout/strap";
import { planFill } from "@/lib/layout/fill";
import { buildProductModel, disposeModel } from "@/lib/three/product-model";
import { previewOutline, previewProductFor } from "@/components/products/preview-product";
import { migrateDesign } from "@/lib/storage/migrate";
import { makeDesign, makePage } from "./fixtures";

const textures = { print: new THREE.Texture(), overlay: new THREE.Texture(), weave: new THREE.Texture(), cork: new THREE.Texture() };
const size = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());

describe("catalogue additions", () => {
  it("adds every v0.10 product exactly once, with a source, a date and the size printed there", () => {
    expect(V10_PRODUCTS.length).toBeGreaterThanOrEqual(50);
    const ids = new Set(PRODUCTS.map((p) => p.id));
    expect(ids.size).toBe(PRODUCTS.length);
    for (const p of V10_PRODUCTS) {
      expect(ids.has(p.id), p.id).toBe(true);
      expect(p.checked, p.id).toBe("2026-11-27");
      expect(p.supplier, p.id).toBeTruthy();
      expect(() => new URL(p.source), p.id).not.toThrow();
      expect(p.width, p.id).toBeGreaterThan(5);
      expect(p.height, p.id).toBeGreaterThan(5);
    }
    // Spot-check sizes against the source pages (inches × 25.4, rounded to 0.1 mm).
    expect([findProduct("ornament-star")!.width, findProduct("ornament-star")!.height]).toEqual([96.8, 101.1]);
    expect(findProduct("wall-clock-8.125")!.width).toBe(206.4);
    expect([findProduct("cuff-0.875")!.width, findProduct("cuff-0.875")!.height]).toEqual([165.1, 22.2]);
    expect(findProduct("pillow-cover-15.74")!.width).toBe(399.8);
  });

  it("labels every product group", () => {
    for (const p of PRODUCTS) expect(GROUP_LABELS[p.group], p.id).toBeTruthy();
  });

  it("says when a DTF box only knows its width", () => {
    for (const id of ["crewneck-front", "jacket-back", "zip-hoodie-chest", "tank-front", "youth-sleeve"]) {
      const p = findProduct(id)!;
      expect(p.processes).toEqual(["dtf"]);
      expect(p.confidence).toBe("medium");
      expect(p.note).toMatch(/width only/);
    }
  });
});

describe("shaped blank outlines", () => {
  const kinds = Object.keys(OUTLINE_LABELS) as OutlineKind[];

  it("are closed, clockwise, simple polygons filling the unit box", () => {
    for (const k of kinds) {
      const pts = outlinePoints(k);
      expect(validatePolygon(pts), k).toEqual([]);
      expect(polygonArea(pts), k).toBeGreaterThan(0.2);
      const xs = pts.filter((_, i) => i % 2 === 0);
      const ys = pts.filter((_, i) => i % 2 === 1);
      expect(Math.min(...xs), k).toBeCloseTo(0, 9);
      expect(Math.max(...xs), k).toBeCloseTo(1, 9);
      expect(Math.min(...ys), k).toBeCloseTo(0, 9);
      expect(Math.max(...ys), k).toBeCloseTo(1, 9);
    }
  });

  it("lays a dog bone along the long side of its box", () => {
    const tall = outlineFor("bone", 0.6);
    const wide = outlineFor("bone", 1.5);
    expect(validatePolygon(wide)).toEqual([]);
    // The shaft runs vertically in a tall box and horizontally in a wide one:
    // the narrowest part of the outline is across x for tall, across y for wide.
    const widthAt = (pts: number[], y: number) => {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i += 2) {
        const j = (i + 2) % pts.length;
        const [y1, y2] = [pts[i + 1], pts[j + 1]];
        if ((y1 - y) * (y2 - y) <= 0 && y1 !== y2) xs.push(pts[i] + ((y - y1) / (y2 - y1)) * (pts[j] - pts[i]));
      }
      return Math.max(...xs) - Math.min(...xs);
    };
    // Tall: a 0.32-wide shaft crosses the middle. Wide: the middle line runs notch to notch through the shaft.
    expect(widthAt(tall, 0.5)).toBeLessThan(0.5);
    expect(widthAt(wide, 0.5)).toBeGreaterThan(0.7);
  });

  it("gives shaped products their outline as the cut path, at the trim", () => {
    const d = makeDesign({ productId: "ornament-heart", width: 80, height: 82, bleed: 2 });
    const [path] = cutPaths(d);
    const pts = flattenPath(path);
    expect(validatePolygon(pts)).toEqual([]);
    const xs = pts.filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeCloseTo(-38, 6);
    expect(Math.max(...xs)).toBeCloseTo(38, 6);
    // A cut the user chose wins over the outline.
    const own = cutPaths({ ...d, cut: { shape: "rect", radius: 0, offset: 0, through: "die", safeInset: 0, contour: null } });
    expect(flattenPath(own[0])).toHaveLength(8);
    expect(outlineIn("heart", { x: 0, y: 0, width: 10, height: 10 })).toHaveLength(outlinePoints("heart").length);
  });
});

describe("straps on sheets", () => {
  const spec = (over: Partial<StrapSpec> = {}): StrapSpec => ({ width: 16, length: 130, fold: true, endZone: 0, mode: "repeat", along: true, ...over });

  it("offers the 12, 16 and 20 mm ribbon widths and needs a length from the user", () => {
    expect([...RIBBON_WIDTHS]).toEqual([12, 16, 20]);
    expect(validateStrap({ width: 16 })[0].field).toBe("length");
    expect(validateStrap({ width: 16, length: 10 })[0].message).toMatch(/longer than it is wide/);
    expect(validateStrap(spec({ endZone: 70 }))[0].field).toBe("endZone");
    expect(validateStrap(spec())).toEqual([]);
  });

  it("turns the second half 180° so a folded strap reads upright on both faces", () => {
    const [a, b] = strapSections(spec({ endZone: 5 }));
    expect(a.rotation).toBe(0);
    expect(b.rotation).toBe(180);
    expect(a.rect).toEqual({ x: 0, y: 5, width: 16, height: 60 });
    expect(b.rect).toEqual({ x: 0, y: 65, width: 16, height: 60 });
    expect(strapSections(spec({ fold: false, endZone: 5 }))).toEqual([{ rect: { x: 0, y: 5, width: 16, height: 120 }, rotation: 0 }]);
  });

  it("places the artwork once, repeated or filling, turned along the strap, inside each section", () => {
    const wide = 4; // a 4:1 wordmark
    const once = strapArtPlacements(spec({ mode: "once" }), wide);
    expect(once).toHaveLength(2);
    expect(once[0].rotation).toBe(90);
    expect(once[1].rotation).toBe(270);
    // Turned along a 16 mm strap, a 4:1 wordmark is 16 mm across and 64 mm along: it fills each 65 mm half.
    expect(once[0].rect.width).toBeCloseTo(16, 6);
    expect(once[0].rect.height).toBeCloseTo(64, 6);
    const repeat = strapArtPlacements(spec({ mode: "repeat" }), 1);
    expect(repeat.length).toBeGreaterThan(4);
    for (const p of repeat) {
      expect(p.rect.y).toBeGreaterThanOrEqual(-1e-9);
      expect(p.rect.y + p.rect.height).toBeLessThanOrEqual(130 + 1e-9);
    }
    const fill = strapArtPlacements(spec({ mode: "fill", fold: false }), 1);
    expect(fill).toEqual([{ rect: { x: 0, y: 0, width: 16, height: 130 }, rotation: 90, cover: true }]);
    expect(strapArtPlacements(spec({ along: false, mode: "once", fold: false }), 1)[0].rotation).toBe(0);
  });

  it("fills an A4 with 16 × 130 mm straps and makes a sharp 600 DPI strap image", () => {
    const page = makePage({ sheet: "a4", margins: { top: 5, right: 5, bottom: 5, left: 5 }, spacing: 3 });
    const d = makeDesign({ ...strapDesign(spec()), id: "s" });
    expect(d.strap?.fold).toBe(true);
    const plan = planFill(d, page, [d], { rotate: true });
    expect(plan.slots.length).toBeGreaterThanOrEqual(20);
    const px = strapImageSize({ width: 16, length: 130 }, 600);
    expect(px).toEqual({ width: 378, height: 3071 });
  });

  it("keeps strap settings through save and reopen, and opens old designs without them", () => {
    expect(migrateDesign({ ...makeDesign(), strap: undefined } as never).strap).toBeNull();
    const s = migrateDesign(makeDesign({ strap: { fold: true, endZone: 4, mode: "fill", along: false, sourceAssetId: "a" } })).strap!;
    expect(s).toEqual({ fold: true, endZone: 4, mode: "fill", along: false, sourceAssetId: "a" });
    expect(migrateDesign({ ...makeDesign(), strap: { mode: "weird", endZone: -3 } } as never).strap).toEqual({
      fold: false,
      endZone: 0,
      mode: "once",
      along: true,
      sourceAssetId: null,
    });
  });
});

describe("3D builders added in v0.10", () => {
  it("builds clocks, signs, panels, clipboards, pendants, boards, pillows, cuffs and straps at real size", () => {
    const cases: [string, string][] = [
      ["wall-clock-8.125", "flat"],
      ["yard-sign-7.75x10", "flat"],
      ["wood-print-8x10", "flat"],
      ["clipboard", "flat"],
      ["pendant-round-1", "flat"],
      ["cutting-board-8x11", "flat"],
      ["pillow-cover-15.74", "pillow"],
      ["cuff-1.375", "bracelet"],
    ];
    for (const [id, family] of cases) {
      const p = findProduct(id)!;
      const m = buildProductModel(p, { color: "#ffffff", process: "sublimation", textures });
      expect(m.family, id).toBe(family);
      expect(m.printMeshes.length, id).toBeGreaterThan(0);
      const s = size(m.group);
      // A cuff is curved (its extent is the diameter; the next test checks its length).
      if (family !== "bracelet") expect(Math.max(s.x, s.y, s.z), id).toBeGreaterThan(Math.max(p.width, p.height) * 0.6);
      disposeModel(m.group);
    }
    const strap = buildProductModel(strapPreset(20, 140), { color: "#ffffff", process: "sublimation", textures });
    expect(strap.family).toBe("strap");
    expect(size(strap.printMeshes[0]).x).toBeCloseTo(20, 1);
  });

  it("wraps a cuff's print round about four fifths of a circle of the right length", () => {
    const p = findProduct("cuff-1.375")!;
    const m = buildProductModel(p, { color: "#ffffff", process: "sublimation", textures });
    const band = m.printMeshes[0].geometry as THREE.CylinderGeometry;
    expect(band.parameters.thetaLength).toBeCloseTo(1.6 * Math.PI, 9);
    expect(band.parameters.radiusTop * band.parameters.thetaLength).toBeCloseTo(p.width, 6);
    expect(band.parameters.height).toBeCloseTo(p.height, 6);
  });

  it("extrudes a die-cut sticker from its own outline and maps the print to the box", () => {
    const p = findProduct("sticker-die-3")!;
    const triangle = [0.5, -0.05, 1.05, 1, -0.05, 1];
    const m = buildProductModel(p, { color: "#ffffff", process: "sticker", textures, cutOutline: triangle });
    const face = m.printMeshes[0];
    const s = size(face);
    expect(s.x).toBeCloseTo(p.width * 1.1, 0);
    const uv = face.geometry.getAttribute("uv");
    let minU = Infinity;
    for (let i = 0; i < uv.count; i++) minU = Math.min(minU, uv.getX(i));
    // The border reaches past the box, so the print coordinates do too.
    expect(minU).toBeCloseTo(-0.05, 3);
    const kiss = buildProductModel(p, { color: "#ffffff", process: "sticker", textures, cutOutline: triangle, kissCut: true });
    expect(kiss.group.children.length).toBeGreaterThan(m.group.children.length);
  });
});

describe("live preview", () => {
  it("shows straps as straps and stickers in their own die-cut shape", () => {
    const strap = makeDesign({ width: 16, height: 130, strap: { fold: true, endZone: 0, mode: "once", along: true, sourceAssetId: null } });
    expect(previewProductFor(strap, "sublimation").kind).toBe("strap");
    const sticker = makeDesign({ width: 60, height: 40, cut: { shape: "ellipse", radius: 0, offset: 2, through: "die", safeInset: 0, contour: null } });
    const pick = previewProductFor(sticker, "sticker");
    expect(pick.kind).toBe("sticker");
    expect([pick.product.width, pick.product.height]).toEqual([60, 40]);
    const outline = previewOutline(sticker, pick.kind)!;
    // An ellipse 2 mm outside the 60 × 40 box: box-relative bounds just past 0–1.
    const xs = outline.filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeCloseTo(-2 / 60, 3);
    expect(boxOutline(sticker)).toEqual(outline);
    expect(previewProductFor(makeDesign(), "dtf").kind).toBe("tee");
    expect(previewProductFor(makeDesign({ productId: "mug-11oz" }), "sublimation").kind).toBe("product");
  });
});
