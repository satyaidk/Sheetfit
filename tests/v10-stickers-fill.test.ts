/**
 * v0.10: sticker cutting (cut methods, the printed hand-cutting line, white
 * sticker borders, automatic outlines from transparency or a plain
 * background) and Fill sheet (step and repeat for any product).
 *
 * Outputs are checked where they are produced: the render plan, the calls
 * `drawPlan` makes (PNG, JPEG, print, previews), the operators in the PDF
 * content stream and the SVG text.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { inflateSync } from "node:zlib";
import { buildRenderPlan, cropPlan, printedBounds } from "@/lib/render/render-plan";
import { buildPdf } from "@/lib/export/export-pdf";
import { drawPlan } from "@/lib/export/rasterize";
import { buildSvg } from "@/lib/export/export-svg";
import { migratePage } from "@/lib/storage/migrate";
import {
  CRICUT_PRINT_AREA,
  DEFAULT_CUT_GUIDE,
  cricutArea,
  cutGuideOf,
  cutMethodOf,
  printsCutGuide,
  stickerBorderFill,
  stickerOutlineDefaults,
} from "@/lib/cut/cut-method";
import { dilate, erode, traceContour } from "@/lib/cut/contour";
import { detectPlainBackground, floodBackground, knockOut, opaqueBounds, rimColor } from "@/lib/image/background";
import { planFill, fillCapacity, twinsOf } from "@/lib/layout/fill";
import { clearanceRect, contentBounds } from "@/lib/layout/arrange";
import { printableRect } from "@/lib/layout/sheet-layout";
import { DEFAULT_PAGE, allPages, makeDesign as storeDesign, useEditor } from "@/store/editor-store";
import { makeAsset, makeDesign, makeDoc, makePage, TINY_PNG } from "./fixtures";
import type { Design, PageSettings } from "@/types/editor";

/* ------------------------------------------------------------------------ */
/* Cut methods and page defaults                                            */
/* ------------------------------------------------------------------------ */

describe("cut methods and migration", () => {
  it("opens pages saved before v0.10 exactly as before: no printed line, no painted border", () => {
    const old = migratePage({ sheet: "a4", process: "sticker" } as Partial<PageSettings>);
    expect(old.cutMethod).toBe("file");
    expect(old.borderFill).toBeNull();
    expect(printsCutGuide(old)).toBe(false);
    expect(stickerBorderFill(old)).toBeNull();
  });

  it("starts new pages for hand cutting with a thin black line inside the cut and a white border", () => {
    expect(DEFAULT_PAGE.cutMethod).toBe("hand");
    expect(DEFAULT_PAGE.borderFill).toBe("#ffffff");
    expect(DEFAULT_PAGE.cutGuide).toEqual({ color: "#000000", width: 0.25, placement: "inside" });
    // The line and border only apply to sticker pages (never to transfer paper).
    expect(printsCutGuide({ ...DEFAULT_PAGE, process: "sublimation" })).toBe(false);
    expect(printsCutGuide({ ...DEFAULT_PAGE, process: "sticker" })).toBe(true);
    expect(stickerBorderFill({ ...DEFAULT_PAGE, process: "dtf" })).toBeNull();
  });

  it("sanitises untrusted values", () => {
    expect(cutMethodOf("laser")).toBe("file");
    expect(cutMethodOf("cricut")).toBe("cricut");
    expect(cutGuideOf({ color: "red", width: 99, placement: "middle" as never })).toEqual({ color: "#000000", width: 2, placement: "inside" });
    expect(cutGuideOf({ width: Number.NaN })).toEqual(DEFAULT_CUT_GUIDE);
    const page = migratePage({ borderFill: "url(x)", cutMethod: "silhouette" } as unknown as Partial<PageSettings>);
    expect(page.borderFill).toBeNull();
    expect(page.cutMethod).toBe("silhouette");
  });

  it("gives hand cutting a rounder, one-piece outline and machines finer detail", () => {
    const hand = stickerOutlineDefaults("hand");
    const cricut = stickerOutlineDefaults("cricut");
    expect(hand.offsetMm).toBe(3);
    expect(hand.closeMm).toBeGreaterThan(cricut.closeMm);
    expect(hand.mergeIslands).toBe(true);
    expect(hand.holes).toBe(false);
    expect(stickerOutlineDefaults("hand", 1.5).offsetMm).toBe(1.5);
  });

  it("centres the Cricut Print Then Cut area (7.2 × 10.62 in on A4, 7.44 × 9.94 in on Letter)", () => {
    const a4 = cricutArea({ sheet: "a4", customSize: null, orientation: "portrait" })!;
    expect(a4.width).toBeCloseTo(7.2 * 25.4, 6);
    expect(a4.height).toBeCloseTo(10.62 * 25.4, 6);
    expect(a4.x).toBeCloseTo((210 - a4.width) / 2, 6);
    const land = cricutArea({ sheet: "letter", customSize: null, orientation: "landscape" })!;
    expect(land.width).toBeCloseTo(CRICUT_PRINT_AREA.letter.height, 6);
    expect(cricutArea({ sheet: "a3", customSize: null, orientation: "portrait" })).toBeNull();
  });
});

