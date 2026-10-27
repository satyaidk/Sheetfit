import { beforeEach, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { allPages, emptyDocument, useEditor } from "@/store/editor-store";
import { findFreeSpot } from "@/lib/layout/free-spot";
import { pageFor, planProductPlacement } from "@/lib/layout/product-placement";
import { findProduct, slotSize } from "@/lib/catalogue/products";
import { smallestSheetOrRollFor } from "@/lib/catalogue/sheets";
import { colorsFor, luminance, resolveColor, shade } from "@/lib/catalogue/colors";
import { PALETTES, renderSampleSvg, rng, sampleDesign, sampleSet } from "@/lib/catalogue/sample-designs";
import { migratePages } from "@/lib/storage/migrate";
import { buildRenderPlan } from "@/lib/render/render-plan";
import { buildPdf } from "@/lib/export/export-pdf";
import { pageClasses, pageCss } from "@/lib/export/print";
import { designBounds, pageSize, printableRect, rectsOverlap, sheetLabel } from "@/lib/layout/sheet-layout";
import type { LoadedAsset } from "@/types/image";
import { makeAsset, makeDesign, makeDoc, makePage, TINY_PNG } from "./fixtures";

const s = () => useEditor.getState();

function asset(id: string): LoadedAsset {
  return { ...makeAsset({ id }), blob: new Blob([]), objectUrl: "blob:" + id, element: {} as HTMLImageElement };
}

beforeEach(() => {
  s().newProject();
});

describe("free spot", () => {
  const area = { x: 0, y: 0, width: 100, height: 100 };

  it("uses the top-left corner of an empty area", () => {
    expect(findFreeSpot({ width: 30, height: 30 }, [], area, 5)).toEqual({ x: 0, y: 0 });
  });

  it("goes right of an existing box, then below it, keeping the gap", () => {
    const first = { x: 0, y: 0, width: 40, height: 40 };
    expect(findFreeSpot({ width: 40, height: 40 }, [first], area, 5)).toEqual({ x: 45, y: 0 });
    const second = { x: 45, y: 0, width: 40, height: 40 };
    expect(findFreeSpot({ width: 40, height: 40 }, [first, second], area, 5)).toEqual({ x: 0, y: 45 });
  });

  it("returns null when nothing fits", () => {
    expect(findFreeSpot({ width: 120, height: 10 }, [], area, 0)).toBeNull();
    expect(findFreeSpot({ width: 60, height: 60 }, [{ x: 20, y: 20, width: 60, height: 60 }], area, 5)).toBeNull();
  });
});

describe("product placement", () => {
  const a4 = makePage({ sheet: "a4", process: "sublimation", mirrorOutput: true, margins: { top: 5, right: 5, bottom: 5, left: 5 } });

  it("lets an empty page adopt the sheet a product needs", () => {
    const plan = planProductPlacement(findProduct("tumbler-30oz")!, a4, []);
    expect(plan).toMatchObject({ target: "current", reason: "page-adjusted" });
    expect(plan.page.sheet).toBe("a3");
    expect(plan.sheet?.id).toBe("a3");
  });

  it("keeps an empty page that already fits", () => {
    const plan = planProductPlacement(findProduct("coaster-square")!, a4, []);
    expect(plan).toMatchObject({ target: "current", reason: "fits" });
    expect(plan.page).toBe(a4);
    // Top-left of the printable area, leaving the rest of the sheet free.
    expect(plan).toMatchObject({ x: 5, y: 5, rotation: 0 });
  });

  it("sends an oversize product to a new page and leaves the page alone", () => {
    const busy = [makeDesign({ x: 10, y: 10 })];
    const plan = planProductPlacement(findProduct("tee-full-front")!, a4, busy);
    expect(plan).toMatchObject({ target: "new-page", reason: "too-big" });
    expect(plan.page.sheet).toBe("a3");
  });

  it("tightens the gap to 2 mm before giving up on the page", () => {
    const landscape = { ...a4, orientation: "landscape" as const };
    const mug = planProductPlacement(findProduct("mug-11oz")!, landscape, []);
    const mugDesign = makeDesign({ x: mug.x, y: mug.y, ...slotSize(findProduct("mug-11oz")!) });
    const coaster = planProductPlacement(findProduct("coaster-square")!, landscape, [mugDesign]);
    expect(coaster.target).toBe("current");
    expect(coaster.y).toBeCloseTo(mug.y + mugDesign.height + 2);
  });

  it("opens a new page with the same sheet when this one is full", () => {
    const full = [makeDesign({ x: 5, y: 5, width: 200, height: 287 })];
    const plan = planProductPlacement(findProduct("coaster-square")!, a4, full);
    expect(plan).toMatchObject({ target: "new-page", reason: "sheet-full" });
    expect(plan.page.sheet).toBe("a4");
  });

  it("turns the product 90° when only that fits in the free space", () => {
    // A tall gap on the right: 60 mm wide, 287 mm high.
    const left = [makeDesign({ x: 5, y: 5, width: 135, height: 287 })];
    const plan = planProductPlacement(findProduct("bookmark")!, { ...a4, orientation: "portrait" }, left);
    expect(plan.target).toBe("current");
    const box = designBounds({ ...makeDesign(), x: plan.x, y: plan.y, rotation: plan.rotation, ...slotSize(findProduct("bookmark")!) });
    expect(rectsOverlap(box, designBounds(left[0]))).toBe(false);
    const glass = planProductPlacement(findProduct("glass-can-16oz")!, a4, left);
    // A 249.8 × 106.7 mm wrap fits neither way in the 60 mm gap, so it gets a new page.
    expect(glass.target).toBe("new-page");
  });

  it("switches an empty page to the product's process", () => {
    const plan = planProductPlacement(findProduct("cap-front")!, a4, []);
    expect(plan.page).toMatchObject({ process: "dtf", mirrorOutput: false });
  });

  it("picks a roll, then a custom sheet, for very large boxes", () => {
    expect(smallestSheetOrRollFor({ width: 500, height: 500 })?.id).toBe("dtf-22x24");
    const huge = pageFor({ width: 800, height: 3500 }, a4);
    expect(huge.page.sheet).toBe("custom");
    const size = pageSize(huge.page);
    expect(printableRect(huge.page).width).toBeGreaterThanOrEqual(800 - 1e-6);
    expect(size.height).toBeGreaterThanOrEqual(3500);
  });
});

describe("pages in the store", () => {
  it("keeps each page's designs, sheet and undo history separate", () => {
    s().addAsset(asset("a"));
    s().placeAsset("a", { width: 50, height: 50 });
    s().addPage({ ...s().doc.page, sheet: "a3" });
    expect(s().activePage).toBe(1);
    expect(s().doc.designs).toHaveLength(0);
    expect(s().past).toHaveLength(0);
    s().placeAsset("a", { width: 20, height: 20 });
    s().switchPage(0);
    expect(s().doc.page.sheet).toBe("a4");
    expect(s().doc.designs[0].width).toBe(50);
    s().undo(); // page 1's own history
    expect(s().doc.designs).toHaveLength(0);
    s().switchPage(1);
    expect(s().doc.designs[0].width).toBe(20);
    expect(allPages(s()).map((d) => d.page.sheet)).toEqual(["a4", "a3"]);
  });

  it("duplicates a page with new ids and deletes pages", () => {
    s().addAsset(asset("a"));
    const id = s().placeAsset("a", { width: 30, height: 30 })!;
    s().duplicatePage(0);
    expect(s().pages).toHaveLength(2);
    expect(s().activePage).toBe(1);
    expect(s().doc.designs[0].id).not.toBe(id);
    s().deletePage(1);
    expect(s().pages).toHaveLength(1);
    expect(s().doc.designs[0].id).toBe(id);
    s().deletePage(0); // the last page cannot be deleted
    expect(s().pages).toHaveLength(1);
  });

  it("moves designs to another page, inside its printable area", () => {
    s().addAsset(asset("a"));
    const id = s().placeAsset("a", { width: 30, height: 30 })!;
    s().addPage({ ...s().doc.page, sheet: "a4" });
    s().switchPage(0);
    s().moveDesignsToPage([id], 1);
    expect(s().doc.designs).toHaveLength(0);
    const [, second] = allPages(s());
    expect(second.designs.map((d) => d.id)).toEqual([id]);
    s().undo();
    expect(s().doc.designs).toHaveLength(1);
  });

  it("loads several pages and keeps assets used on any page", () => {
    const p1 = makeDoc([makeDesign({ id: "x", assetId: "a" })]);
    const p2 = makeDoc([makeDesign({ id: "y", assetId: "b" })], { sheet: "a3" });
    s().loadState({ doc: p1, pages: [p1, p2], assets: { a: asset("a"), b: asset("b"), c: asset("c") }, project: { id: "p", name: "Two", savedAt: 1, dirty: false, createdAt: 0 } });
    expect(s().pages).toHaveLength(2);
    expect(s().doc).toBe(p1);
    s().removeUnusedAssets();
    expect(Object.keys(s().assets).sort()).toEqual(["a", "b"]);
  });

  it("opens the product preview for a design", () => {
    s().openMockup("d1");
    expect(s()).toMatchObject({ dialog: "mockup", mockupDesignId: "d1" });
  });
});

describe("migration of pages", () => {
  it("reads old single-page records and v0.3 multi-page records", () => {
    const doc = makeDoc([makeDesign()]);
    expect(migratePages({ document: doc })).toHaveLength(1);
    const two = migratePages({ document: doc, pages: [doc, { ...doc, page: { ...doc.page, sheet: "a3" } }] });
    expect(two.map((d) => d.page.sheet)).toEqual(["a4", "a3"]);
    expect(two[0].designs[0].productColor).toBeNull();
  });
});

describe("multi-page output", () => {
  it("writes one PDF page per project page, each at its own size", async () => {
    const a = makeAsset({ naturalWidth: 1, naturalHeight: 1 });
    const plans = [
      buildRenderPlan(makeDoc([makeDesign()]), { a1: a }),
      buildRenderPlan(makeDoc([makeDesign()], { sheet: "a3", orientation: "landscape" }), { a1: a }),
    ];
    const pdf = await PDFDocument.load(await buildPdf(plans, new Map([["a1", { bytes: TINY_PNG, format: "png" as const }]]), { title: "Two" }));
    expect(pdf.getPageCount()).toBe(2);
    const mm = (pt: number) => (pt / 72) * 25.4;
    expect(mm(pdf.getPage(0).getWidth())).toBeCloseTo(210, 3);
    expect(mm(pdf.getPage(1).getWidth())).toBeCloseTo(420, 3);
    expect(mm(pdf.getPage(1).getHeight())).toBeCloseTo(297, 3);
  });

  it("prints mixed sizes with one named @page per size", () => {
    const sizes = [
      { width: 210, height: 297 },
      { width: 297, height: 420 },
      { width: 210, height: 297 },
    ];
    const css = pageCss(sizes);
    expect(css).toContain("@page sheet1 { size: 210mm 297mm; margin: 0; }");
    expect(css).toContain("@page sheet2 { size: 297mm 420mm; margin: 0; }");
    expect(css).not.toContain("sheet3");
    expect(pageClasses(sizes)).toEqual(["sheet1", "sheet2", "sheet1"]);
  });

  it("labels sheets", () => {
    expect(sheetLabel({ sheet: "a3plus" })).toBe("A3+ (13 × 19 in)");
    expect(sheetLabel({ sheet: "custom" })).toBe("Custom");
  });
});

describe("sample designs", () => {
  it("is deterministic for a seed", () => {
    expect(sampleDesign(42)).toEqual(sampleDesign(42));
    const r1 = rng(7);
    const r2 = rng(7);
    expect([r1(), r1()]).toEqual([r2(), r2()]);
  });

  it("draws every family at any aspect ratio", () => {
    for (let seed = 0; seed < 60; seed++) {
      const d = sampleDesign(seed);
      for (const aspect of [1, 2.6, 0.25]) {
        const svg = renderSampleSvg(d, aspect);
        expect(svg.startsWith("<svg")).toBe(true);
        const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/)!.map(Number);
        expect(w / h).toBeCloseTo(aspect, 1);
        expect(svg).not.toContain("NaN");
        expect(svg).not.toContain("undefined");
      }
    }
  });

  it("gives emblems a transparent background and patterns a full one", () => {
    const emblem = sampleSet(3, 4, "emblem");
    expect(emblem.every((d) => !d.fullBleed)).toBe(true);
    const pattern = sampleSet(3, 4, "pattern");
    expect(pattern.every((d) => d.fullBleed)).toBe(true);
    expect(renderSampleSvg(pattern[0], 1)).toContain(`fill="${pattern[0].palette.bg}"`);
    expect(new Set(sampleSet(9, 6).map((d) => `${d.family}${d.palette.name}`)).size).toBe(6);
    expect(PALETTES.length).toBeGreaterThan(5);
  });
});

describe("product colours", () => {
  it("offers garment colours for apparel and falls back to the first colour", () => {
    const tee = findProduct("tee-full-front")!;
    expect(colorsFor(tee).some((c) => c.dark)).toBe(true);
    expect(resolveColor(tee, null).id).toBe("white");
    expect(resolveColor(tee, "#1C1D20").id).toBe("black");
    expect(resolveColor(findProduct("coaster-square")!, "#1c1d20").id).toBe("white");
  });

  it("shades and measures colours", () => {
    expect(shade("#ffffff", 1)).toBe("#000000");
    expect(shade("#000000", -1)).toBe("#ffffff");
    expect(shade("#808080", 0)).toBe("#808080");
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("#000")).toBeCloseTo(0);
  });

  it("starts designs without a blank colour", () => {
    s().addProductSlot("tee-full-front");
    expect(s().doc.designs[0].productColor).toBeNull();
    void emptyDocument;
  });
});
