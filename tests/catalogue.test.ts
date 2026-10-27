import { describe, expect, it } from "vitest";
import { findSheet, SHEETS, smallestSheetFor } from "@/lib/catalogue/sheets";
import { findProduct, minSheetFor, PRODUCTS, searchProducts, slotSize, WRAP_SEAM_MM } from "@/lib/catalogue/products";
import { pageSize, printableRect } from "@/lib/layout/sheet-layout";
import { makePage } from "./fixtures";

describe("sheets", () => {
  it("defines exact paper sizes in mm", () => {
    expect(findSheet("a4")).toMatchObject({ width: 210, height: 297 });
    expect(findSheet("a3")).toMatchObject({ width: 297, height: 420 });
    expect(findSheet("letter")!.width).toBeCloseTo(215.9);
    expect(findSheet("legal")!.height).toBeCloseTo(355.6);
    expect(findSheet("a3plus")!.width).toBeCloseTo(330.2);
    expect(findSheet("dtf-22x24")!.width).toBeCloseTo(558.8);
  });

  it("has unique ids", () => {
    expect(new Set(SHEETS.map((s) => s.id)).size).toBe(SHEETS.length);
  });

  it("resolves page size for presets, orientation and custom sheets", () => {
    expect(pageSize(makePage({ sheet: "a3", orientation: "landscape" }))).toEqual({ width: 420, height: 297 });
    expect(pageSize(makePage({ sheet: "custom", customSize: { width: 300, height: 100 } }))).toEqual({ width: 100, height: 300 });
    expect(pageSize(makePage({ sheet: "unknown" }))).toEqual({ width: 210, height: 297 });
    expect(printableRect(makePage({ sheet: "a3" })).width).toBe(277);
  });

  it("finds the smallest sheet that fits, in either orientation", () => {
    expect(smallestSheetFor({ width: 216, height: 89 })!.id).toBe("a4");
    expect(smallestSheetFor({ width: 279.4, height: 279.4 })!.id).toBe("a3");
    expect(smallestSheetFor({ width: 321, height: 148 })!.id).toBe("legal");
    expect(smallestSheetFor({ width: 305, height: 356 })!.id).toBe("a3plus");
    expect(smallestSheetFor({ width: 520, height: 110 })).toBeNull();
  });
});

describe("product catalogue", () => {
  it("has unique ids and valid sizes and sources", () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    for (const p of PRODUCTS) {
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
      expect(p.source).toMatch(/^https:\/\//);
      expect(p.processes.length).toBeGreaterThan(0);
    }
  });

  it("matches the researched sizes", () => {
    expect(findProduct("mug-11oz")).toMatchObject({ width: 215.9, height: 88.9 });
    expect(findProduct("card-cr80")).toMatchObject({ width: 85.6, height: 53.98 });
    expect(findProduct("tee-full-front")).toMatchObject({ width: 279.4, height: 279.4 });
  });

  it("adds seam overlap to wraps and bleed to flat goods", () => {
    const mug = findProduct("mug-11oz")!;
    expect(slotSize(mug)).toEqual({ width: 215.9 + WRAP_SEAM_MM, height: 88.9, bleed: 0 });
    const coaster = findProduct("coaster-square")!;
    expect(slotSize(coaster)).toEqual({ width: 101.6 + 6, height: 101.6 + 6, bleed: 3 });
  });

  it("flags products that need a bigger sheet than A4", () => {
    expect(minSheetFor(findProduct("mug-11oz")!)!.id).toBe("a4");
    expect(minSheetFor(findProduct("tumbler-30oz")!)!.id).toBe("a3");
    expect(minSheetFor(findProduct("tumbler-40oz-top")!)!.id).toBe("legal");
    expect(minSheetFor(findProduct("tee-full-back")!)!.id).toBe("a3plus");
  });

  it("searches by name, detail and group, filtered by process", () => {
    expect(searchProducts("mug").every((p) => /mug/i.test(p.name))).toBe(true);
    expect(searchProducts("chest").map((p) => p.id)).toContain("tee-left-chest");
    expect(searchProducts("", "dtf").every((p) => p.processes.includes("dtf"))).toBe(true);
    expect(searchProducts("tumbler", "dtf")).toEqual([]);
  });
});
