import { describe, expect, it } from "vitest";
import {
  centerIn,
  clampIntoRect,
  designBounds,
  pageRect,
  pageSize,
  placementStatus,
  printableRect,
} from "@/lib/layout/sheet-layout";
import { alignDesign, alignGroup, snapRect, snapToGrid, unionBounds } from "@/lib/layout/alignment";
import {
  applyPlacements,
  arrangeGrid,
  gridCapacity,
  packItemsFor,
  packShelves,
  suggestLayoutFixes,
} from "@/lib/layout/auto-arrange";
import { rectsOverlap } from "@/lib/layout/sheet-layout";
import { makeDesign, makePage } from "./fixtures";

describe("A4 page", () => {
  it("is 210 × 297 mm portrait and 297 × 210 mm landscape", () => {
    expect(pageSize(makePage())).toEqual({ width: 210, height: 297 });
    expect(pageSize(makePage({ orientation: "landscape" }))).toEqual({ width: 297, height: 210 });
  });

  it("subtracts margins for the printable area", () => {
    expect(printableRect(makePage({ margins: { top: 5, right: 10, bottom: 15, left: 20 } }))).toEqual({
      x: 20,
      y: 5,
      width: 180,
      height: 277,
    });
  });
});

describe("centering", () => {
  it("case 2: a portrait design centres on an A4 portrait sheet", () => {
    const d = centerIn(makeDesign({ width: 100, height: 150 }), pageRect(makePage()));
    expect(d.x).toBeCloseTo(55);
    expect(d.y).toBeCloseTo(73.5);
  });

  it("case 3: a landscape design centres on an A4 portrait sheet", () => {
    const d = centerIn(makeDesign({ width: 180, height: 120 }), pageRect(makePage()));
    expect(d.x).toBeCloseTo(15);
    expect(d.y).toBeCloseTo(88.5);
  });

  it("uses (page - design) / 2 on both axes", () => {
    const d = centerIn(makeDesign({ width: 90, height: 60 }), pageRect(makePage({ orientation: "landscape" })));
    expect(d.x).toBeCloseTo((297 - 90) / 2);
    expect(d.y).toBeCloseTo((210 - 60) / 2);
  });
});

describe("bounds and placement", () => {
  it("computes the rotated bounding box around the centre", () => {
    const b = designBounds(makeDesign({ x: 10, y: 10, width: 100, height: 50, rotation: 90 }));
    expect(b.x).toBeCloseTo(35);
    expect(b.y).toBeCloseTo(-15);
    expect(b.width).toBeCloseTo(50);
    expect(b.height).toBeCloseTo(100);
  });

  it("case 8: flags a design that exceeds the printable area", () => {
    const page = makePage();
    const status = placementStatus(makeDesign({ x: 5, y: 20, width: 90, height: 60 }), page);
    expect(status.exceedsPrintable).toBe(true);
    expect(status.exceedsPage).toBe(false);
    const huge = placementStatus(makeDesign({ x: 0, y: 0, width: 200, height: 60 }), page);
    expect(huge.largerThanPrintable).toBe(true);
  });

  it("accepts a design touching the printable edge exactly", () => {
    const status = placementStatus(makeDesign({ x: 10, y: 10, width: 190, height: 277 }), makePage());
    expect(status.exceedsPrintable).toBe(false);
  });

  it("clamps without resizing", () => {
    const area = printableRect(makePage());
    const d = clampIntoRect(makeDesign({ x: 190, y: -40 }), area);
    expect(d.x).toBeCloseTo(110);
    expect(d.y).toBeCloseTo(10);
    expect(d.width).toBe(90);
  });
});

