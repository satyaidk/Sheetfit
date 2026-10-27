import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { measureGaps, sheetUtilisation } from "@/lib/layout/measure";
import { distributeDesigns } from "@/lib/layout/alignment";
import { runPreflight } from "@/lib/export/preflight";
import { migrateDocument } from "@/lib/storage/migrate";
import { buildRenderPlan } from "@/lib/render/render-plan";
import { drawPlan } from "@/lib/export/rasterize";
import { buildPdf } from "@/lib/export/export-pdf";
import { designBounds } from "@/lib/layout/sheet-layout";
import { makeAsset, makeDesign, makeDoc, TINY_PNG } from "./fixtures";

describe("live gaps", () => {
  const area = { x: 10, y: 10, width: 190, height: 277 };

  it("measures to the nearest neighbour on each side and to the area edges", () => {
    const moving = { x: 60, y: 60, width: 50, height: 50 };
    const left = { x: 20, y: 70, width: 30, height: 20 };
    const farLeft = { x: 0, y: 70, width: 5, height: 20 };
    const gaps = measureGaps(moving, [left, farLeft], area);
    const l = gaps.find((g) => g.axis === "x" && g.to === 60)!;
    expect(l.value).toBeCloseTo(10);
    const r = gaps.find((g) => g.axis === "x" && g.from === 110)!;
    expect(r.value).toBeCloseTo(90); // to the printable edge at 200
    expect(gaps.filter((g) => g.axis === "y")).toHaveLength(2);
  });

  it("ignores rectangles that do not overlap on the other axis", () => {
    const gaps = measureGaps({ x: 60, y: 60, width: 10, height: 10 }, [{ x: 0, y: 200, width: 10, height: 10 }], null);
    expect(gaps).toEqual([]);
  });
});

describe("sheet utilisation", () => {
  it("counts covered area once", () => {
    const area = { x: 0, y: 0, width: 100, height: 100 };
    expect(sheetUtilisation([{ x: 0, y: 0, width: 50, height: 100 }], area)).toBeCloseTo(0.5);
    expect(
      sheetUtilisation([{ x: 0, y: 0, width: 50, height: 100 }, { x: 0, y: 0, width: 50, height: 100 }], area),
    ).toBeCloseTo(0.5);
    expect(sheetUtilisation([], area)).toBe(0);
  });
});

describe("distribute", () => {
  it("equalises gaps between the outermost designs", () => {
    const ds = [
      makeDesign({ id: "a", x: 0, width: 10 }),
      makeDesign({ id: "b", x: 15, width: 20 }),
      makeDesign({ id: "c", x: 90, width: 10 }),
    ];
    const out = distributeDesigns(ds, "x");
    expect(out.map((d) => d.x)).toEqual([0, 40, 90]);
    expect(distributeDesigns(ds.slice(0, 2), "x")).toEqual(ds.slice(0, 2));
  });
});

describe("preflight", () => {
  const assets = { a1: makeAsset() };
  it("reports off-sheet, margin, overlap, empty slots and low DPI", () => {
    const doc = makeDoc([
      makeDesign({ id: "off", name: "Off", x: -20, y: 20 }),
      makeDesign({ id: "m", name: "Margin", x: 5, y: 100 }),
      makeDesign({ id: "o1", name: "A", x: 50, y: 200, width: 40, height: 40 }),
      makeDesign({ id: "o2", name: "B", x: 60, y: 210, width: 40, height: 40 }),
      makeDesign({ id: "slot", name: "Mug", assetId: null, x: 100, y: 20, width: 50, height: 50 }),
    ]);
    const issues = runPreflight(doc, assets);
    const kinds = issues.map((i) => i.kind);
    expect(kinds[0]).toBe("outside-page");
    expect(kinds).toContain("outside-printable");
    expect(kinds).toContain("overlap");
    expect(kinds).toContain("empty-slot");
    expect(issues.find((i) => i.kind === "overlap")!.designIds).toEqual(["o1", "o2"]);
  });

  it("flags low resolution and distortion", () => {
    const doc = makeDoc([makeDesign({ x: 20, y: 20, width: 180, height: 120, fitMode: "stretch" })]);
    const issues = runPreflight(doc, { a1: makeAsset({ naturalWidth: 300, naturalHeight: 300 }) });
    expect(issues.map((i) => i.kind).sort()).toEqual(["distorted", "low-dpi"]);
  });

  it("allows grouped designs to overlap", () => {
    const doc = makeDoc([
      makeDesign({ id: "a", x: 20, y: 20, groupId: "g" }),
      makeDesign({ id: "b", x: 30, y: 30, groupId: "g" }),
    ]);
    expect(runPreflight(doc, assets).some((i) => i.kind === "overlap")).toBe(false);
  });
});

