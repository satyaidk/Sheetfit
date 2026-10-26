import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildRenderPlan, cropMarksFor, localToPage } from "@/lib/render/render-plan";
import { drawPlan } from "@/lib/export/rasterize";
import { buildPdf, hexToRgb, itemMatrix } from "@/lib/export/export-pdf";
import {
  crc32,
  readJpegDpi,
  readPngDpi,
  setJpegDpi,
  setPngDpi,
} from "@/lib/export/dpi-metadata";
import { mmToPt } from "@/lib/layout/coordinate-conversion";
import { jpegExifOrientation, resolveMime, validateFile } from "@/lib/image/image-loader";
import { makeAsset, makeDesign, makeDoc, TINY_PNG } from "./fixtures";

type M = [number, number, number, number, number, number];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: M, x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

/** Minimal 2D context that tracks the transform and records draw calls in device pixels. */
function recordingContext() {
  let m: M = [1, 0, 0, 1, 0, 0];
  const stack: M[] = [];
  const calls: { op: string; corners?: { x: number; y: number }[]; style?: string }[] = [];
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "low",
    save: () => stack.push(m),
    restore: () => (m = stack.pop() ?? m),
    setTransform: (...v: number[]) => (m = v as M),
    scale: (sx: number, sy: number) => (m = mul(m, [sx, 0, 0, sy, 0, 0])),
    translate: (x: number, y: number) => (m = mul(m, [1, 0, 0, 1, x, y])),
    rotate: (a: number) => (m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0])),
    clearRect: () => calls.push({ op: "clear" }),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ op: "fill", style: ctx.fillStyle, corners: [apply(m, x, y), apply(m, x + w, y + h)] }),
    strokeRect: () => calls.push({ op: "strokeRect" }),
    drawImage: (...a: number[]) => {
      const [, , , , , dx, dy, dw, dh] = a;
      calls.push({ op: "image", corners: [apply(m, dx, dy), apply(m, dx + dw, dy + dh)] });
    },
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => calls.push({ op: "stroke" }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const fakeImage = {} as CanvasImageSource;

describe("render plan", () => {
  it("places a 90 × 60 design at its box centre with local rects", () => {
    const plan = buildRenderPlan(makeDoc([makeDesign({ x: 60, y: 118.5 })]), { a1: makeAsset() });
    expect(plan.page).toEqual({ width: 210, height: 297 });
    const item = plan.items[0];
    expect(item.center).toEqual({ x: 105, y: 148.5 });
    expect(item.image).toEqual({ x: -30, y: -30, width: 60, height: 60 });
  });

  it("skips designs whose asset is missing", () => {
    expect(buildRenderPlan(makeDoc([makeDesign()]), {}).items).toHaveLength(0);
  });

  it("adds a background only in fill mode with a colour", () => {
    const fill = buildRenderPlan(makeDoc([makeDesign({ fitMode: "fill", fillColor: "#ff0000" })]), { a1: makeAsset() });
    expect(fill.items[0].background?.color).toBe("#ff0000");
    const transparent = buildRenderPlan(makeDoc([makeDesign({ fitMode: "fill" })]), { a1: makeAsset() });
    expect(transparent.items[0].background).toBeNull();
  });

  it("emits eight crop marks per design when enabled", () => {
    const plan = buildRenderPlan(makeDoc([makeDesign()], { cropMarks: true }), { a1: makeAsset() });
    expect(plan.cropMarks).toHaveLength(8);
    expect(cropMarksFor({ x: 10, y: 10, width: 10, height: 10 })[0]).toEqual({ x1: 4.5, y1: 10, x2: 8.5, y2: 10 });
  });

  it("maps local points through rotation", () => {
    const p = localToPage({ center: { x: 100, y: 100 }, rotation: 90 }, 10, 0);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(110);
  });
});

describe("raster export", () => {
  it("case 12: an image at a known coordinate lands on the exact pixels at 300 DPI", () => {
    const design = makeDesign({ x: 20, y: 30, width: 50, height: 50 });
    const plan = buildRenderPlan(makeDoc([design]), { a1: makeAsset() });
    const { ctx, calls } = recordingContext();
    const scale = 300 / 25.4;
    drawPlan(ctx, plan, () => fakeImage, { scale });
    const img = calls.find((c) => c.op === "image")!;
    expect(img.corners![0].x).toBeCloseTo(20 * scale, 6);
    expect(img.corners![0].y).toBeCloseTo(30 * scale, 6);
    expect(img.corners![1].x).toBeCloseTo(70 * scale, 6);
    expect(img.corners![1].y).toBeCloseTo(80 * scale, 6);
  });

  it("case 4: transparent pages paint no background (alpha is preserved)", () => {
    const plan = buildRenderPlan(makeDoc([makeDesign()], { background: null }), { a1: makeAsset() });
    const { ctx, calls } = recordingContext();
    drawPlan(ctx, plan, () => fakeImage, { scale: 1 });
    expect(calls.filter((c) => c.op === "fill")).toHaveLength(0);
  });

  it("paints the override background for JPEG", () => {
    const plan = buildRenderPlan(makeDoc([makeDesign()], { background: null }), { a1: makeAsset() });
    const { ctx, calls } = recordingContext();
    drawPlan(ctx, plan, () => fakeImage, { scale: 1, background: "#ffffff" });
    expect(calls.find((c) => c.op === "fill")?.style).toBe("#ffffff");
  });

  it("rotates around the box centre", () => {
    const design = makeDesign({ x: 50, y: 50, width: 100, height: 50, rotation: 90, fitMode: "stretch" });
    const plan = buildRenderPlan(makeDoc([design]), { a1: makeAsset() });
    const { ctx, calls } = recordingContext();
    drawPlan(ctx, plan, () => fakeImage, { scale: 1 });
    const [a, b] = calls.find((c) => c.op === "image")!.corners!;
    // Centre (100, 75) is preserved; the box is now 50 wide and 100 tall.
    expect((a.x + b.x) / 2).toBeCloseTo(100);
    expect((a.y + b.y) / 2).toBeCloseTo(75);
    expect(Math.abs(a.x - b.x)).toBeCloseTo(50);
    expect(Math.abs(a.y - b.y)).toBeCloseTo(100);
  });
});

describe("PDF export", () => {
  const assets = { a1: makeAsset({ naturalWidth: 1, naturalHeight: 1 }) };
  const images = new Map([["a1", { bytes: TINY_PNG, format: "png" as const }]]);

  it("case 10: produces exactly one A4 portrait page (210 × 297 mm)", async () => {
    const plan = buildRenderPlan(makeDoc([makeDesign()]), assets);
    const pdf = await PDFDocument.load(await buildPdf(plan, images, { title: "Test" }));
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(mmToPt(210), 4);
    expect(height).toBeCloseTo(mmToPt(297), 4);
    expect(pdf.getTitle()).toBe("Test");
  });

  it("case 11: produces an A4 landscape page (297 × 210 mm)", async () => {
    const plan = buildRenderPlan(makeDoc([makeDesign()], { orientation: "landscape" }), assets);
    const pdf = await PDFDocument.load(await buildPdf(plan, images, { title: "Test" }));
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(mmToPt(297), 4);
    expect(height).toBeCloseTo(mmToPt(210), 4);
  });

  it("embeds a shared asset once for many copies", async () => {
    const imageObjects = async (count: number) => {
      const designs = Array.from({ length: count }, (_, i) => makeDesign({ id: `d${i}`, x: i * 10 }));
      const bytes = await buildPdf(buildRenderPlan(makeDoc(designs), assets), images, { title: "Test" });
      return new TextDecoder("latin1").decode(bytes).match(/\/Subtype \/Image/g)?.length;
    };
    // A PNG with alpha embeds as an image plus its soft mask; copies add nothing.
    expect(await imageObjects(3)).toBe(await imageObjects(1));
  });

  it("builds with crop and fill without throwing", async () => {
    const plan = buildRenderPlan(
      makeDoc([
        makeDesign({ fitMode: "fill", fillColor: "#123456", border: true, crop: { top: 0.1, right: 0, bottom: 0, left: 0.2 } }),
      ]),
      assets,
    );
    await expect(buildPdf(plan, images, { title: "Crop" })).resolves.toBeInstanceOf(Uint8Array);
  });

  it("case 12: the item matrix maps a known coordinate to the right PDF point", () => {
    // 50 × 50 mm box at (20, 30) on portrait A4: top-left corner in local space is (-25, +25) with y up.
    const m = itemMatrix({ center: { x: 45, y: 55 }, rotation: 0 }, 297);
    const corner = apply(m, -25, 25);
    expect(corner.x).toBeCloseTo(mmToPt(20), 6);
    expect(corner.y).toBeCloseTo(mmToPt(297 - 30), 6);
  });

  it("parses hex colours", () => {
    expect(hexToRgb("#fff")).toEqual({ type: "RGB", red: 1, green: 1, blue: 1 });
  });
});

describe("DPI metadata", () => {
  it("stamps and reads PNG pHYs", () => {
    expect(readPngDpi(TINY_PNG)).toBeNull();
    const out = setPngDpi(TINY_PNG, 300);
    expect(readPngDpi(out)).toBe(300);
    // Replacing an existing chunk keeps a single pHYs.
    const twice = setPngDpi(out, 600);
    expect(readPngDpi(twice)).toBe(600);
    expect(twice.length).toBe(out.length);
  });

  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("IEND"))).toBe(0xae426082);
  });

  it("stamps JPEG JFIF density", () => {
    const jfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 72, 0, 72, 0, 0, 0xff, 0xd9]);
    expect(readJpegDpi(setJpegDpi(jfif, 300))).toBe(300);
    const bare = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0, 2, 0xff, 0xd9]);
    const stamped = setJpegDpi(bare, 600);
    expect(readJpegDpi(stamped)).toBe(600);
    expect(stamped.length).toBe(bare.length + 18);
  });

  it("rejects files of the wrong type", () => {
    expect(() => setPngDpi(new Uint8Array([1, 2, 3]), 300)).toThrow();
    expect(() => setJpegDpi(new Uint8Array([1, 2, 3]), 300)).toThrow();
  });
});

