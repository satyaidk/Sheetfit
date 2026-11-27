/**
 * v0.9 catalogue schema, sourced additions and the lanyard roll strip layout.
 */

import { describe, expect, it } from "vitest";
import { PRODUCTS, findProduct, searchProducts, sidesOf, slotSize } from "@/lib/catalogue/products";
import { cutPaths, pathsBounds } from "@/lib/cut/cut-path";
import { loadStripProfiles, planStrip, saveStripProfiles, stripSegmentDesign, validateStrip, type StripProfile } from "@/lib/layout/strip-layout";
import { pageSize } from "@/lib/layout/sheet-layout";
import { makeDesign } from "./fixtures";

describe("catalogue schema", () => {
  it("has unique ids and valid, sourced entries", () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    for (const p of PRODUCTS) {
      expect(p.width, p.id).toBeGreaterThan(0);
      expect(p.height, p.id).toBeGreaterThan(0);
      expect(p.processes.length, p.id).toBeGreaterThan(0);
      expect(() => new URL(p.source), p.id).not.toThrow();
      expect(new URL(p.source).protocol, p.id).toBe("https:");
      expect(["high", "medium", "low"]).toContain(p.confidence);
      if (p.sides !== undefined) expect([1, 2]).toContain(p.sides);
      if (p.cornerRadius !== undefined) expect(p.cornerRadius, p.id).toBeLessThanOrEqual(Math.min(p.width, p.height) / 2);
      if (p.checked) expect(p.checked, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps stickers out of sublimation and sublimation blanks out of stickers", () => {
    for (const p of PRODUCTS) {
      if (p.group === "sticker") expect(p.processes, p.id).toEqual(["sticker"]);
      else expect(p.processes, p.id).not.toContain("sticker");
    }
  });

  it("records supplier, code and date for every product added in v0.9", () => {
    // v0.9 additions were checked on 2026-11-23 (v0.10 additions have their own test).
    const added = PRODUCTS.filter((p) => p.supplier && p.checked === "2026-11-23");
    expect(added.length).toBeGreaterThanOrEqual(15);
    for (const p of added) {
      expect(p.sku, p.id).toBeTruthy();
      expect(p.material, p.id).toBeTruthy();
      expect(p.checked, p.id).toBe("2026-11-23");
    }
  });

  it("uses the sizes printed on the source pages", () => {
    const size = (id: string) => [findProduct(id)!.width, findProduct(id)!.height];
    expect(size("keyring-rect-32x76")).toEqual([32, 76]);
    expect(size("keyring-oval-63x35")).toEqual([63, 35]);
    expect(size("pet-tag-bone-38x25")).toEqual([38, 25]);
    expect(size("id-tag-alu")).toEqual([31.7, 50.8]);
    expect(size("luggage-tag-round-100")).toEqual([100, 100]);
    expect(size("plate-mini")).toEqual([149, 74]);
    expect(size("name-badge-2x3").map((v) => +(v / 25.4).toFixed(3))).toEqual([3, 2]);
    const card = findProduct("card-cr80")!;
    expect([card.width, card.height, card.cornerRadius, sidesOf(card)]).toEqual([85.6, 53.98, 3.18, 2]);
  });

  it("models sides explicitly and never assumes two", () => {
    expect(sidesOf(findProduct("pet-tag-circle-31"))).toBe(1);
    expect(sidesOf(findProduct("luggage-tag-70x100"))).toBe(2);
    expect(sidesOf(findProduct("mug-11oz"))).toBe(1);
    expect(sidesOf(undefined)).toBe(1);
  });

  it("gives round blanks an elliptical cut and a slot that includes bleed", () => {
    const p = findProduct("pet-tag-circle-31")!;
    const slot = slotSize(p);
    expect(slot).toEqual({ width: 34, height: 34, bleed: 1.5 });
    const d = makeDesign({ productId: p.id, ...slot });
    expect(pathsBounds(cutPaths(d))).toMatchObject({ width: 31, height: 31 });
  });

  it("finds products by synonyms without duplicate records", () => {
    const ids = (q: string) => searchProducts(q).map((p) => p.id);
    expect(ids("keyring")).toEqual(expect.arrayContaining(["keychain-round", "keyring-square-57"]));
    expect(ids("bag tag")).toEqual(expect.arrayContaining(["luggage-tag", "luggage-tag-44x88"]));
    expect(ids("dog tag")).toEqual(expect.arrayContaining(["pet-tag-bone-38x25", "id-tag-alu"]));
    expect(ids("cr80")).toEqual(["card-cr80"]);
    expect(ids("20UNI05917".toLowerCase())).toEqual(["keyring-oval-63x35"]);
    expect(searchProducts("", "sticker").every((p) => p.group === "sticker")).toBe(true);
  });
});

describe("lanyard ribbon strip layout", () => {
  const profile: StripProfile = { name: "test", rollWidth: 25, printableWidth: 20, segmentLength: 450, repeatGap: 0, endZone: 15, leadIn: 10, origin: "user" };

  it("requires every size from the user and checks they are consistent", () => {
    expect(validateStrip({}, 10, 1000).map((p) => p.field)).toEqual(expect.arrayContaining(["rollWidth", "printableWidth", "segmentLength"]));
    expect(validateStrip({ ...profile, printableWidth: 30 }, 10, 1000)[0].field).toBe("printableWidth");
    expect(validateStrip({ ...profile, endZone: 300 }, 10, 1000)[0].field).toBe("endZone");
    expect(validateStrip(profile, 0, 1000)[0].field).toBe("count");
    expect(validateStrip(profile, 5, 100)[0].field).toBe("sectionLength");
    expect(validateStrip(profile, 5, 1000)).toEqual([]);
    // 105 straps of 450 mm in 1 m sections would be 53 pages: refused, not created.
    expect(validateStrip(profile, 105, 1000)[0].message).toMatch(/53 pages; the limit is 50/);
  });

  it("repeats straps along the ribbon, page = ribbon, split into sections", () => {
    const sections = planStrip(profile, 5, 1000);
    // (1000 − 2 × 10) / 450 → 2 straps per section: 2 + 2 + 1.
    expect(sections.map((s) => s.segments.length)).toEqual([2, 2, 1]);
    const size = pageSize(sections[0].page);
    expect(size).toEqual({ width: 25, height: 10 + 2 * 450 + 10 });
    expect(sections[0].segments[1]).toEqual({ x: 2.5, y: 460, width: 20, height: 450 });
    const one = planStrip({ ...profile, repeatGap: 5 }, 3, Infinity);
    expect(one).toHaveLength(1);
    expect(one[0].segments.map((s) => s.y)).toEqual([10, 465, 920]);
  });

  it("handles strips shorter than the ribbon is wide", () => {
    const short = planStrip({ ...profile, rollWidth: 60, printableWidth: 50, segmentLength: 20, leadIn: 0 }, 1, Infinity);
    expect(pageSize(short[0].page)).toEqual({ width: 60, height: 20 });
  });

  it("gives each strap a cut guide and an end zone, and saves only valid custom profiles", () => {
    expect(stripSegmentDesign(profile, "keychain-wristlet", 0)).toMatchObject({ name: "Keychain wristlet strap 1", cut: { safeInset: 15 } });
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(saveStripProfiles(storage, [profile])).toBe(true);
    expect(loadStripProfiles(storage)).toEqual([profile]);
    store.set("sheetfit:strip-profiles", JSON.stringify([{ name: "bad", rollWidth: -1 }]));
    expect(loadStripProfiles(storage)).toEqual([]);
    store.set("sheetfit:strip-profiles", "{not json");
    expect(loadStripProfiles(storage)).toEqual([]);
    expect(loadStripProfiles(undefined)).toEqual([]);
  });
});