/* ------------------------------------------------------------------------ */
/* The printed line and the white border in every output                    */
/* ------------------------------------------------------------------------ */

const stickerPage = (over: Partial<PageSettings> = {}) =>
  makePage({ process: "sticker", cutMethod: "hand", borderFill: "#ffffff", cutGuide: { color: "#000000", width: 0.25, placement: "inside" }, ...over });

const circleSticker = () =>
  makeDesign({ id: "s1", x: 50, y: 50, width: 60, height: 60, cut: { shape: "ellipse", radius: 0, offset: 3, through: "die", safeInset: 0, contour: null } });

describe("render plan: sticker border and cutting line", () => {
  it("adds the line and border on hand-cut sticker pages only", () => {
    const plan = buildRenderPlan(makeDoc([circleSticker()], stickerPage()), { a1: makeAsset() });
    const item = plan.items[0];
    expect(item.underlay?.color).toBe("#ffffff");
    expect(item.guide).toMatchObject({ color: "#000000", width: 0.25, inside: true });
    // Same paths as the cut itself.
    expect(item.guide!.paths).toEqual(item.cut.paths);
    const dtf = buildRenderPlan(makeDoc([circleSticker()], makePage({ process: "dtf" })), { a1: makeAsset() });
    expect(dtf.items[0].underlay).toBeNull();
    expect(dtf.items[0].guide).toBeNull();
  });

  it("keeps the border but drops the line from artwork-only files (cutter software)", () => {
    const plan = buildRenderPlan(makeDoc([circleSticker()], stickerPage()), { a1: makeAsset() }, { output: "artwork" });
    expect(plan.items[0].underlay).not.toBeNull();
    expect(plan.items[0].guide).toBeNull();
  });

  it("prints no line for machine cutting", () => {
    for (const cutMethod of ["cricut", "silhouette", "file"] as const) {
      const plan = buildRenderPlan(makeDoc([circleSticker()], stickerPage({ cutMethod })), { a1: makeAsset() });
      expect(plan.items[0].guide).toBeNull();
      expect(plan.items[0].underlay).not.toBeNull();
    }
  });
});

function recordCalls(plan: ReturnType<typeof buildRenderPlan>) {
  const calls: string[] = [];
  let lineWidth = 0;
  const ctx = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    setTransform() {},
    scale() {},
    translate() {},
    rotate() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    setLineDash() {},
    fill: (rule?: string) => calls.push(`fill:${rule}`),
    clip: (rule?: string) => calls.push(`clip:${rule}`),
    stroke: () => calls.push(`stroke:${lineWidth}`),
    drawImage: () => calls.push("image"),
    set lineWidth(v: number) {
      lineWidth = v;
    },
    get lineWidth() {
      return lineWidth;
    },
    fillStyle: "",
    strokeStyle: "",
    lineJoin: "",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  };
  drawPlan(ctx as unknown as CanvasRenderingContext2D, plan, () => ({}) as CanvasImageSource, { scale: 1 });
  return calls;
}

