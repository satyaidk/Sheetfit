import { describe, expect, it } from "vitest";
import {
  formatUnit,
  fromMm,
  mmToPt,
  mmToPx,
  ptToMm,
  pxToMm,
  toMm,
} from "@/lib/layout/coordinate-conversion";
import {
  effectiveDpi,
  maxPrintSizeAt,
  qualityForDpi,
  resolutionReport,
} from "@/lib/image/image-resolution";
import { canvasSizeWithinLimits, pagePixelSize } from "@/lib/export/rasterize";

describe("unit conversion", () => {
  it("converts A4 to the expected 300 DPI raster size", () => {
    expect(pagePixelSize({ width: 210, height: 297 }, 300)).toEqual({ width: 2480, height: 3508 });
    expect(pagePixelSize({ width: 297, height: 210 }, 300)).toEqual({ width: 3508, height: 2480 });
    expect(pagePixelSize({ width: 210, height: 297 }, 150)).toEqual({ width: 1240, height: 1754 });
    expect(pagePixelSize({ width: 210, height: 297 }, 600)).toEqual({ width: 4961, height: 7016 });
  });

  it("round-trips mm ↔ px ↔ mm without drift", () => {
    let mm = 90;
    for (let i = 0; i < 1000; i++) mm = pxToMm(mmToPx(mm, 300), 300);
    expect(mm).toBeCloseTo(90, 9);
  });

  it("converts A4 to PDF points", () => {
    expect(mmToPt(210)).toBeCloseTo(595.2756, 3);
    expect(mmToPt(297)).toBeCloseTo(841.8898, 3);
    expect(ptToMm(72)).toBeCloseTo(25.4, 9);
  });

  it("supports mm, cm, in and px", () => {
    expect(toMm(9, "cm", 300)).toBe(90);
    expect(toMm(1, "in", 300)).toBe(25.4);
    expect(toMm(300, "px", 300)).toBeCloseTo(25.4);
    expect(fromMm(25.4, "in", 300)).toBe(1);
    expect(fromMm(25.4, "px", 150)).toBeCloseTo(150);
    expect(formatUnit(90, "cm", 300)).toBe("9");
    expect(formatUnit(90, "in", 300)).toBe("3.543");
  });
});

describe("resolution checks", () => {
  it("computes effective DPI from source pixels and print size", () => {
    expect(effectiveDpi({ width: 1063, height: 709 }, { width: 90, height: 60 })).toBeCloseTo(300, 0);
  });

  it("case 9: a low-resolution image at its print size is flagged", () => {
    const report = resolutionReport({ width: 200, height: 133 }, null, { width: 90, height: 60 });
    expect(report.level).toBe("low");
    expect(report.effectiveDpi).toBeLessThan(150);
  });

  it("uses the cropped pixel count when cropping is enabled", () => {
    const full = resolutionReport({ width: 1000, height: 1000 }, null, { width: 50, height: 50 });
    const cropped = resolutionReport(
      { width: 1000, height: 1000 },
      { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 },
      { width: 50, height: 50 },
    );
    expect(cropped.effectiveDpi).toBeCloseTo(full.effectiveDpi / 2);
  });

  it("classifies quality bands", () => {
    expect(qualityForDpi(300)).toBe("high");
    expect(qualityForDpi(200)).toBe("acceptable");
    expect(qualityForDpi(100)).toBe("low");
    expect(effectiveDpi({ width: 10, height: 10 }, { width: 0, height: 10 })).toBe(0);
  });

  it("reports the largest print size at a DPI", () => {
    const size = maxPrintSizeAt({ width: 2480, height: 3508 }, 300);
    expect(size.width).toBeCloseTo(209.97, 1);
  });
});

describe("case 14: large canvas limits", () => {
  it("accepts A4 at 300 DPI under the Safari area limit", () => {
    expect(canvasSizeWithinLimits({ width: 2480, height: 3508 })).toBe(true);
  });
  it("rejects A4 at 600 DPI under the Safari limit but allows it in larger budgets", () => {
    expect(canvasSizeWithinLimits({ width: 4961, height: 7016 })).toBe(false);
    expect(canvasSizeWithinLimits({ width: 4961, height: 7016 }, 268_435_456)).toBe(true);
  });
  it("rejects any side over 16384 px", () => {
    expect(canvasSizeWithinLimits({ width: 20000, height: 10 }, 1e12)).toBe(false);
  });
});
