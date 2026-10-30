import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { PRODUCTS, findProduct } from "@/lib/catalogue/products";
import { buildProductModel, disposeModel, printCrop, printStyle, roundCorners, weaveRepeat } from "@/lib/three/product-model";
import { backdropFor, colorsFor, contrastRatio, luminance } from "@/lib/catalogue/colors";
import { OUTLINES, parsePath } from "@/lib/catalogue/outlines";
import { isDriverNote, threeConsole } from "@/lib/three/driver-notes";
import { surfaceArea } from "@/lib/three/tshirt-model";

const textures = { print: new THREE.Texture(), overlay: new THREE.Texture(), weave: new THREE.Texture(), cork: new THREE.Texture() };

function size(root: THREE.Object3D) {
  return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
}

describe("3D models", () => {
  it("builds every product with its print, at a believable real size", () => {
    for (const p of PRODUCTS) {
      const model = buildProductModel(p, { color: "#ffffff", process: p.processes[0], textures });
      const s = size(model.group);
      expect(model.printMeshes.length, p.id).toBeGreaterThan(0);
      // Nothing degenerate, nothing absurdly big (largest product is a flag on a pole).
      expect(Math.max(s.x, s.y, s.z), p.id).toBeGreaterThan(20);
      expect(Math.max(s.x, s.y, s.z), p.id).toBeLessThan(1200);
      let vertices = 0;
      model.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const pos = m.geometry.getAttribute("position");
          vertices += pos.count;
          for (let i = 0; i < pos.count; i += 37) expect(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i)), p.id).toBe(true);
        }
      });
      expect(vertices, p.id).toBeGreaterThan(50);
      disposeModel(model.group);
    }
    // Building all 52 models (13 cloth surfaces) takes several seconds in Node.
  }, 30_000);

  it("sizes drinkware from the wrap: an 11 oz mug is about 82 mm across and 96 mm tall", () => {
    const model = buildProductModel(findProduct("mug-11oz")!, { color: "#ffffff", process: "sublimation", textures });
    expect(model.family).toBe("drinkware");
    const band = new THREE.Box3().setFromObject(model.printMeshes[0]).getSize(new THREE.Vector3());
    expect(band.y).toBeCloseTo(88.9, 0);
    const body = size(model.group.children[0]);
    expect(body.y).toBeGreaterThan(94);
    expect(body.y).toBeLessThan(98);
    expect(body.z).toBeGreaterThan(75);
    expect(body.z).toBeLessThan(85);
  });

  it("gives a mug a flat inside floor, not a cone from the floor centre to the rim", () => {
    const model = buildProductModel(findProduct("mug-11oz")!, { color: "#ffffff", process: "sublimation", textures });
    const pos = (model.group.children[0] as THREE.Mesh).geometry.getAttribute("position");
    // Inside the foot ring (within 25 mm of the axis) the body is only the base and the floor:
    // everything sits at the recess under the base (1.6 mm) or the floor (7 mm), nothing in between.
    let floorReach = 0;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      const y = pos.getY(i);
      if (Math.abs(y - 7) < 0.01) floorReach = Math.max(floorReach, r);
      if (r > 25) continue;
      expect(Math.abs(y - 1.6) < 0.01 || Math.abs(y - 7) < 0.01, `vertex at y=${y.toFixed(2)}`).toBe(true);
    }
    // The flat floor runs out to its fillet near the 3.6 mm wall (radius about 39.5 mm).
    expect(floorReach).toBeGreaterThan(26);
    disposeModel(model.group);
  });

  it("rounds profile corners with tangent circular fillets", () => {
    const pts = roundCorners([[0, 0], [10, 0, 3], [10, 10]], 8);
    expect(pts[0].toArray()).toEqual([0, 0]);
    expect(pts[pts.length - 1].toArray()).toEqual([10, 10]);
    // The arc starts and ends 3 mm from the corner and keeps 3 mm from its centre (7, 3).
    const arc = pts.slice(1, -1);
    expect(arc[0].x).toBeCloseTo(7);
    expect(arc[arc.length - 1].y).toBeCloseTo(3);
    for (const v of arc) expect(Math.hypot(v.x - 7, v.y - 3)).toBeCloseTo(3);
    // A fillet never takes more than half of an edge.
    const tight = roundCorners([[0, 0], [4, 0, 50], [4, 4]]);
    expect(tight[1].x).toBeCloseTo(2);
  });

  it("faces the print centre in the Front view: opposite the handle on mugs", () => {
    const mug = buildProductModel(findProduct("mug-11oz")!, { color: "#ffffff", process: "sublimation", textures });
    expect(mug.frontAzimuth).toBeCloseTo(-Math.PI / 2);
    // The opening view is turned from the print centre so the mug reads as a mug, but keeps the print in view.
    expect(Math.abs(mug.viewAzimuth - mug.frontAzimuth!)).toBeLessThan(Math.PI / 4);
    const tumbler = buildProductModel(findProduct("tumbler-20oz")!, { color: "#ffffff", process: "sublimation", textures });
    expect(tumbler.frontAzimuth).toBe(0);
  });

  it("prints back placements on the back of the shirt, front placements on the front", () => {
    const centreZ = (id: string) => {
      const m = buildProductModel(findProduct(id)!, { color: "#ffffff", process: "dtf", textures });
      return { z: new THREE.Box3().setFromObject(m.printMeshes[0]).getCenter(new THREE.Vector3()).z, front: m.frontAzimuth };
    };
    expect(centreZ("tee-full-front").z).toBeGreaterThan(0);
    const back = centreZ("tee-full-back");
    expect(back.z).toBeLessThan(0);
    expect(back.front).toBeCloseTo(Math.PI);
    expect(centreZ("tee-back-neck").z).toBeLessThan(0);
  });

  it("puts a left-chest print at its true size on the shirt", () => {
    const p = findProduct("tee-left-chest")!;
    const model = buildProductModel(p, { color: "#1c1d20", process: "dtf", textures });
    expect(model.family).toBe("garment");
    // The print lies on the curved chest, so measure it on the cloth: its area is the transfer's (within 3 %).
    const area = surfaceArea(model.printMeshes[0].geometry);
    expect(area / (p.width * p.height)).toBeGreaterThan(0.97);
    expect(area / (p.width * p.height)).toBeLessThan(1.03);
    // On the wearer's left chest (+x; the shirt faces +z), above the middle of the body.
    const c = new THREE.Box3().setFromObject(model.printMeshes[0]).getCenter(new THREE.Vector3());
    expect(c.x).toBeGreaterThan(60);
    expect(c.z).toBeGreaterThan(0);
    // An adult tee is roughly half a metre across the chest, wider at the sleeves.
    expect(size(model.group).x).toBeGreaterThan(500);
  });

  it("uses multiply for sublimation overlays and an opaque film for DTF", () => {
    const tee = findProduct("tee-full-front")!;
    const sub = buildProductModel(tee, { color: "#ffffff", process: "sublimation", textures });
    const dtf = buildProductModel(tee, { color: "#ffffff", process: "dtf", textures });
    expect((sub.printMeshes[0].material as THREE.Material).blending).toBe(THREE.MultiplyBlending);
    expect((dtf.printMeshes[0].material as THREE.Material).blending).toBe(THREE.NormalBlending);
  });

  it("shows the blank without a design: no overlay mesh on garments, plain face on flat goods", () => {
    const tee = buildProductModel(findProduct("tee-full-front")!, { color: "#ffffff", process: "dtf" });
    expect(tee.printMeshes).toHaveLength(0);
    const coaster = buildProductModel(findProduct("coaster-round")!, { color: "#f7f1e6", process: "sublimation" });
    expect(coaster.printMeshes).toHaveLength(1);
    const face = coaster.printMeshes[0].material as THREE.MeshPhysicalMaterial;
    expect(face.map).toBeNull();
    expect(`#${face.color.getHexString()}`).toBe("#f7f1e6");
  });

  it("projects the cap print onto the crown", () => {
    const model = buildProductModel(findProduct("cap-front")!, { color: "#c4302b", process: "dtf", textures });
    expect(model.family).toBe("cap");
    expect(model.printMeshes[0].geometry.getAttribute("position").count).toBeGreaterThan(30);
  });
});