describe("raster output (PNG, JPEG, print, previews)", () => {
  it("fills the border under the image, then clips and strokes the line inside at twice its width", () => {
    const calls = recordCalls(buildRenderPlan(makeDoc([circleSticker()], stickerPage()), { a1: makeAsset() }));
    const fill = calls.indexOf("fill:evenodd");
    const image = calls.indexOf("image");
    const clip = calls.indexOf("clip:evenodd");
    const stroke = calls.indexOf("stroke:0.5");
    expect(fill).toBeGreaterThanOrEqual(0);
    expect(fill).toBeLessThan(image);
    expect(clip).toBeGreaterThan(image);
    expect(stroke).toBeGreaterThan(clip);
  });

  it("centres the line on the cut without clipping when asked", () => {
    const calls = recordCalls(
      buildRenderPlan(makeDoc([circleSticker()], stickerPage({ cutGuide: { color: "#000000", width: 0.4, placement: "centre" } })), { a1: makeAsset() }),
    );
    expect(calls).not.toContain("clip:evenodd");
    expect(calls).toContain("stroke:0.4");
  });
});

function pdfText(bytes: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(bytes);
  const out: string[] = [];
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    const end = text.indexOf("endstream", start);
    try {
      out.push(new TextDecoder("latin1").decode(inflateSync(bytes.subarray(start, end))));
    } catch {
      /* not a content stream */
    }
  }
  return out.join("\n");
}

describe("PDF output", () => {
  it("draws the border as an even-odd fill and the line as a clipped vector stroke", async () => {
    const plan = buildRenderPlan(makeDoc([circleSticker()], stickerPage()), { a1: makeAsset() });
    const bytes = await buildPdf(plan, new Map([["a1", { bytes: TINY_PNG, format: "png" as const }]]), { title: "t" });
    const ops = pdfText(bytes);
    expect(ops).toMatch(/\bf\*/);
    expect(ops).toMatch(/\bW\*\s+n\b/);
    expect(ops).toMatch(/\b0\.5 w\b/);
    expect(ops).toMatch(/\b1 j\b/);
    // The border fill comes before the image is drawn; the line after it.
    expect(ops.search(/\bf\*/)).toBeLessThan(ops.search(/\bDo\b/));
    expect(ops.search(/\bW\*/)).toBeGreaterThan(ops.search(/\bDo\b/));
  });

  it("has neither for a DTF page", async () => {
    const plan = buildRenderPlan(makeDoc([circleSticker()], makePage({ process: "dtf" })), { a1: makeAsset() });
    const ops = pdfText(await buildPdf(plan, new Map([["a1", { bytes: TINY_PNG, format: "png" as const }]]), { title: "t" }));
    expect(ops).not.toMatch(/\bf\*/);
    expect(ops).not.toMatch(/\bW\*/);
  });
});

describe("SVG output", () => {
  it("puts the border under the artwork and the line in its own clipped group", () => {
    const plan = buildRenderPlan(makeDoc([circleSticker()], stickerPage()), { a1: makeAsset() });
    const svg = buildSvg(plan, { images: new Map([["a1", "data:image/png;base64,AAAA"]]) });
    expect(svg).toContain('fill="#ffffff" fill-rule="evenodd"');
    expect(svg.indexOf('fill-rule="evenodd"')).toBeLessThan(svg.indexOf("<image"));
    expect(svg).toContain('<g id="CUT_GUIDE">');
    expect(svg).toContain('clip-path="url(#guide-clip-0)"');
    expect(svg).toContain('stroke-width="0.5"');
  });

  it("leaves the printed line out of a cut-only file", () => {
    const plan = buildRenderPlan(makeDoc([circleSticker()], stickerPage()), { a1: makeAsset() });
    expect(buildSvg(plan)).not.toContain("CUT_GUIDE");
  });
});

