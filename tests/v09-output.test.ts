/**
 * v0.9 output correctness: the explicit mirror, fill/crop geometry, cut paths,
 * marks and the vector outputs (PDF, SVG, raster/print).
 *
 * The PDF tests run a tiny content-stream interpreter over the real file
 * pdf-lib writes, and the raster tests record the real calls `drawPlan` makes
 * (the function PNG, JPEG, the export preview and browser print all use), so
 * both check where things actually land on the page in millimetres.
 */

import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { buildRenderPlan, planCutPaths } from "@/lib/render/render-plan";
import { buildPdf } from "@/lib/export/export-pdf";
import { drawPlan } from "@/lib/export/rasterize";
import { pageCss } from "@/lib/export/print";
import { buildSvg } from "@/lib/export/export-svg";
import { driverAdvice, mirrorModeFor, processMirrorDefault, resolveMirror } from "@/lib/render/mirror";
import { migrateDocument, migratePage } from "@/lib/storage/migrate";
import {
  computeImageRect,
  coverCroppedFraction,
  coverWindow,
  effectiveCrop,
  effectiveSourceRect,
  panView,
  zoomView,
} from "@/lib/image/image-fit";
import { resolutionReport } from "@/lib/image/image-resolution";
import {
  contourIsStale,
  contourKey,
  cutPaths,
  ellipsePath,
  pathsBounds,
  polygonArea,
  roundedRectPath,
  validatePath,
  validatePolygon,
} from "@/lib/cut/cut-path";
import { chaikin, dilate, simplifyClosed, traceContour, traceLoops } from "@/lib/cut/contour";
import { centreMarksFor, registrationMarks } from "@/lib/render/guides";
import { makeAsset, makeDesign, makeDoc, makePage, TINY_PNG } from "./fixtures";
import type { Design, MirrorMode, PrintProcess } from "@/types/editor";

const PT = 72 / 25.4;

/* -------------------------------------------------------------------------- */
/* Helpers: a PDF content interpreter and a recording 2D context              */
/* -------------------------------------------------------------------------- */