describe("alignment", () => {
  const area = { x: 10, y: 10, width: 190, height: 277 };
  it("aligns edges and centres", () => {
    expect(alignDesign(makeDesign({ x: 50 }), "left", area).x).toBe(10);
    expect(alignDesign(makeDesign({ x: 50 }), "right", area).x).toBe(110);
    expect(alignDesign(makeDesign({ y: 50 }), "bottom", area).y).toBe(227);
    expect(alignDesign(makeDesign(), "center-x", area).x).toBe(60);
  });

  it("moves a group as one block", () => {
    const moved = alignGroup(
      [makeDesign({ id: "a", x: 20, y: 20 }), makeDesign({ id: "b", x: 120, y: 20 })],
      "left",
      area,
    );
    expect(moved.map((d) => d.x)).toEqual([10, 110]);
  });

  it("snaps to the nearest guide within threshold", () => {
    const res = snapRect({ x: 59, y: 0, width: 90, height: 60 }, [105], [], 2);
    expect(res.dx).toBeCloseTo(1); // centre 104 → 105
    expect(res.guides).toEqual([{ orientation: "vertical", position: 105 }]);
    expect(snapRect({ x: 50, y: 0, width: 10, height: 10 }, [105], [], 2).dx).toBe(0);
  });

  it("snaps values to a grid", () => {
    expect(snapToGrid(12.4, 5)).toBe(10);
    expect(snapToGrid(12.6, 5)).toBe(15);
    expect(snapToGrid(12.6, 0)).toBe(12.6);
  });

  it("returns null bounds for no rects", () => {
    expect(unionBounds([])).toBeNull();
  });
});

describe("auto-arrange", () => {
  const area = printableRect(makePage());

  it("case 7: multiple copies of one image fill a grid without overlap", () => {
    const capacity = gridCapacity({ width: 50, height: 50 }, area, { x: 5, y: 5 });
    expect(capacity).toEqual({ cols: 3, rows: 5, count: 15 });
    const ids = Array.from({ length: 15 }, (_, i) => `c${i}`);
    const result = arrangeGrid(ids, { width: 50, height: 50 }, area, { x: 5, y: 5 });
    expect(result.unplaced).toEqual([]);
    const rects = result.placements.map((p) => ({ x: p.x, y: p.y, width: 50, height: 50 }));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      expect(rects[i].x).toBeGreaterThanOrEqual(area.x);
      expect(rects[i].x + 50).toBeLessThanOrEqual(area.x + area.width + 1e-9);
    }
  });

  it("reports copies that do not fit instead of shrinking them", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const result = arrangeGrid(ids, { width: 50, height: 50 }, area, { x: 5, y: 5 });
    expect(result.placements).toHaveLength(15);
    expect(result.unplaced).toHaveLength(5);
  });

  it("packs mixed sizes on shelves, tallest first, inside the area", () => {
    const designs = [
      makeDesign({ id: "a", width: 90, height: 60 }),
      makeDesign({ id: "b", width: 100, height: 150 }),
      makeDesign({ id: "c", width: 50, height: 50 }),
      makeDesign({ id: "d", width: 85.6, height: 54 }),
    ];
    const result = packShelves(packItemsFor(designs), area, { x: 4, y: 4 });
    expect(result.unplaced).toEqual([]);
    const placed = applyPlacements(designs, result.placements);
    for (let i = 0; i < placed.length; i++) {
      expect(placementStatus(placed[i], makePage()).exceedsPrintable).toBe(false);
      for (let j = i + 1; j < placed.length; j++) {
        expect(rectsOverlap(designBounds(placed[i]), designBounds(placed[j]))).toBe(false);
      }
    }
  });

  it("keeps rotated designs' boxes centred in their placement slot", () => {
    const d = makeDesign({ id: "r", width: 100, height: 50, rotation: 90 });
    const [placed] = applyPlacements([d], [{ id: "r", x: 10, y: 10 }]);
    const b = designBounds(placed);
    expect(b.x).toBeCloseTo(10);
    expect(b.y).toBeCloseTo(10);
  });

  it("refuses items larger than the area", () => {
    const result = packShelves([{ id: "big", width: 300, height: 10 }], area, { x: 0, y: 0 });
    expect(result.unplaced).toEqual(["big"]);
  });

  it("suggests checked fixes when designs do not fit", () => {
    const designs = Array.from({ length: 6 }, (_, i) => makeDesign({ id: `w${i}`, width: 130, height: 60 }));
    const tips = suggestLayoutFixes(designs, makePage(), { x: 5, y: 5 });
    expect(tips[0]).toMatch(/Reduce the number of designs to 4/);
    expect(tips.some((t) => t.includes("landscape"))).toBe(true);
    expect(suggestLayoutFixes(designs.slice(0, 2), makePage(), { x: 5, y: 5 })).toEqual([]);
  });
});
