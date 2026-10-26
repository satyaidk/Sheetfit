import { describe, expect, it } from "vitest";
import {
  computeImageRect,
  croppedSourceSize,
  describeFit,
  fitContain,
  normalizeBox,
  resizeBox,
  sourceCropRect,
} from "@/lib/image/image-fit";
import type { FitMode } from "@/types/editor";
import { makeDesign } from "./fixtures";

const NON_DISTORTING: FitMode[] = ["contain", "fit-width", "fit-height", "fill", "manual"];

/** The image rect must lie fully inside the box: nothing is cut off. */
function expectInsideBox(rect: { x: number; y: number; width: number; height: number }, w: number, h: number) {
  expect(rect.x).toBeGreaterThanOrEqual(-1e-9);
  expect(rect.y).toBeGreaterThanOrEqual(-1e-9);
  expect(rect.x + rect.width).toBeLessThanOrEqual(w + 1e-9);
  expect(rect.y + rect.height).toBeLessThanOrEqual(h + 1e-9);
}

describe("fitContain", () => {
  it("uses the smaller scale so the whole source fits", () => {
    expect(fitContain({ width: 1000, height: 500 }, { width: 100, height: 100 })).toEqual({
      width: 100,
      height: 50,
    });
    expect(fitContain({ width: 500, height: 1000 }, { width: 100, height: 100 })).toEqual({
      width: 50,
      height: 100,
    });
  });

  it("scales up small sources too", () => {
    expect(fitContain({ width: 10, height: 10 }, { width: 90, height: 60 })).toEqual({
      width: 60,
      height: 60,
    });
  });

  it("returns zero size for an empty source", () => {
    expect(fitContain({ width: 0, height: 10 }, { width: 90, height: 60 })).toEqual({
      width: 0,
      height: 0,
    });
  });
});

describe("computeImageRect", () => {
  it("case 1: square logo in a 90 × 60 mm box keeps every edge and centres", () => {
    const rect = computeImageRect(makeDesign(), { width: 1000, height: 1000 });
    expect(rect).toEqual({ x: 15, y: 0, width: 60, height: 60 });
  });

  it("case 13: an extremely wide logo is letterboxed, never cropped", () => {
    const design = makeDesign({ width: 50, height: 50 });
    const rect = computeImageRect(design, { width: 8000, height: 200 });
    expect(rect.width).toBeCloseTo(50);
    expect(rect.height).toBeCloseTo(1.25);
    expect(rect.y).toBeCloseTo(24.375);
    expectInsideBox(rect, 50, 50);
  });

  it("never places pixels outside the box for any non-distorting mode", () => {
    const sources = [
      { width: 1000, height: 1000 },
      { width: 4000, height: 300 },
      { width: 300, height: 4000 },
      { width: 3, height: 7 },
    ];
    for (const mode of NON_DISTORTING) {
      for (const source of sources) {
        const base = makeDesign({ fitMode: mode, width: 120, height: 45, padding: 3 });
        const box = normalizeBox(base, source);
        const design = { ...base, ...box };
        const rect = computeImageRect(design, source);
        expectInsideBox(rect, design.width, design.height);
        // Aspect ratio is preserved exactly.
        expect(rect.width / rect.height).toBeCloseTo(source.width / source.height, 9);
      }
    }
  });

  it("respects alignment within the box", () => {
    const source = { width: 1000, height: 1000 };
    expect(computeImageRect(makeDesign({ alignX: "start" }), source).x).toBe(0);
    expect(computeImageRect(makeDesign({ alignX: "end" }), source).x).toBe(30);
  });

  it("applies padding on all sides", () => {
    const rect = computeImageRect(makeDesign({ padding: 5 }), { width: 1000, height: 1000 });
    expect(rect).toEqual({ x: 20, y: 5, width: 50, height: 50 });
  });

  it("stretch fills the padded box exactly (the only distorting mode)", () => {
    const rect = computeImageRect(makeDesign({ fitMode: "stretch" }), { width: 1000, height: 1000 });
    expect(rect).toEqual({ x: 0, y: 0, width: 90, height: 60 });
  });
});

describe("normalizeBox", () => {
  const source = { width: 2000, height: 1000 };
  it("fit-width keeps width and derives height", () => {
    expect(normalizeBox(makeDesign({ fitMode: "fit-width", width: 100 }), source)).toEqual({
      width: 100,
      height: 50,
    });
  });
  it("fit-height keeps height and derives width", () => {
    expect(normalizeBox(makeDesign({ fitMode: "fit-height", height: 40 }), source)).toEqual({
      width: 80,
      height: 40,
    });
  });
  it("accounts for padding", () => {
    expect(
      normalizeBox(makeDesign({ fitMode: "fit-width", width: 100, padding: 5 }), source),
    ).toEqual({ width: 100, height: 55 });
  });
  it("leaves contain boxes alone", () => {
    expect(normalizeBox(makeDesign(), source)).toEqual({ width: 90, height: 60 });
  });
});

describe("describeFit", () => {
  it("case 6: reports the aspect mismatch and the unused space", () => {
    const fit = describeFit(makeDesign(), { width: 1000, height: 1000 });
    expect(fit.aspectMismatch).toBe(true);
    expect(fit.unusedWidth).toBeCloseTo(30);
    expect(fit.unusedHeight).toBeCloseTo(0);
    expect(fit.distorted).toBe(false);
  });

  it("case 5: a 3:2 image in a 90 × 60 box fills it exactly", () => {
    const fit = describeFit(makeDesign(), { width: 1500, height: 1000 });
    expect(fit.aspectMismatch).toBe(false);
    expect(fit.image).toEqual({ x: 0, y: 0, width: 90, height: 60 });
  });

  it("flags distortion only for stretch with mismatched aspect", () => {
    const fit = describeFit(makeDesign({ fitMode: "stretch" }), { width: 1000, height: 1000 });
    expect(fit.distorted).toBe(true);
  });
});

describe("resizeBox", () => {
  const source = { width: 1500, height: 1000 };
  it("derives height from the image when width changes and aspect is locked", () => {
    expect(resizeBox(makeDesign(), source, { width: 150 })).toEqual({ width: 150, height: 100 });
  });
  it("derives width when height changes", () => {
    expect(resizeBox(makeDesign(), source, { height: 30 })).toEqual({ width: 45, height: 30 });
  });
  it("allows independent values when unlocked", () => {
    expect(resizeBox(makeDesign({ lockAspect: false }), source, { width: 150 })).toEqual({
      width: 150,
      height: 60,
    });
  });
  it("never returns a zero or negative size", () => {
    const size = resizeBox(makeDesign({ lockAspect: false }), source, { width: -5, height: 0 });
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});

describe("crop", () => {
  it("is off by default and the full source is used", () => {
    expect(croppedSourceSize({ width: 100, height: 50 }, null)).toEqual({ width: 100, height: 50 });
    expect(sourceCropRect({ width: 100, height: 50 }, null)).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });
  it("reduces the source window when enabled", () => {
    const crop = { top: 0.1, right: 0.2, bottom: 0.1, left: 0.2 };
    const rect = sourceCropRect({ width: 100, height: 50 }, crop);
    expect(rect.x).toBeCloseTo(20);
    expect(rect.y).toBeCloseTo(5);
    expect(rect.width).toBeCloseTo(60);
    expect(rect.height).toBeCloseTo(40);
  });
});