type M = [number, number, number, number, number, number];
const mul = (m: M, n: M): M => [
  n[0] * m[0] + n[1] * m[2], n[0] * m[1] + n[1] * m[3],
  n[2] * m[0] + n[3] * m[2], n[2] * m[1] + n[3] * m[3],
  n[4] * m[0] + n[5] * m[2] + m[4], n[4] * m[1] + n[5] * m[3] + m[5],
];
const apply = (m: M, x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

/** Decompress every content stream of the first page and run q/Q/cm/Do/m/l/c/re. */
async function pdfMarks(bytes: Uint8Array) {
  const text = new TextDecoder("latin1").decode(bytes);
  const streams: string[] = [];
  const re = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const start = match.index + match[0].length;
    const end = text.indexOf("endstream", start);
    const raw = bytes.subarray(start, end);
    try {
      streams.push(new TextDecoder("latin1").decode(inflateSync(raw)));
    } catch {
      /* image data or uncompressed */
    }
  }
  // CTM in PDF semantics: new = cm × current.
  let ctm: M = [1, 0, 0, 1, 0, 0];
  const stack: M[] = [];
  const images: { x: number; y: number }[][] = [];
  const points: { x: number; y: number }[] = [];
  const rects: { x: number; y: number }[][] = [];
  let mirrors = 0;
  const content = streams.filter((s) => /\b(cm|Do|re)\b/.test(s)).join("\n");
  const nums: number[] = [];
  for (const tok of content.split(/\s+/)) {
    if (tok === "") continue;
    const n = Number(tok);
    if (!Number.isNaN(n)) {
      nums.push(n);
      continue;
    }
    if (tok === "q") stack.push(ctm);
    else if (tok === "Q") ctm = stack.pop() ?? ctm;
    else if (tok === "cm") {
      const v = nums.slice(-6) as M;
      if (v[0] === -1 && v[3] === 1 && v[1] === 0 && v[2] === 0) mirrors++;
      ctm = [
        v[0] * ctm[0] + v[1] * ctm[2], v[0] * ctm[1] + v[1] * ctm[3],
        v[2] * ctm[0] + v[3] * ctm[2], v[2] * ctm[1] + v[3] * ctm[3],
        v[4] * ctm[0] + v[5] * ctm[2] + ctm[4], v[4] * ctm[1] + v[5] * ctm[3] + ctm[5],
      ];
    } else if (tok === "Do") images.push([apply(ctm, 0, 0), apply(ctm, 1, 1)]);
    else if (tok === "m" || tok === "l") points.push(apply(ctm, nums[nums.length - 2], nums[nums.length - 1]));
    else if (tok === "re") {
      const [x, y, w, h] = nums.slice(-4);
      rects.push([apply(ctm, x, y), apply(ctm, x + w, y + h)]);
    }
    if (!/^\//.test(tok)) nums.length = 0;
  }
  return { images, points, rects, mirrors };
}

function recordRaster(plan: ReturnType<typeof buildRenderPlan>) {
  let m: M = [1, 0, 0, 1, 0, 0];
  const stack: M[] = [];
  const images: { x: number; y: number }[][] = [];
  const points: { x: number; y: number }[] = [];
  const fills: { x: number; y: number }[][] = [];
  let mirrors = 0;
  const ctx = {
    save: () => stack.push(m),
    restore: () => (m = stack.pop()!),
    setTransform: (...v: number[]) => (m = v as M),
    scale: (a: number, b: number) => {
      if (a === -1 && b === 1) mirrors++;
      m = mul(m, [a, 0, 0, b, 0, 0]);
    },
    translate: (x: number, y: number) => (m = mul(m, [1, 0, 0, 1, x, y])),
    rotate: (r: number) => (m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0])),
    clearRect() {},
    fillRect: (x: number, y: number, w: number, h: number) => fills.push([apply(m, x, y), apply(m, x + w, y + h)]),
    strokeRect() {},
    beginPath() {},
    closePath() {},
    stroke() {},
    moveTo: (x: number, y: number) => points.push(apply(m, x, y)),
    lineTo: (x: number, y: number) => points.push(apply(m, x, y)),
    bezierCurveTo: (_a: number, _b: number, _c: number, _d: number, x: number, y: number) => points.push(apply(m, x, y)),
    drawImage: (...a: number[]) => images.push([apply(m, a[5], a[6]), apply(m, a[5] + a[7], a[6] + a[8])]),
  };
  drawPlan(ctx as unknown as CanvasRenderingContext2D, plan, () => ({}) as CanvasImageSource, { scale: 1 });
  return { images, points, fills, mirrors };
}

const xsOf = (pts: { x: number }[]) => pts.map((p) => p.x).sort((a, b) => a - b);
const ysOf = (pts: { y: number }[]) => pts.map((p) => p.y).sort((a, b) => a - b);

/* -------------------------------------------------------------------------- */
/* 1. Mirror: one decision, applied once, the same in every output            */
/* -------------------------------------------------------------------------- */