describe("cutter PNG crop", () => {
  it("crops a plan to what prints (artwork and cut paths, 1 mm around), moving every item with it", () => {
    const a = makeDesign({ id: "a", x: 20, y: 30, width: 40, height: 40 });
    const b = makeDesign({ id: "b", x: 100, y: 150, width: 30, height: 20 });
    const doc = makeDoc([a, b], stickerPage());
    const bounds = printedBounds(doc, 1)!;
    expect(bounds).toEqual({ x: 19, y: 29, width: 112, height: 142 });
    const plan = cropPlan(buildRenderPlan(doc, { a1: makeAsset() }), bounds);
    expect(plan.page).toEqual({ width: 112, height: 142 });
    expect(plan.items[0].center).toEqual({ x: 21, y: 21 });
    expect(plan.items[1].center).toEqual({ x: 96, y: 131 });
    // A contour border reaching past the box is included.
    const sticker = circleSticker();
    const withBorder = printedBounds(makeDoc([sticker], stickerPage()), 0)!;
    expect(withBorder.width).toBeCloseTo(66, 6);
    expect(printedBounds(makeDoc([makeDesign({ assetId: null })]))).toBeNull();
  });
});

/* ------------------------------------------------------------------------ */
/* Plain backgrounds and trimming                                           */
/* ------------------------------------------------------------------------ */

/** RGBA image: white background, a red disk with a white hole in the middle. */
function badge(size = 80, bg: [number, number, number] = [255, 255, 255]) {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2);
      const inDisk = d < size * 0.35;
      const inHole = d < size * 0.1;
      const c = inDisk && !inHole ? [220, 30, 30] : inHole ? [255, 255, 255] : bg;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  }
  return px;
}

describe("plain background removal", () => {
  it("finds a white background, removes only what touches the edge and keeps inner white", () => {
    const size = 80;
    const px = badge(size);
    const found = detectPlainBackground(px, size, size)!;
    expect(found).not.toBeNull();
    expect(found.color.map(Math.round)).toEqual([255, 255, 255]);
    const centre = (size / 2) * size + size / 2;
    expect(found.ink[centre]).toBe(1); // the white hole inside the disk stays
    expect(found.ink[0]).toBe(0); // the corner is background
    expect(found.removed).toBeGreaterThan(0.5);
    expect(found.removed).toBeLessThan(0.7);
  });

  it("works for flat coloured backgrounds and within JPEG-like noise", () => {
    const size = 60;
    const px = badge(size, [40, 120, 200]);
    for (let i = 0; i < px.length; i += 4) {
      const n = ((i * 7919) % 17) - 8; // deterministic ±8 noise
      px[i] = Math.max(0, Math.min(255, px[i] + n));
    }
    expect(detectPlainBackground(px, size, size)).not.toBeNull();
  });

  it("refuses busy edges (a photo) instead of guessing", () => {
    const size = 40;
    const px = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      px[i * 4] = (i * 97) % 256;
      px[i * 4 + 1] = (i * 57) % 256;
      px[i * 4 + 2] = (i * 31) % 256;
      px[i * 4 + 3] = 255;
    }
    expect(rimColor(px, size, size)!.share).toBeLessThan(0.6);
    expect(detectPlainBackground(px, size, size)).toBeNull();
  });

  it("treats transparency as background and reaches through it", () => {
    const size = 30;
    const px = badge(size);
    // Transparent ring at the very edge, as when artwork sits on a padded canvas.
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) px[(y * size + x) * 4 + 3] = 0;
    const m = floodBackground(px, size, size, [255, 255, 255]);
    expect(m.ink[(size / 2) * size + size / 2]).toBe(1);
    expect(m.ink[3 * size + 3]).toBe(0);
  });

  it("knocks the background out with a soft, unmixed edge", () => {
    const size = 40;
    const px = badge(size);
    const found = detectPlainBackground(px, size, size)!;
    const out = knockOut(px, size, size, found, found.color);
    expect(out[3]).toBe(0);
    const centre = ((size / 2) * size + size / 2) * 4;
    expect(out[centre + 3]).toBe(255);
    // Some edge pixel got a partial alpha and keeps a red hue (not pink from white mixing).
    let soft = 0;
    for (let i = 0; i < size * size; i++) if (out[i * 4 + 3] > 0 && out[i * 4 + 3] < 255) soft++;
    expect(soft).toBeGreaterThan(0);
  });

  it("finds the bounds of visible pixels for trimming", () => {
    const w = 10;
    const h = 8;
    const px = new Uint8ClampedArray(w * h * 4);
    for (const [x, y] of [[2, 3], [6, 5], [4, 1]]) px[(y * w + x) * 4 + 3] = 255;
    expect(opaqueBounds(px, w, h)).toEqual({ x: 2, y: 1, width: 5, height: 5 });
    expect(opaqueBounds(new Uint8ClampedArray(w * h * 4), w, h)).toBeNull();
  });
});

