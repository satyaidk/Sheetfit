import { describe, expect, it } from "vitest";
import { DEMO_SHEETS, DEMO_MARGIN_MM, demoSheet, mm } from "@/lib/landing/sheet-demos";
import { parseEditorLink, productHref } from "@/lib/editor-link";
import { findProduct, slotSize } from "@/lib/catalogue/products";
import { rectContains, rectsOverlap } from "@/lib/layout/sheet-layout";

describe("home page demo sheets", () => {
  it("places every transfer inside the printable area, without overlaps", () => {
    for (const s of DEMO_SHEETS) {
      expect(s.unplaced, s.id).toEqual([]);
      for (const item of s.items) {
        expect(rectContains(s.printable, item), `${s.id} ${item.id}`).toBe(true);
        for (const other of s.items) {
          if (other !== item) expect(rectsOverlap(item, other), `${item.id} vs ${other.id}`).toBe(false);
        }
      }
      expect(s.utilisation).toBeGreaterThan(0.2);
      expect(s.utilisation).toBeLessThanOrEqual(1);
    }
  });

  it("uses real slot sizes and sheet sizes", () => {
    const a4 = demoSheet("sublimation-a4");
    expect([a4.width, a4.height]).toEqual([297, 210]);
    expect(a4.printable).toEqual({ x: DEMO_MARGIN_MM, y: DEMO_MARGIN_MM, width: 287, height: 200 });
    const mug = a4.items.find((i) => i.productId === "mug-11oz")!;
    expect(mug.width).toBeCloseTo(slotSize(findProduct("mug-11oz")!).width);
    expect(mug.height).toBeCloseTo(88.9);
    expect(mug.label).toBe("Mug 11 oz, full wrap");
    expect(a4.sheetName).toBe("A4, landscape");

    const gang = demoSheet("dtf-gang");
    expect(gang.process).toBe("dtf");
    expect(gang.gap).toBeCloseTo(6.35);
    expect(gang.width).toBeCloseTo(558.8);
    expect(gang.sheetName).toBe("DTF gang sheet 22 × 24 in");
  });

  it("formats sizes and falls back to the first sheet", () => {
    expect(mm(221.9, 88.9)).toBe("221.9 × 88.9 mm");
    expect(mm(101.25, 101.25)).toBe("101.3 × 101.3 mm");
    expect(demoSheet("nope").id).toBe(DEMO_SHEETS[0].id);
  });
});

describe("editor links", () => {
  it("opens the sample project", () => {
    expect(parseEditorLink("?sample")).toEqual({ kind: "sample" });
  });

  it("opens a known product, with a process it supports", () => {
    expect(parseEditorLink("?product=mug-11oz")).toEqual({ kind: "product", productId: "mug-11oz" });
    expect(parseEditorLink("?product=tee-full-front&process=dtf")).toEqual({ kind: "product", productId: "tee-full-front", process: "dtf" });
    // Mugs are sublimation only, so a DTF request is dropped rather than obeyed.
    expect(parseEditorLink("?product=mug-11oz&process=dtf")).toEqual({ kind: "product", productId: "mug-11oz" });
  });

  it("ignores unknown products", () => {
    expect(parseEditorLink("?product=rocket")).toEqual({ kind: "none" });
    expect(parseEditorLink("")).toEqual({ kind: "none" });
  });

  it("builds links that parse back", () => {
    expect(productHref("tee-full-front", "dtf")).toBe("/editor?product=tee-full-front&process=dtf");
    expect(parseEditorLink(productHref("tote").split("?")[1])).toEqual({ kind: "product", productId: "tote" });
  });
});

describe("product pictures", () => {
  it("has a rendered picture for every product in the catalogue", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { PRODUCTS } = await import("@/lib/catalogue/products");
    const { productPhotoSrc } = await import("@/components/products/ProductArt");
    for (const p of PRODUCTS) {
      const file = path.join(process.cwd(), "public", productPhotoSrc(p.id));
      expect(fs.existsSync(file), p.id).toBe(true);
      // WebP files start with "RIFF....WEBP".
      const head = fs.readFileSync(file).subarray(0, 12).toString("latin1");
      expect(head.startsWith("RIFF") && head.endsWith("WEBP"), p.id).toBe(true);
    }
  });
});

describe("product detail crops", () => {
  it("has a detail crop for every small placement", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { PRODUCTS } = await import("@/lib/catalogue/products");
    const { hasDetailPhoto } = await import("@/components/products/ProductArt");
    const small = PRODUCTS.filter(hasDetailPhoto);
    expect(small.map((p) => p.id)).toContain("tee-left-chest");
    for (const p of small) expect(fs.existsSync(path.join(process.cwd(), "public", "products", `${p.id}-detail.webp`)), p.id).toBe(true);
  });
});
