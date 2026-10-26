import { describe, expect, it } from "vitest";
import { resolveDrag } from "@/lib/layout/drag";
import { makeDesign, makePage } from "./fixtures";

const pxPerMm = 3.78;

describe("resolveDrag", () => {
  it("snaps the design centre to the page centre", () => {
    const d = makeDesign({ x: 59, y: 30 }); // centre x = 104, page centre = 105
    const r = resolveDrag(d, { page: makePage(), others: [], pxPerMm });
    expect(r.x).toBeCloseTo(60);
    expect(r.guides).toContainEqual({ orientation: "vertical", position: 105 });
  });

  it("snaps to other designs' edges", () => {
    const other = makeDesign({ x: 100, y: 150 });
    const d = makeDesign({ x: 40, y: 151 }); // top 151 → other top 150
    const r = resolveDrag(d, { page: makePage(), others: [other], pxPerMm });
    expect(r.y).toBeCloseTo(150);
  });

  it("snaps to the grid when grid snapping is on", () => {
    const r = resolveDrag(makeDesign({ x: 31.2, y: 47.6 }), {
      page: makePage({ snapToGrid: true, gridSize: 5 }),
      others: [],
      pxPerMm,
    });
    expect(r.x).toBeCloseTo(30);
    expect(r.y).toBeCloseTo(50);
  });

  it("keeps the design inside the printable area when constrained", () => {
    const r = resolveDrag(makeDesign({ x: 180, y: -20 }), {
      page: makePage({ constrainToPrintable: true, snapToGuides: false }),
      others: [],
      pxPerMm,
    });
    expect(r.x).toBeCloseTo(110);
    expect(r.y).toBeCloseTo(10);
  });

  it("can bypass snapping", () => {
    const d = makeDesign({ x: 59, y: 30 });
    const r = resolveDrag(d, { page: makePage(), others: [], pxPerMm, bypassSnap: true });
    expect(r.x).toBe(59);
    expect(r.guides).toEqual([]);
  });
});