describe("outline closing for hand cutting", () => {
  /** Two squares 4 px apart. */
  const twoBlocks = () => {
    const w = 60;
    const h = 30;
    const m = new Uint8Array(w * h);
    for (let y = 10; y < 20; y++) {
      for (let x = 10; x < 25; x++) m[y * w + x] = 1;
      for (let x = 29; x < 44; x++) m[y * w + x] = 1;
    }
    return { m, w, h };
  };

  it("keeps a narrow gap without closing and bridges it with closing", () => {
    const { m, w, h } = twoBlocks();
    expect(traceContour(m, w, h, { offsetPx: 1, smoothing: 0 }).outlines).toHaveLength(2);
    expect(traceContour(m, w, h, { offsetPx: 1, closePx: 3, smoothing: 0 }).outlines).toHaveLength(1);
  });

  it("erodes exactly what dilation grew on a convex shape, and fills a gap narrower than twice the radius", () => {
    const w = 40;
    const h = 30;
    const block = new Uint8Array(w * h);
    for (let y = 10; y < 20; y++) for (let x = 10; x < 30; x++) block[y * w + x] = 1;
    const back = erode(dilate(block, w, h, 2), w, h, 2);
    expect([...back]).toEqual([...block]);
    const { m, w: w2, h: h2 } = twoBlocks();
    const closed = erode(dilate(m, w2, h2, 2), w2, h2, 2);
    expect(closed[15 * w2 + 27]).toBe(1); // inside the 4 px gap
    expect(m[15 * w2 + 27]).toBe(0);
  });
});

/* ------------------------------------------------------------------------ */
/* Fill sheet                                                               */
/* ------------------------------------------------------------------------ */

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width - 1e-6 && b.x < a.x + a.width - 1e-6 && a.y < b.y + b.height - 1e-6 && b.y < a.y + a.height - 1e-6;

function placedCopies(source: Design, slots: { x: number; y: number; rotation: number }[]): Design[] {
  return slots.map((s, i) => ({ ...source, id: `c${i}`, ...s }));
}

function assertValidLayout(designs: Design[], page: PageSettings) {
  const area = printableRect(page);
  for (const d of designs) {
    const c = contentBounds(d);
    expect(c.x).toBeGreaterThanOrEqual(area.x - 1e-6);
    expect(c.y).toBeGreaterThanOrEqual(area.y - 1e-6);
    expect(c.x + c.width).toBeLessThanOrEqual(area.x + area.width + 1e-6);
    expect(c.y + c.height).toBeLessThanOrEqual(area.y + area.height + 1e-6);
  }
  for (let i = 0; i < designs.length; i++)
    for (let j = i + 1; j < designs.length; j++)
      expect(overlaps(clearanceRect(designs[i], page.spacing), clearanceRect(designs[j], page.spacing))).toBe(false);
}