describe("migration from v0.1", () => {
  it("upgrades paper to sheet and fills new design fields", () => {
    const legacy = {
      page: { paper: "A4", orientation: "landscape" as const, margins: { top: 3, right: 3, bottom: 3, left: 3 } },
      designs: [{ id: "d", name: "Logo", assetId: "a1", x: 1, y: 2, width: 3, height: 4 }],
    };
    const doc = migrateDocument(legacy);
    expect(doc.page).toMatchObject({ sheet: "a4", orientation: "landscape", process: "sublimation", mirrorOutput: false });
    expect(doc.designs[0]).toMatchObject({ assetId: "a1", productId: null, bleed: 0, flipX: false, flipY: false, x: 1 });
  });
});

describe("mirror and flip in outputs", () => {
  type M = [number, number, number, number, number, number];
  const mul = (m: M, n: M): M => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const apply = (m: M, x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

  function record(plan: ReturnType<typeof buildRenderPlan>) {
    let m: M = [1, 0, 0, 1, 0, 0];
    const stack: M[] = [];
    const images: { x: number; y: number }[][] = [];
    const ctx = {
      save: () => stack.push(m), restore: () => (m = stack.pop()!), setTransform: (...v: number[]) => (m = v as M),
      scale: (a: number, b: number) => (m = mul(m, [a, 0, 0, b, 0, 0])), translate: (x: number, y: number) => (m = mul(m, [1, 0, 0, 1, x, y])),
      rotate: (r: number) => (m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0])),
      clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
      drawImage: (...a: number[]) => images.push([apply(m, a[5], a[6]), apply(m, a[5] + a[7], a[6] + a[8])]),
    };
    drawPlan(ctx as unknown as CanvasRenderingContext2D, plan, () => ({}) as CanvasImageSource, { scale: 1 });
    return images[0];
  }

  it("mirrors the whole sheet horizontally for sublimation", () => {
    const d = makeDesign({ x: 20, y: 30, width: 50, height: 50 });
    const plain = record(buildRenderPlan(makeDoc([d]), { a1: makeAsset() }));
    const mirrored = record(buildRenderPlan(makeDoc([d], { mirrorOutput: true }), { a1: makeAsset() }));
    const xs = (pts: { x: number }[]) => pts.map((p) => p.x).sort((a, b) => a - b);
    expect(xs(plain)).toEqual([20, 70].map((v) => expect.closeTo(v, 6)));
    expect(xs(mirrored)).toEqual([140, 190].map((v) => expect.closeTo(v, 6)));
  });

  it("flips an image within its own rectangle", () => {
    const d = makeDesign({ x: 20, y: 30, width: 50, height: 50, flipX: true });
    const [a, b] = record(buildRenderPlan(makeDoc([d]), { a1: makeAsset() }));
    expect(a.x).toBeCloseTo(70); // drawn right-to-left
    expect(b.x).toBeCloseTo(20);
  });

  it("skips empty product slots", () => {
    const plan = buildRenderPlan(makeDoc([makeDesign({ assetId: null })]), { a1: makeAsset() });
    expect(plan.items).toHaveLength(0);
  });

  it("builds a mirrored, flipped PDF on a non-A4 sheet", async () => {
    const plan = buildRenderPlan(
      makeDoc([makeDesign({ flipX: true, flipY: true })], { sheet: "a3", mirrorOutput: true }),
      { a1: makeAsset({ naturalWidth: 1, naturalHeight: 1 }) },
    );
    const pdf = await PDFDocument.load(await buildPdf(plan, new Map([["a1", { bytes: TINY_PNG, format: "png" as const }]]), { title: "A3" }));
    const { width, height } = pdf.getPage(0).getSize();
    expect(width / 72 * 25.4).toBeCloseTo(297, 3);
    expect(height / 72 * 25.4).toBeCloseTo(420, 3);
    void designBounds;
  });
});

describe("hit testing", () => {
  it("finds points inside rotated designs and picks the top-most", async () => {
    const { pointInDesign, designAt } = await import("@/lib/layout/sheet-layout");
    const d = makeDesign({ x: 0, y: 0, width: 100, height: 20, rotation: 90 });
    expect(pointInDesign(d, { x: 50, y: 10 })).toBe(true);
    expect(pointInDesign(d, { x: 50, y: -35 })).toBe(true); // rotated box extends up
    expect(pointInDesign(d, { x: 90, y: 10 })).toBe(false);
    const a = makeDesign({ id: "a", x: 0, y: 0, width: 50, height: 50 });
    const b = makeDesign({ id: "b", x: 10, y: 10, width: 50, height: 50, assetId: null });
    expect(designAt([a, b], { x: 20, y: 20 })!.id).toBe("b");
    expect(designAt([a, b], { x: 20, y: 20 }, (x) => x.assetId !== null)!.id).toBe("a");
  });
});