describe("print mapping", () => {
  it("crops the seam overlap off wraps and the bleed off flat goods", () => {
    const mug = findProduct("mug-11oz")!;
    const c = printCrop(mug);
    expect(c.w * (mug.width + 6)).toBeCloseTo(mug.width);
    expect(c.x).toBeCloseTo(3 / (mug.width + 6));
    const coaster = findProduct("coaster-square")!;
    const f = printCrop(coaster);
    expect(f.x).toBeCloseTo(3 / (coaster.width + 6));
    expect(printCrop(findProduct("tee-full-front")!)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("knows how each product takes its print", () => {
    expect(printStyle(findProduct("tumbler-20oz")!)).toBe("wrap");
    expect(printStyle(findProduct("tote")!)).toBe("overlay");
    expect(printStyle(findProduct("plate-us")!)).toBe("face");
    expect(weaveRepeat(findProduct("tee-full-front")!)).toBeCloseTo(1 / 6);
  });

  it("parses the garment outlines into closed shapes", () => {
    for (const d of [OUTLINES.tee, OUTLINES.hoodie, OUTLINES.onesie, OUTLINES.longsleeve, OUTLINES.kidsTee]) {
      const { points, closed } = parsePath(d);
      expect(closed).toBe(true);
      expect(points.length).toBeGreaterThan(20);
      for (const pt of points) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(100);
      }
    }
    const open = parsePath(OUTLINES.teeCollar);
    expect(open.closed).toBe(false);
    expect(open.points[0]).toEqual({ x: 34, y: 14 });
    expect(open.points.at(-1)!.x).toBeCloseTo(66);
  });
});

describe("3D backdrop", () => {
  it("always contrasts with the blank colour", () => {
    const hexes = new Set(PRODUCTS.flatMap((p) => colorsFor(p).map((c) => c.hex)));
    for (const hex of hexes) {
      const b = backdropFor(hex);
      // The backdrop's centre (behind the product) differs clearly from the blank.
      expect(contrastRatio(hex, b.inner), hex).toBeGreaterThan(1.25);
      expect(Math.abs(luminance(b.inner) - luminance(hex)), hex).toBeGreaterThan(0.1);
    }
  });

  it("puts white blanks on a mid-tone and black blanks on a light sweep", () => {
    expect(luminance(backdropFor("#ffffff").inner)).toBeLessThan(0.75);
    expect(luminance(backdropFor("#1c1d20").inner)).toBeGreaterThan(0.85);
  });
});

describe("driver notes", () => {
  // Logged by Chrome on Windows (ANGLE on Direct3D) for three.js shadow shaders that link fine.
  const d3dLog = [
    "(210,86-138): warning X4122: sum of 0.996094 and -2.98545e-017 cannot be represented accurately in double precision",
    "(209,39-65): warning X4122: sum of 1 and -1.49272e-017 cannot be represented accurately in double precision",
    "(210,87-113): warning X4122: sum of 1 and -1.49272e-017 cannot be represented accurately in double precision",
  ].join("\n");
  const programLog = "THREE.WebGLProgram: Program Info Log:";

  it("recognises Direct3D compiler warnings after a successful link", () => {
    expect(isDriverNote(programLog, [d3dLog])).toBe(true);
  });

  it("keeps everything else", () => {
    expect(isDriverNote(programLog, [d3dLog + "\nERROR: 0:12: 'vUv' : undeclared identifier"])).toBe(false);
    expect(isDriverNote(programLog, ["warning: varying vNormal is unused"])).toBe(false);
    expect(isDriverNote(programLog, [""])).toBe(false);
    expect(isDriverNote("THREE.WebGLRenderer: Texture marked for update but no image data found.", [d3dLog])).toBe(false);
  });

  it("forwards other messages to the console and drops only the notes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    threeConsole("warn", programLog, d3dLog);
    expect(warn).not.toHaveBeenCalled();
    threeConsole("warn", "THREE.Material: parameter is undefined.");
    expect(warn).toHaveBeenCalledWith("THREE.Material: parameter is undefined.");
    threeConsole("error", programLog, d3dLog);
    expect(error).toHaveBeenCalledWith(programLog, d3dLog);
    warn.mockRestore();
    error.mockRestore();
  });
});