describe("fill sheet planning", () => {
  const page = makePage({ sheet: "a4", margins: { top: 5, right: 5, bottom: 5, left: 5 }, spacing: 5 });

  it("fills an A4 with a clean grid of 50 mm squares at 5 mm spacing", () => {
    const d = makeDesign({ width: 50, height: 50 });
    const plan = planFill(d, page, [d], { rotate: false });
    // Allowed width 200 + 5 = 205 → 3 columns of 55; height 287 + 5 = 292 → 5 rows.
    expect(plan.layout).toBe("grid");
    expect([plan.cols, plan.rows]).toEqual([3, 5]);
    expect(plan.slots).toHaveLength(15);
    assertValidLayout(placedCopies(d, plan.slots), page);
  });

  it("turns copies when that fits more, never for rotation-locked designs", () => {
    const d = makeDesign({ width: 120, height: 40 });
    const straight = planFill(d, page, [d], { rotate: false }).slots.length;
    const turned = planFill(d, page, [d], { rotate: true });
    expect(turned.slots.length).toBeGreaterThan(straight);
    assertValidLayout(placedCopies(d, turned.slots), page);
    expect(planFill({ ...d, lockRotation: true }, page, [d], { rotate: true }).slots.length).toBe(straight);
  });

  it("only uses the free space around other designs", () => {
    const d = makeDesign({ id: "src", width: 40, height: 40, x: 10, y: 10 });
    const big = makeDesign({ id: "big", assetId: "a2", width: 150, height: 150, x: 30, y: 60 });
    const plan = planFill(d, page, [d, big], { rotate: false });
    expect(plan.layout).toBe("packed");
    expect(plan.slots.length).toBeGreaterThan(5);
    assertValidLayout([...placedCopies(d, plan.slots), big], page);
  });

  it("replaces earlier copies so filling twice gives the same sheet", () => {
    const d = makeDesign({ id: "src", width: 50, height: 50 });
    const first = planFill(d, page, [d], { rotate: false });
    const sheet = [d, ...placedCopies(d, first.slots.slice(1))];
    expect(twinsOf(d, sheet)).toHaveLength(first.slots.length - 1);
    const again = planFill(d, page, sheet, { rotate: false });
    expect(again.slots).toHaveLength(first.slots.length);
    expect(again.replaces).toHaveLength(first.slots.length - 1);
  });

  it("counts on this page and on an empty page", () => {
    const d = makeDesign({ id: "src", width: 50, height: 50 });
    const other = makeDesign({ id: "o", assetId: "a2", width: 100, height: 100, x: 50, y: 50 });
    const cap = fillCapacity(d, page, [d, other], false);
    expect(cap.empty).toBe(15);
    expect(cap.here).toBeLessThan(15);
  });

  it("fits strips: 16 × 130 mm keychain straps on A4 at 3 mm spacing", () => {
    const strip = makeDesign({ width: 16, height: 130 });
    const p = makePage({ sheet: "a4", margins: { top: 5, right: 5, bottom: 5, left: 5 }, spacing: 3 });
    // (200 + 3) / 19 = 10 columns, (287 + 3) / 133 = 2 rows.
    const plan = planFill(strip, p, [strip], { rotate: false });
    expect(plan.slots).toHaveLength(20);
    assertValidLayout(placedCopies(strip, plan.slots), p);
  });

  it("respects a maximum", () => {
    const d = makeDesign({ width: 20, height: 20 });
    expect(planFill(d, page, [d], { rotate: false, max: 7 }).slots).toHaveLength(7);
  });

  it("finds nothing for a design larger than the printable area", () => {
    const d = makeDesign({ width: 260, height: 260 });
    expect(planFill(d, page, [d], { rotate: true }).slots).toHaveLength(0);
  });
});

describe("fill sheet in the editor", () => {
  const s = useEditor.getState;
  beforeEach(() => {
    s().newProject();
    s().addAsset({ ...makeAsset({ id: "img", naturalWidth: 600, naturalHeight: 600 }), blob: new Blob(), objectUrl: "", element: {} as HTMLImageElement });
  });

  const seed = (size: number) => {
    const d = storeDesign({ id: "src", assetId: "img", width: size, height: size, x: 20, y: 20 });
    s().commit({ ...s().doc, designs: [d] });
    return d.id;
  };

  it("fills in one undo step and refills to the same count", () => {
    const id = seed(50);
    const steps = s().past.length;
    const r = s().fillSheet(id);
    const count = s().doc.designs.length;
    expect(r.placed).toBe(count);
    expect(count).toBeGreaterThan(10);
    expect(s().past.length).toBe(steps + 1);
    s().fillSheet(id);
    expect(s().doc.designs.length).toBe(count);
    s().undo();
    s().undo();
    expect(s().doc.designs).toHaveLength(1);
  });

  it("makes an exact quantity, adding pages for the rest, undone as one step", () => {
    const id = seed(50);
    const perPage = s().fillSheet(id).placed;
    s().undo();
    const r = s().setQuantity(id, perPage * 2 + 3);
    expect(r.placed).toBe(perPage * 2 + 3);
    expect(r.pagesAdded).toBe(2);
    const pages = allPages(s());
    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.designs.length)).toEqual([perPage, perPage, 3]);
    s().undo();
    expect(allPages(s())).toHaveLength(1);
    expect(s().doc.designs).toHaveLength(1);
  });
});