describe("mirror mode", () => {
  it("resolves auto to the process default and lets on/off override it", () => {
    const procs: PrintProcess[] = ["sublimation", "dtf", "sticker"];
    expect(procs.map(processMirrorDefault)).toEqual([true, false, false]);
    for (const process of procs) {
      expect(resolveMirror({ process, mirrorMode: "auto" })).toBe(processMirrorDefault(process));
      expect(resolveMirror({ process, mirrorMode: "on" })).toBe(true);
      expect(resolveMirror({ process, mirrorMode: "off" })).toBe(false);
    }
  });

  it("maps any stored boolean to a mode that reproduces it exactly", () => {
    for (const process of ["sublimation", "dtf", "sticker"] as PrintProcess[])
      for (const mirrored of [true, false]) expect(resolveMirror({ process, mirrorMode: mirrorModeFor(process, mirrored) })).toBe(mirrored);
    expect(mirrorModeFor("sublimation", true)).toBe("auto");
    expect(mirrorModeFor("dtf", true)).toBe("on");
    expect(mirrorModeFor("sublimation", false)).toBe("off");
  });

  it("opens projects saved before mirror modes exactly as they printed", () => {
    // v0.2–v0.8 pages stored a boolean.
    expect(migratePage({ process: "sublimation", mirrorOutput: true }).mirrorMode).toBe("auto");
    expect(migratePage({ process: "sublimation", mirrorOutput: false }).mirrorMode).toBe("off");
    expect(migratePage({ process: "dtf", mirrorOutput: true }).mirrorMode).toBe("on");
    expect(migratePage({ process: "dtf", mirrorOutput: false }).mirrorMode).toBe("auto");
    // v0.1 pages had no mirror flag and were not mirrored.
    expect(resolveMirror(migratePage({ paper: "A4" } as never))).toBe(false);
    // Current pages keep their mode.
    expect(migratePage({ process: "dtf", mirrorMode: "on" }).mirrorMode).toBe("on");
  });

  it("explains the driver setting for the effective result", () => {
    expect(driverAdvice({ process: "sublimation", mirrorMode: "auto" })).toMatch(/OFF in the printer driver/);
    expect(driverAdvice({ process: "sublimation", mirrorMode: "off" })).toMatch(/by your choice/);
    expect(driverAdvice({ process: "dtf", mirrorMode: "auto" })).toMatch(/does not mirror/);
  });

  // An asymmetric calibration sheet: a design near each corner, all different sizes.
  const corners = [
    makeDesign({ id: "tl", x: 10, y: 12, width: 30, height: 20 }),
    makeDesign({ id: "tr", x: 160, y: 15, width: 40, height: 25 }),
    makeDesign({ id: "bl", x: 12, y: 250, width: 25, height: 35 }),
    makeDesign({ id: "br", x: 150, y: 240, width: 45, height: 40, cut: { shape: "rect", radius: 3, offset: 0, through: "die", safeInset: 0, contour: null } }),
  ];
  const expectedX = (d: Design, mirrored: boolean) => (mirrored ? [210 - d.x - d.width, 210 - d.x] : [d.x, d.x + d.width]);

  for (const [mode, process, mirrored] of [
    ["auto", "sublimation", true],
    ["auto", "dtf", false],
    ["on", "dtf", true],
    ["off", "sublimation", false],
  ] as [MirrorMode, PrintProcess, boolean][]) {
    it(`places every corner design identically in PDF and raster/print (${mode}, ${process})`, async () => {
      const doc = makeDoc(corners, { process, mirrorMode: mode, cropMarks: true, guides: { cutlines: true, centreMarks: true, registration: true, registrationSize: 5 } });
      const plan = buildRenderPlan(doc, { a1: makeAsset({ naturalWidth: 1, naturalHeight: 1 }) });
      expect(plan.mirror).toBe(mirrored);
      const pdf = await pdfMarks(await buildPdf(plan, new Map([["a1", { bytes: TINY_PNG, format: "png" as const }]]), { title: "t" }));
      const raster = recordRaster(plan);
      // Exactly one whole-sheet flip, or none.
      expect(pdf.mirrors).toBe(mirrored ? 1 : 0);
      expect(raster.mirrors).toBe(mirrored ? 1 : 0);
      corners.forEach((d, i) => {
        const [x0, x1] = expectedX(d, mirrored);
        // Square source in a non-square box: contained, centred, so check centres and inside-box bounds.
        const pdfX = xsOf(pdf.images[i]).map((v) => v / PT);
        const rasterX = xsOf(raster.images[i]);
        expect((pdfX[0] + pdfX[1]) / 2).toBeCloseTo((x0 + x1) / 2, 4);
        expect((rasterX[0] + rasterX[1]) / 2).toBeCloseTo((x0 + x1) / 2, 4);
        expect(pdfX[0]).toBeGreaterThanOrEqual(x0 - 1e-6);
        expect(pdfX[1]).toBeLessThanOrEqual(x1 + 1e-6);
        // Vertical position is never changed by a horizontal mirror (PDF y is up).
        const pdfY = ysOf(pdf.images[i]).map((v) => 297 - v / PT);
        expect((pdfY[0] + pdfY[1]) / 2).toBeCloseTo(d.y + d.height / 2, 4);
        expect((ysOf(raster.images[i])[0] + ysOf(raster.images[i])[1]) / 2).toBeCloseTo(d.y + d.height / 2, 4);
      });
      // Cut lines, crop marks and centre marks mirror with the artwork: every point of
      // the mirrored output is exactly 210 − x of the same point unmirrored.
      const flat = recordRaster(buildRenderPlan({ ...doc, page: { ...doc.page, mirrorMode: "off" } }, { a1: makeAsset({ naturalWidth: 1, naturalHeight: 1 }) }));
      const expectedPts = flat.points.map((p) => ({ x: mirrored ? 210 - p.x : p.x, y: p.y }));
      const key = (p: { x: number; y: number }) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
      expect(raster.points.map(key).sort()).toEqual(expectedPts.map(key).sort());
      // Same in the PDF (y up, points), against the PDF of the unmirrored sheet.
      const flatPdf = await pdfMarks(
        await buildPdf(
          buildRenderPlan({ ...doc, page: { ...doc.page, mirrorMode: "off" } }, { a1: makeAsset({ naturalWidth: 1, naturalHeight: 1 }) }),
          new Map([["a1", { bytes: TINY_PNG, format: "png" as const }]]),
          { title: "t" },
        ),
      );
      const mmPt = (p: { x: number; y: number }) => ({ x: p.x / PT, y: 297 - p.y / PT });
      const pdfExpected = flatPdf.points.map(mmPt).map((p) => ({ x: mirrored ? 210 - p.x : p.x, y: p.y }));
      expect(pdf.points.map(mmPt).map(key).sort()).toEqual(pdfExpected.map(key).sort());
      expect(pdf.points.length).toBeGreaterThan(40); // crop, centre and cut lines are really there
      // Registration squares sit in the printable corners either way, drawn once each.
      expect(raster.fills.length).toBe(1 + 4); // page background + four squares
    });
  }

  it("keeps per-design flips independent of the sheet mirror", () => {
    const d = makeDesign({ x: 20, y: 30, width: 50, height: 50, flipX: true });
    const off = recordRaster(buildRenderPlan(makeDoc([d], { mirrorMode: "off" }), { a1: makeAsset() })).images[0];
    const on = recordRaster(buildRenderPlan(makeDoc([d], { mirrorMode: "on" }), { a1: makeAsset() })).images[0];
    expect(off[0].x).toBeCloseTo(70); // flipped inside its box: drawn right to left
    expect(on[0].x).toBeCloseTo(140); // sheet mirror then flips it back: left to right at the mirrored spot
    expect(on[1].x).toBeCloseTo(190);
  });

  it("never mirrors again in browser print CSS", () => {
    const css = pageCss([{ width: 210, height: 297 }]);
    expect(css).not.toMatch(/scale|matrix|rotate|transform/);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Fit, fill and crop in a fixed box                                        */
/* -------------------------------------------------------------------------- */

describe("fill (cover) and crop", () => {
  const square = { width: 228.6, height: 228.6, padding: 0, crop: null };
  const portrait = { width: 3000, height: 4000 };

  it("fills a 228.6 mm square with a portrait photo: no bars, no distortion, only height cropped", () => {
    const d = { ...square, fitMode: "cover" as const, view: null };
    const src = effectiveSourceRect(d, portrait);
    expect(src.width).toBeCloseTo(3000);
    expect(src.height).toBeCloseTo(3000);
    expect(src.y).toBeCloseTo(500); // centred: 500 px off the top and bottom
    const rect = computeImageRect({ ...d, alignX: "center", alignY: "center" }, src);
    expect(rect).toMatchObject({ x: 0, y: 0, width: 228.6, height: 228.6 });
    // Same scale on both axes.
    expect(rect.width / src.width).toBeCloseTo(rect.height / src.height, 12);
    expect(coverCroppedFraction(d, portrait)).toBeCloseTo(0.25, 6);
  });

  it("fills a portrait box with a landscape photo by cropping the sides", () => {
    const d = { width: 100, height: 150, padding: 0, crop: null, fitMode: "cover" as const, view: null };
    const src = effectiveSourceRect(d, { width: 4000, height: 3000 });
    expect(src.height).toBeCloseTo(3000);
    expect(src.width / src.height).toBeCloseTo(100 / 150, 9);
    expect(src.x).toBeCloseTo((4000 - 2000) / 2);
  });

  it("fit keeps the whole photo and leaves empty space", () => {
    const d = { ...square, fitMode: "contain" as const, alignX: "center" as const, alignY: "center" as const };
    const rect = computeImageRect(d, portrait);
    expect(rect.height).toBeCloseTo(228.6);
    expect(rect.width).toBeCloseTo(228.6 * 0.75);
    expect(effectiveCrop({ ...d, view: null }, portrait)).toBeNull();
  });

  it("pans within limits and zooms around the centre", () => {
    const d = { ...square, fitMode: "cover" as const, view: null };
    // Drag the photo down by a lot: the window stops at the top edge.
    const top = panView(d, portrait, 0, 1000);
    expect(top.y).toBe(0);
    expect(effectiveSourceRect({ ...d, view: top }, portrait).y).toBeCloseTo(0);
    // Horizontal drag does nothing when there is no horizontal slack.
    expect(panView(d, portrait, 50, 0).x).toBe(0.5);
    const z = zoomView(d, portrait, 2);
    const win = effectiveSourceRect({ ...d, view: z }, portrait);
    expect(win.width).toBeCloseTo(1500);
    expect(win.x + win.width / 2).toBeCloseTo(1500);
    expect(win.y + win.height / 2).toBeCloseTo(2000);
    expect(zoomView(d, portrait, 100).zoom).toBe(8);
    expect(zoomView(d, portrait, 0.2).zoom).toBe(1);
  });

  it("composes with edge-crop insets and reports lower effective DPI as it zooms", () => {
    const d = { ...square, crop: { top: 0.1, right: 0, bottom: 0, left: 0 }, fitMode: "cover" as const, view: { zoom: 1, x: 0.5, y: 0.5 } };
    const base = effectiveSourceRect({ ...d, fitMode: "contain" }, portrait);
    expect(base.y).toBeCloseTo(400);
    const w = effectiveSourceRect(d, portrait);
    expect(w.y).toBeGreaterThanOrEqual(400);
    const dpi = (zoom: number) =>
      resolutionReport(portrait, effectiveCrop({ ...d, view: { zoom, x: 0.5, y: 0.5 } }, portrait), { width: 228.6, height: 228.6 }).effectiveDpi;
    expect(dpi(1)).toBeCloseTo(3000 / 9, 1);
    expect(dpi(4)).toBeCloseTo(3000 / 9 / 4, 1);
    expect(resolutionReport(portrait, effectiveCrop({ ...d, view: { zoom: 4, x: 0.5, y: 0.5 } }, portrait), { width: 228.6, height: 228.6 }).level).toBe("low");
  });

  it("is resolution independent: the same view crops the same fraction of a 4× larger file", () => {
    const d = { ...square, fitMode: "cover" as const, view: { zoom: 1.7, x: 0.2, y: 0.9 } };
    const a = effectiveCrop(d, portrait)!;
    const b = effectiveCrop(d, { width: 12000, height: 16000 })!;
    for (const k of ["top", "right", "bottom", "left"] as const) expect(a[k]).toBeCloseTo(b[k], 12);
  });

  it("feeds the same window to the render plan, PDF and raster", async () => {
    const d = makeDesign({ x: 0, y: 0, width: 100, height: 100, fitMode: "cover", view: { zoom: 2, x: 1, y: 0 } });
    const asset = makeAsset({ naturalWidth: 400, naturalHeight: 800 });
    const plan = buildRenderPlan(makeDoc([d]), { a1: asset });
    const item = plan.items[0];
    expect(item.sourceRect).toEqual(effectiveSourceRect(d, { width: 400, height: 800 }));
    expect(item.sourceRect).toMatchObject({ x: 200, y: 0, width: 200, height: 200 });
    expect(item.image).toMatchObject({ x: -50, y: -50, width: 100, height: 100 });
    // PDF draws the full image scaled so the window lands on the box, clipped.
    const pdf = await pdfMarks(await buildPdf(plan, new Map([["a1", { bytes: TINY_PNG, format: "png" as const }]]), { title: "t" }));
    const [p0, p1] = pdf.images[0];
    const mm = (v: number) => v / PT;
    expect(mm(Math.abs(p1.x - p0.x))).toBeCloseTo(200, 4); // 400 px at 0.5 mm/px
    expect(mm(Math.min(p0.x, p1.x))).toBeCloseTo(-100, 4); // window starts 200 px in
    expect(pdf.rects.length).toBeGreaterThan(0); // the clip rectangle
  });

  it("survives save and reopen", () => {
    const d = makeDesign({ fitMode: "cover", view: { zoom: 2.5, x: 0.1, y: 0.8 } });
    const back = migrateDocument(JSON.parse(JSON.stringify(makeDoc([d])))).designs[0];
    expect(back.fitMode).toBe("cover");
    expect(back.view).toEqual({ zoom: 2.5, x: 0.1, y: 0.8 });
    // Corrupt values are clamped, not passed to renderers.
    const bad = migrateDocument({ page: {}, designs: [{ ...d, view: { zoom: Number.NaN, x: 9, y: -3 }, width: Number.POSITIVE_INFINITY }] }).designs[0];
    expect(bad.view).toEqual({ zoom: 1, x: 1, y: 0 });
    expect(Number.isFinite(bad.width)).toBe(true);
  });

  it("window helper matches the box shape exactly", () => {
    const w = coverWindow({ x: 0, y: 0, width: 640, height: 480 }, 2, null);
    expect(w.width / w.height).toBeCloseTo(2, 12);
    expect(w.width).toBeCloseTo(640);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Cut paths, guides and marks                                             */
/* -------------------------------------------------------------------------- */

describe("cut paths", () => {
  it("draws a CR80 card cut at the trim with its corner radius", () => {
    const card = makeDesign({ productId: "card-cr80", width: 89.6, height: 57.98, bleed: 2 });
    const [path] = cutPaths(card);
    const b = pathsBounds([path])!;
    expect(b.width).toBeCloseTo(85.6, 6);
    expect(b.height).toBeCloseTo(53.98, 6);
    // Starts at the end of the top-left corner arc: x = left + radius.
    expect(path[0]).toMatchObject({ op: "M", x: expect.closeTo(-42.8 + 3.18, 6) });
    expect(validatePath(path)).toEqual([]);
  });

  it("cuts round products as an ellipse and offsets cuts outward", () => {
    const d = makeDesign({ productId: "coaster-round", width: 101.25, height: 101.25, bleed: 3 });
    expect(pathsBounds(cutPaths(d))!.width).toBeCloseTo(95.25, 6);
    const offset = makeDesign({ width: 50, height: 30, cut: { shape: "rect", radius: 2, offset: 1.5, through: "kiss", safeInset: 2, contour: null } });
    expect(pathsBounds(cutPaths(offset))).toMatchObject({ width: 53, height: 33 });
    expect(pathsBounds([ellipsePath({ x: 0, y: 0, width: 40, height: 20 })])).toMatchObject({ width: 40, height: 20 });
    expect(pathsBounds([roundedRectPath({ x: 1, y: 2, width: 10, height: 10 }, 99)])).toMatchObject({ x: 1, y: 2, width: 10, height: 10 });
  });

  it("rejects self-intersecting, open and degenerate paths", () => {
    expect(validatePolygon([0, 0, 10, 10, 10, 0, 0, 10]).map((p) => p.kind)).toContain("self-intersecting");
    expect(validatePolygon([0, 0, 1, 1]).map((p) => p.kind)).toEqual(["too-few-points"]);
    expect(validatePolygon([0, 0, 5, 5, 10, 10]).map((p) => p.kind)).toContain("too-small");
    expect(validatePolygon([0, 0, Number.NaN, 1, 2, 2]).map((p) => p.kind)).toEqual(["not-finite"]);
    expect(validatePath([{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 0 }])[0].kind).toBe("open");
    expect(validatePolygon([0, 0, 10, 0, 10, 10, 0, 10])).toEqual([]);
  });

  it("only includes cut lines and marks when the output mode asks for them", () => {
    const doc = makeDoc([makeDesign({ x: 20, y: 20 })], { cropMarks: true, guides: { cutlines: false, centreMarks: true, registration: true, registrationSize: 6 } });
    const assets = { a1: makeAsset() };
    const print = buildRenderPlan(doc, assets);
    expect(print.showCutlines).toBe(false);
    expect(print.cropMarks.length).toBe(8);
    expect(print.centreMarks.length).toBe(4);
    expect(print.registration).toHaveLength(4);
    const art = buildRenderPlan(doc, assets, { output: "artwork" });
    expect([art.cropMarks.length, art.centreMarks.length, art.registration.length, art.showCutlines]).toEqual([0, 0, 0, false]);
    const proof = buildRenderPlan({ ...doc, page: { ...doc.page, sheetCut: true } }, assets, { output: "proof" });
    expect(proof.showCutlines).toBe(true);
    expect(proof.sheetCut).not.toBeNull();
    // Cut paths are carried in every mode, so an SVG cut file can always be made.
    expect(art.items[0].cut.paths).toHaveLength(1);
  });

  it("puts centre marks outside the trim, pointing at its middle", () => {
    const marks = centreMarksFor({ x: 10, y: 20, width: 40, height: 30 });
    expect(marks[0]).toMatchObject({ x1: 30, x2: 30 });
    expect(marks[0].y2).toBeLessThan(20);
    expect(marks[3].x1).toBeGreaterThan(50);
  });

  it("places registration squares in the printable corners", () => {
    const sq = registrationMarks(makePage({ guides: { cutlines: false, centreMarks: false, registration: true, registrationSize: 5 } }));
    expect(sq[0]).toEqual({ x: 10, y: 10, width: 5, height: 5 });
    expect(sq[3]).toEqual({ x: 195, y: 282, width: 5, height: 5 });
  });
});

describe("alpha contours", () => {
  const disk = (size: number, r: number, cx = size / 2, cy = size / 2) => {
    const m = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) m[y * size + x] = 1;
    return m;
  };

  it("traces one closed outline around a disk, close to its true area", () => {
    const r = traceContour(disk(100, 30), 100, 100, { smoothing: 1, tolerancePx: 0.5 });
    expect(r.outlines).toHaveLength(1);
    expect(Math.abs(polygonArea(r.outlines[0]))).toBeCloseTo(Math.PI * 30 * 30, -2);
    expect(validatePolygon(r.outlines[0])).toEqual([]);
  });

  it("grows the outline by the offset", () => {
    const r = traceContour(disk(120, 25), 120, 120, { offsetPx: 10, smoothing: 1 });
    const area = Math.abs(polygonArea(r.outlines[0]));
    expect(area / (Math.PI * 35 * 35)).toBeGreaterThan(0.97);
    expect(area / (Math.PI * 35 * 35)).toBeLessThan(1.03);
  });

  it("keeps islands separate, merges them when the offset bridges the gap, and cuts holes on request", () => {
    const size = 120;
    const two = new Uint8Array(size * size);
    const a = disk(size, 15, 35, 60);
    const b = disk(size, 15, 85, 60);
    for (let i = 0; i < two.length; i++) two[i] = a[i] | b[i];
    expect(traceContour(two, size, size).outlines).toHaveLength(2);
    expect(traceContour(two, size, size, { offsetPx: 12 }).outlines).toHaveLength(1);
    const ring = disk(size, 40);
    const inner = disk(size, 20);
    for (let i = 0; i < ring.length; i++) if (inner[i]) ring[i] = 0;
    expect(traceContour(ring, size, size).holes).toHaveLength(0);
    const withHoles = traceContour(ring, size, size, { holes: true });
    expect(withHoles.outlines).toHaveLength(1);
    expect(withHoles.holes).toHaveLength(1);
  });

  it("reports an empty image and ignores specks", () => {
    expect(traceContour(new Uint8Array(400), 20, 20).problems[0]).toMatch(/No artwork/);
    const m = disk(60, 20);
    m[2] = 1; // a lone pixel
    const r = traceContour(m, 60, 60, { minAreaPx: 4 });
    expect(r.outlines).toHaveLength(1);
    expect(r.dropped).toBe(1);
  });

  it("traces pixel squares exactly and simplifies/smooths without breaking the loop", () => {
    const m = new Uint8Array(9);
    m[4] = 1;
    expect(traceLoops(m, 3, 3)).toEqual([[1, 1, 2, 1, 2, 2, 1, 2]]);
    const sq = [0, 0, 5, 0, 10, 0, 10, 10, 0, 10];
    expect(simplifyClosed(sq, 0.1).length).toBeLessThan(sq.length);
    expect(chaikin([0, 0, 10, 0, 10, 10, 0, 10], 1)).toHaveLength(16);
    expect(dilate(m, 3, 3, 1).reduce((s, v) => s + v, 0)).toBe(5);
  });

  it("marks a contour stale when the artwork, box or offset changes", () => {
    const base = makeDesign({ width: 50, height: 50 });
    const cut = { shape: "contour" as const, radius: 0, offset: 2, through: "die" as const, safeInset: 0, contour: { paths: [[0, 0, 1, 0, 1, 1]], generatedFor: { assetId: "a1", width: 50, height: 50, offset: 2, key: contourKey(base) } } };
    const d = { ...base, cut };
    expect(contourIsStale(d)).toBe(false);
    expect(contourIsStale({ ...d, width: 60 })).toBe(true);
    expect(contourIsStale({ ...d, assetId: "other" })).toBe(true);
    expect(contourIsStale({ ...d, fitMode: "cover" })).toBe(true);
    expect(contourIsStale({ ...d, cut: { ...cut, contour: null } })).toBe(true);
    // A contour maps to box millimetres, scaled with the box.
    const b = pathsBounds(cutPaths(d))!;
    expect(b).toMatchObject({ x: -25, y: -25, width: 50, height: 50 });
  });
});

/* -------------------------------------------------------------------------- */
/* 4. SVG cut file                                                             */
/* -------------------------------------------------------------------------- */

describe("SVG cut file", () => {
  const doc = (mirrorMode: MirrorMode) =>
    makeDoc(
      [
        makeDesign({ id: "s1", x: 20, y: 30, width: 50, height: 40, cut: { shape: "rect", radius: 4, offset: 0, through: "kiss", safeInset: 0, contour: null } }),
        makeDesign({ id: "s2", x: 100, y: 30, width: 60, height: 60, cut: { shape: "ellipse", radius: 0, offset: 1, through: "die", safeInset: 0, contour: null } }),
      ],
      { process: "sticker", mirrorMode, sheetCut: true, guides: { cutlines: true, centreMarks: false, registration: true, registrationSize: 5 } },
    );

  it("is in real millimetres with named, separated groups", () => {
    const plan = buildRenderPlan(doc("auto"), { a1: makeAsset() }, { output: "proof" });
    const svg = buildSvg(plan, { title: "Stickers & <co>" });
    expect(svg).toContain('width="210mm" height="297mm" viewBox="0 0 210 297"');
    expect(svg.match(/<path id="cut-/g)).toHaveLength(2);
    expect(svg).toContain('data-cut="kiss"');
    expect(svg).toContain('data-cut="die"');
    expect(svg).toContain('<g id="SHEET_CUT">');
    expect(svg).toContain('<g id="REGISTRATION">');
    expect(svg).not.toContain('<g id="ARTWORK">');
    expect(svg).not.toContain('id="MIRROR"');
    expect(svg).toContain("Stickers &amp; &lt;co&gt;");
    // The rounded rectangle starts at its first straight edge: x = 20 + radius, y = 30.
    expect(svg).toMatch(/d="M24 30 L66 30 C/);
  });

  it("embeds artwork in its own group and mirrors exactly like the print", () => {
    const plan = buildRenderPlan(doc("on"), { a1: makeAsset() }, { output: "proof" });
    const svg = buildSvg(plan, { images: new Map([["a1", "data:image/png;base64,AAAA"]]) });
    expect(svg).toContain('<g id="ARTWORK">');
    expect(svg).toContain('<g id="MIRROR" transform="translate(210 0) scale(-1 1)">');
    expect(svg.indexOf('id="ARTWORK"')).toBeLessThan(svg.indexOf('id="CUTLINE"'));
    expect(svg.match(/<image /g)).toHaveLength(2);
  });

  it("lists cut paths in page millimetres with their kind", () => {
    const plan = buildRenderPlan(doc("auto"), { a1: makeAsset() }, { output: "proof" });
    const cuts = planCutPaths(plan);
    expect(cuts.map((c) => c.through)).toEqual(["kiss", "die", "die"]);
    const ellipse = pathsBounds([cuts[1].path])!;
    expect(ellipse).toMatchObject({ x: expect.closeTo(99, 6), width: expect.closeTo(62, 6) });
  });
});