describe("image validation", () => {
  it("resolves MIME types from the name when the browser omits it", () => {
    expect(resolveMime({ type: "", name: "Logo.JPEG" })).toBe("image/jpeg");
    expect(resolveMime({ type: "image/webp", name: "x" })).toBe("image/webp");
    expect(resolveMime({ type: "image/gif", name: "x.gif" })).toBeNull();
  });

  it("rejects unsupported and oversized files", () => {
    expect(() => validateFile({ type: "image/gif", name: "a.gif", size: 1 })).toThrow(/not a supported/);
    expect(() => validateFile({ type: "image/png", name: "a.png", size: 1e9 })).toThrow(/larger than/);
  });

  it("reads EXIF orientation from JPEG bytes", () => {
    // SOI, APP1 Exif with a big-endian TIFF header and one IFD entry: Orientation = 6.
    const exif = [
      0x45, 0x78, 0x69, 0x66, 0, 0, // "Exif\0\0"
      0x4d, 0x4d, 0, 42, 0, 0, 0, 8, // TIFF header, IFD at 8
      0, 1, // one entry
      0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, // tag 0x0112 SHORT 1 → 6
      0, 0, 0, 0,
    ];
    const len = exif.length + 2;
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...exif, 0xff, 0xd9]);
    expect(jpegExifOrientation(jpeg)).toBe(6);
    expect(jpegExifOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1);
    expect(jpegExifOrientation(TINY_PNG)).toBe(1);
  });
});
