/**
 * v0.9 Auto Arrange (MaxRects) and two-sided cards.
 *
 * Packing is checked with geometry, not snapshots: for every pair of placed
 * designs the cut paths are at least the spacing apart and the printed boxes
 * never overlap; everything stays inside the printable area; sizes never
 * change. Random jobs use a fixed seed, so failures are reproducible.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { allPages, emptyDocument, makeDesign, useEditor } from "@/store/editor-store";
import type { Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { clearanceRect, contentBounds, cutBounds, planArrange, DEFAULT_ARRANGE } from "@/lib/layout/arrange";
import { nest, nestPages, MaxRectsBin } from "@/lib/layout/nesting";
import { effectivePairGap, measuredPairGap, pairMembers } from "@/lib/layout/card-pair";
import { printableRect, rectsOverlap } from "@/lib/layout/sheet-layout";
import { migratePages } from "@/lib/storage/migrate";
import { buildRenderPlan } from "@/lib/render/render-plan";
import { makePage } from "./fixtures";
import type { Rect } from "@/lib/image/image-fit";

const s = () => useEditor.getState();

function asset(id: string, w: number, h: number): LoadedAsset {
  return {
    id,
    name: `${id}.png`,
    mimeType: "image/png",
    naturalWidth: w,
    naturalHeight: h,
    sizeBytes: 1,
    hasAlpha: true,
    createdAt: 0,
    blob: new Blob([]),
    objectUrl: "blob:test",
    element: {} as HTMLImageElement,
  };
}

/** Deterministic PRNG (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gapBetween(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), 0);
  const dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height), 0);
  return Math.max(dx, dy);
}

const inside = (outer: Rect, r: Rect) =>
  r.x >= outer.x - 1e-6 && r.y >= outer.y - 1e-6 && r.x + r.width <= outer.x + outer.width + 1e-6 && r.y + r.height <= outer.y + outer.height + 1e-6;

function checkLayout(designs: Design[], page = makePage({ margins: { top: 10, right: 10, bottom: 10, left: 10 } }), skip = new Set<string>()) {
  const area = printableRect(page);
  const placed = designs.filter((d) => !skip.has(d.id));
  for (const d of placed) expect(inside(area, contentBounds(d)), `${d.id} inside`).toBe(true);
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.pairId && a.pairId === b.pairId) continue;
      expect(gapBetween(cutBounds(a), cutBounds(b)), `${a.id}/${b.id} cut gap`).toBeGreaterThanOrEqual(page.spacing - 1e-6);
      expect(rectsOverlap(contentBounds(a), contentBounds(b)), `${a.id}/${b.id} overlap`).toBe(false);
    }
}

function randomJob(seed: number, n: number): Design[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) =>
    makeDesign({
      id: `r${i}`,
      assetId: "a",
      width: Math.round((15 + r() * 70) * 10) / 10,
      height: Math.round((15 + r() * 70) * 10) / 10,
      bleed: r() < 0.3 ? 2 : 0,
      x: r() * 100,
      y: r() * 200,
    }),
  );
}

describe("MaxRects nesting", () => {
  it("packs into free space around an obstacle and never overlaps it", () => {
    const area = { x: 0, y: 0, width: 100, height: 100 };
    const items = Array.from({ length: 6 }, (_, i) => ({ id: `i${i}`, orientations: [{ width: 30, height: 30, inset: { left: 0, top: 0, right: 0, bottom: 0 } }] }));
    const obstacle = { x: 35, y: 35, width: 30, height: 30 };
    const r = nest(items, area, [obstacle]);
    expect(r.placements).toHaveLength(6);
    for (const p of r.placements) expect(rectsOverlap({ x: p.x, y: p.y, width: 30, height: 30 }, obstacle)).toBe(false);
  });

  it("prunes contained free rectangles and reports items that do not fit", () => {
    const bin = new MaxRectsBin({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 10, height: 10 });
    bin.occupy({ x: 0, y: 0, width: 5, height: 5 });
    expect(bin.free).toHaveLength(2);
    const big = { id: "big", orientations: [{ width: 20, height: 5, inset: { left: 0, top: 0, right: 0, bottom: 0 } }] };
    expect(nestPages([big], { x: 0, y: 0, width: 10, height: 10 }, [], { extraPages: true }).tooLarge).toEqual(["big"]);
  });
});

describe("planArrange", () => {
  const page = makePage({ margins: { top: 10, right: 10, bottom: 10, left: 10 }, spacing: 4 });

  for (const seed of [1, 7, 42, 2026]) {
    it(`packs a random mixed job without overlap, inside margins, sizes unchanged (seed ${seed})`, () => {
      const job = randomJob(seed, 14);
      const plan = planArrange(job, page, [], { ...DEFAULT_ARRANGE, extraPages: true, rotate: true });
      const all = [...plan.current, ...plan.newPages.flat()];
      expect(all).toHaveLength(job.length);
      for (const d of all) {
        const o = job.find((x) => x.id === d.id)!;
        expect([d.width, d.height, d.bleed, d.crop, d.fitMode]).toEqual([o.width, o.height, o.bleed, o.crop, o.fitMode]);
        expect(((d.rotation - o.rotation) % 90 + 90) % 90).toBeCloseTo(0, 9);
      }
      checkLayout(plan.current, page, new Set(plan.report.unplaced));
      for (const p of plan.newPages) checkLayout(p, page);
      expect(plan.report.unplaced).toEqual([]);
    });
  }

  it("is deterministic", () => {
    const job = randomJob(3, 12);
    const a = planArrange(job, page, [], DEFAULT_ARRANGE);
    const b = planArrange(job, page, [], DEFAULT_ARRANGE);
    expect(a.current).toEqual(b.current);
  });

  it("turns designs only when allowed and never rotation-locked ones", () => {
    // Two tall strips that fit side by side only when turned on a short, wide area.
    const wide = makePage({ sheet: "custom", customSize: { width: 120, height: 400 }, orientation: "landscape", margins: { top: 0, right: 0, bottom: 0, left: 0 }, spacing: 0 });
    const strips = [makeDesign({ id: "a", width: 20, height: 110 }), makeDesign({ id: "b", width: 20, height: 110, lockRotation: true })];
    const off = planArrange(strips, wide, [], { ...DEFAULT_ARRANGE, rotate: false });
    expect(off.current.every((d) => d.rotation === 0)).toBe(true);
    const on = planArrange([makeDesign({ id: "c", width: 130, height: 20 })], makePage({ sheet: "custom", customSize: { width: 100, height: 200 }, margins: { top: 0, right: 0, bottom: 0, left: 0 } }), [], { ...DEFAULT_ARRANGE, rotate: true });
    expect(on.current[0].rotation).toBe(90);
    expect(on.report.turned).toBe(1);
    const locked = planArrange([makeDesign({ id: "c", width: 130, height: 20, lockRotation: true })], makePage({ sheet: "custom", customSize: { width: 100, height: 200 }, margins: { top: 0, right: 0, bottom: 0, left: 0 } }), [], { ...DEFAULT_ARRANGE, rotate: true });
    expect(locked.report.tooLarge).toEqual(["c"]);
  });

  it("keeps locked designs fixed and packs around them", () => {
    const lockedD = makeDesign({ id: "L", x: 60, y: 60, width: 80, height: 80, locked: true });
    const job = [lockedD, ...randomJob(9, 10)];
    const plan = planArrange(job, page, [], DEFAULT_ARRANGE);
    expect(plan.current.find((d) => d.id === "L")).toEqual(lockedD);
    checkLayout(plan.current, page, new Set(plan.report.unplaced));
  });

  it("arranges only the selection, treating the rest as occupied", () => {
    const job = randomJob(5, 8);
    const sel = ["r0", "r1", "r2"];
    const plan = planArrange(job, page, sel, { ...DEFAULT_ARRANGE, scope: "selection" });
    for (const d of plan.current) if (!sel.includes(d.id)) expect(d).toEqual(job.find((x) => x.id === d.id));
    const moved = plan.current.filter((d) => sel.includes(d.id));
    const others = plan.current.filter((d) => !sel.includes(d.id));
    for (const m of moved) for (const o of others) expect(gapBetween(clearanceRect(m, 0), clearanceRect(o, 0)) >= 0).toBe(true);
    for (const m of moved) for (const o of others) expect(rectsOverlap(clearanceRect(m, page.spacing), clearanceRect(o, page.spacing))).toBe(false);
  });

  it("keeps card pairs together as one rigid block", () => {
    const pair = [
      makeDesign({ id: "F", pairId: "p", side: "front", productId: "card-cr80", width: 89.6, height: 57.98, bleed: 2, x: 0, y: 0 }),
      makeDesign({ id: "B", pairId: "p", side: "back", productId: "card-cr80", width: 89.6, height: 57.98, bleed: 2, x: 94.6, y: 0 }),
    ];
    const plan = planArrange([...randomJob(11, 6), ...pair], page, [], { ...DEFAULT_ARRANGE, rotate: true });
    const [f, b] = ["F", "B"].map((id) => plan.current.find((d) => d.id === id)!);
    expect(b.x - f.x).toBeCloseTo(94.6, 9);
    expect(b.y - f.y).toBeCloseTo(0, 9);
    expect(f.rotation).toBe(0);
    checkLayout(plan.current, page, new Set(plan.report.unplaced));
  });

  it("measures spacing between cut paths, and widens it only where bleeds would touch", () => {
    const a = makeDesign({ id: "a", width: 54, height: 54, bleed: 2 });
    // Spacing 5 > 2 × bleed: cut paths exactly 5 apart.
    expect(clearanceRect(a, 5).width).toBeCloseTo(50 + 5, 9);
    // Spacing 1 < 2 × bleed: the bleed decides (2 per side), so bleeds never print onto a neighbour.
    expect(clearanceRect(a, 1).width).toBeCloseTo(54, 9);
    for (const gap of [0, 0.5, 3, 12]) {
      const p = makePage({ spacing: gap, margins: { top: 10, right: 10, bottom: 10, left: 10 } });
      const plan = planArrange([makeDesign({ id: "x", width: 40, height: 30 }), makeDesign({ id: "y", width: 40, height: 30 })], p, [], DEFAULT_ARRANGE);
      const [x, y] = plan.current;
      expect(gapBetween(cutBounds(x), cutBounds(y))).toBeCloseTo(gap, 9);
      expect([x.width, y.width]).toEqual([40, 40]);
    }
  });

  it("reports designs larger than the printable area instead of shrinking them", () => {
    const huge = makeDesign({ id: "huge", width: 500, height: 40 });
    const plan = planArrange([huge, ...randomJob(2, 3)], page, [], { ...DEFAULT_ARRANGE, extraPages: true });
    expect(plan.report.tooLarge).toEqual(["huge"]);
    expect(plan.current.find((d) => d.id === "huge")).toEqual(huge);
  });

  it("keeps registration squares clear", () => {
    const p = makePage({ margins: { top: 10, right: 10, bottom: 10, left: 10 }, spacing: 2, guides: { cutlines: false, centreMarks: false, registration: true, registrationSize: 8 } });
    const plan = planArrange(randomJob(21, 6), p, [], DEFAULT_ARRANGE);
    for (const d of plan.current) expect(contentBounds(d).x < 18 + 1e-6 && contentBounds(d).y < 18 + 1e-6).toBe(false);
  });
});

describe("Auto Arrange in the editor", () => {
  beforeEach(() => {
    s().newProject();
    useEditor.setState({ doc: emptyDocument(), assets: { a: asset("a", 1000, 800) }, selection: [], past: [], future: [], clipboard: [], lastLayoutReport: null });
  });

  it("is one undo step, restores every position, and redo reapplies it", () => {
    const job = randomJob(17, 12);
    s().commit({ ...s().doc, designs: job });
    const before = s().doc.designs;
    const pastLen = s().past.length;
    s().autoArrange("all");
    expect(s().past.length).toBe(pastLen + 1);
    const after = s().doc.designs;
    s().undo();
    expect(s().doc.designs).toEqual(before);
    s().redo();
    expect(s().doc.designs).toEqual(after);
  });

  it("creates pages for the rest and removes them again on undo", () => {
    const many = Array.from({ length: 30 }, (_, i) => makeDesign({ id: `m${i}`, assetId: "a", width: 60, height: 60 }));
    s().commit({ ...s().doc, designs: many });
    const r = s().autoArrange("all", { extraPages: true });
    expect(r.pagesAdded).toBeGreaterThan(0);
    expect(s().pages.length).toBe(1 + r.pagesAdded!);
    const total = allPages(s()).reduce((n, p) => n + p.designs.length, 0);
    expect(total).toBe(30);
    for (const p of allPages(s())) checkLayout(p.designs, p.page);
    s().undo();
    expect(s().pages.length).toBe(1);
    expect(s().doc.designs.map((d) => d.id)).toEqual(many.map((d) => d.id));
    s().redo();
    expect(s().pages.length).toBe(1 + r.pagesAdded!);
  });

  it("survives save and reopen", () => {
    s().commit({ ...s().doc, designs: randomJob(8, 9) });
    s().autoArrange("all");
    const saved = JSON.parse(JSON.stringify({ document: allPages(s())[0], pages: allPages(s()) }));
    const [reopened] = migratePages(saved);
    expect(reopened.designs).toEqual(s().doc.designs);
    expect(reopened.page.spacing).toBe(5);
  });

  it("makes copies of a sticker to a quantity in one undo step", () => {
    s().commit({ ...s().doc, designs: [makeDesign({ id: "st", assetId: "a", width: 40, height: 40 })] });
    const pastLen = s().past.length;
    const r = s().setQuantity("st", 12);
    expect(s().doc.designs).toHaveLength(12);
    expect(r.unplaced).toBe(0);
    expect(s().past.length).toBe(pastLen + 1);
    checkLayout(s().doc.designs, s().doc.page);
    s().undo();
    expect(s().doc.designs).toHaveLength(1);
  });
});

describe("two-sided cards", () => {
  beforeEach(() => {
    s().newProject();
    useEditor.setState({ doc: emptyDocument(), assets: { f: asset("f", 1011, 638), b: asset("b", 1011, 638), c: asset("c", 800, 800) }, selection: [], past: [], future: [] });
  });

  const card = () => {
    const r = s().addProductSlot("card-cr80");
    return s().doc.designs.find((d) => d.id === r.designId)!;
  };

  it("starts as a one-sided front and never invents a back", () => {
    const front = card();
    expect(front.side).toBe("front");
    expect(front.pairId).toBeNull();
    s().fillSlot(front.id, "f");
    expect(s().doc.designs).toHaveLength(1);
    expect(buildRenderPlan(s().doc, s().assets).items).toHaveLength(1);
  });

  it("adds a back of the same physical size beside the front, at the pair gap between cut paths", () => {
    const front = card();
    s().fillSlot(front.id, "f");
    const backId = s().addCardBack(front.id)!;
    s().fillSlot(backId, "b");
    const [f, b] = pairMembers(s().doc.designs, s().doc.designs[0].pairId);
    expect([f.side, b.side]).toEqual(["front", "back"]);
    expect([b.width, b.height, b.bleed]).toEqual([f.width, f.height, f.bleed]);
    expect(measuredPairGap(f, b)).toBeCloseTo(s().doc.page.pairGap, 9);
    expect(cutBounds(b).y).toBeCloseTo(cutBounds(f).y, 9);
    // The cut paths keep the CR80 trim size and its 3.18 mm corners.
    expect(cutBounds(f).width).toBeCloseTo(85.6, 6);
    const plan = buildRenderPlan(s().doc, s().assets);
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0].box).toEqual(plan.items[1].box);
    // A second back is not added.
    expect(s().addCardBack(f.id)).toBeNull();
    // The pair stays on the sheet (the front started top centre; both shifted left, same size).
    const area = printableRect(s().doc.page);
    for (const d of [f, b]) expect(inside(area, contentBounds(d))).toBe(true);
  });

  it("widens the pair gap only when bleeds would otherwise overlap", () => {
    const front = card();
    const backId = s().addCardBack(front.id)!;
    s().setPage({ pairGap: 1 });
    const [f, b] = pairMembers(s().doc.designs, s().doc.designs[0].pairId);
    expect(b.id).toBe(backId);
    expect(effectivePairGap(f, b, 1)).toBeCloseTo(4, 9); // 2 mm bleed each side
    expect(measuredPairGap(f, b)).toBeCloseTo(4, 9);
    s().setPage({ pairGap: 12 });
    const [f2, b2] = pairMembers(s().doc.designs, s().doc.designs[0].pairId);
    expect(measuredPairGap(f2, b2)).toBeCloseTo(12, 9);
    expect(f2.width).toBe(89.6);
  });

  it("replaces one side without touching the other, and swaps sides", () => {
    const front = card();
    s().fillSlot(front.id, "f");
    const backId = s().addCardBack(front.id)!;
    s().fillSlot(backId, "b");
    s().replaceAsset(front.id, asset("c", 800, 800));
    const back = s().doc.designs.find((d) => d.id === backId)!;
    expect(back.assetId).toBe("b");
    s().swapSides(front.id);
    expect(s().doc.designs.find((d) => d.id === front.id)!.side).toBe("back");
    expect(s().doc.designs.find((d) => d.id === backId)!.side).toBe("front");
  });

  it("selects, moves, duplicates and deletes the pair as a unit, but lets one side be edited alone", () => {
    const front = card();
    const backId = s().addCardBack(front.id)!;
    s().select([front.id]);
    expect(s().selection.sort()).toEqual([front.id, backId].sort());
    s().select([backId], "replace", { exact: true });
    expect(s().selection).toEqual([backId]);
    s().select([front.id]);
    s().duplicateSelection();
    const pairs = new Set(s().doc.designs.map((d) => d.pairId));
    expect(pairs.size).toBe(2);
    expect(s().doc.designs).toHaveLength(4);
    // Deleting one side leaves a one-sided card, not a half pair.
    s().select([backId], "replace", { exact: true });
    s().deleteSelection();
    const lone = s().doc.designs.find((d) => d.id === front.id)!;
    expect(lone.pairId).toBeNull();
    s().undo();
    expect(s().doc.designs.find((d) => d.id === front.id)!.pairId).not.toBeNull();
  });

  it("pastes copies into a new group, not into the original's group (regression)", () => {
    s().commit({ ...s().doc, designs: [makeDesign({ id: "g1", width: 20, height: 20, groupId: "G" }), makeDesign({ id: "g2", width: 20, height: 20, x: 30, groupId: "G" })] });
    s().select(["g1"]);
    s().copySelection();
    s().paste();
    const copies = s().doc.designs.filter((d) => !["g1", "g2"].includes(d.id));
    expect(copies).toHaveLength(2);
    expect(copies[0].groupId).not.toBe("G");
    expect(copies[0].groupId).toBe(copies[1].groupId);
    s().select(["g1"]);
    expect(s().selection.sort()).toEqual(["g1", "g2"]);
  });

  it("pairs two same-size designs on request, refuses different sizes, and unlinks", () => {
    s().commit({
      ...s().doc,
      designs: [makeDesign({ id: "x", width: 50, height: 30 }), makeDesign({ id: "y", width: 50, height: 30, x: 100 }), makeDesign({ id: "z", width: 40, height: 30 })],
    });
    useEditor.setState({ selection: ["x", "z"] });
    expect(s().pairSelection()).toBe(false);
    useEditor.setState({ selection: ["x", "y"] });
    expect(s().pairSelection()).toBe(true);
    const [x, y] = pairMembers(s().doc.designs, s().doc.designs[0].pairId);
    expect(measuredPairGap(x, y)).toBeCloseTo(5, 9);
    s().unlinkPair("x");
    expect(s().doc.designs.every((d) => d.pairId === null)).toBe(true);
  });

  it("keeps sides, pairing and artwork through save and reopen", () => {
    const front = card();
    s().fillSlot(front.id, "f");
    const backId = s().addCardBack(front.id)!;
    s().fillSlot(backId, "b");
    const before = s().doc.designs;
    const [doc] = migratePages(JSON.parse(JSON.stringify({ document: s().doc })));
    expect(doc.designs).toEqual(before);
    // Projects from before pairs open as one-sided designs.
    const legacy = migratePages({ document: { page: {}, designs: [{ id: "old", assetId: "f", x: 0, y: 0, width: 85.6, height: 54 }] } });
    expect(legacy[0].designs[0]).toMatchObject({ side: null, pairId: null, cut: null, view: null });
  });
});
