import { beforeEach, describe, expect, it } from "vitest";
import { allPages, useEditor } from "@/store/editor-store";
import { changeSheet, hasWorkToLose, openProductDesign, proceedWith, requestProduct } from "@/lib/editor-actions";
import { designBounds, printableRect } from "@/lib/layout/sheet-layout";
import type { LoadedAsset } from "@/types/image";
import { makeAsset } from "./fixtures";

const s = () => useEditor.getState();

function asset(id: string): LoadedAsset {
  return { ...makeAsset({ id }), blob: new Blob([]), objectUrl: "blob:" + id, element: {} as HTMLImageElement };
}

beforeEach(() => {
  s().newProject();
  useEditor.setState({ leaveIntent: null, dialog: null, viewport: { width: 1200, height: 800 } });
});

describe("a product design", () => {
  it("opens on the sheet the product needs, with the box at the top centre and selected", () => {
    openProductDesign("tee-full-front");
    const { doc, selection, project } = s();
    expect(doc.page.sheet).toBe("a3");
    expect(doc.designs).toHaveLength(1);
    const d = doc.designs[0];
    expect(d).toMatchObject({ productId: "tee-full-front", assetId: null });
    expect(selection).toEqual([d.id]);
    expect(project).toMatchObject({ name: "T-shirt, Full front 11 × 11 in", dirty: false });
    const area = printableRect(doc.page);
    const b = designBounds(d);
    expect(b.x + b.width / 2).toBeCloseTo(area.x + area.width / 2);
    expect(b.y).toBeCloseTo(area.y);
    expect(s().past).toEqual([]);
  });

  it("keeps the chosen sheet when it is big enough, and the process the product supports", () => {
    openProductDesign("mug-11oz", { process: "dtf", sheet: "a3" });
    // Mugs are sublimation only, so the process falls back to sublimation (mirrored).
    expect(s().doc.page).toMatchObject({ sheet: "a3", process: "sublimation", mirrorOutput: true });
    openProductDesign("cap-front", { process: "dtf" });
    expect(s().doc.page).toMatchObject({ process: "dtf", mirrorOutput: false, sheet: "a4" });
  });

  it("replaces an untouched product design without asking", () => {
    openProductDesign("tee-full-front");
    expect(hasWorkToLose()).toBe(false);
    requestProduct("mug-11oz");
    expect(s().leaveIntent).toBeNull();
    expect(allPages(s()).flatMap((d) => d.designs).map((d) => d.productId)).toEqual(["mug-11oz"]);
  });

  it("asks before replacing a design that has an image, and never merges the two", () => {
    openProductDesign("tee-full-front");
    s().addAsset(asset("art"));
    s().fillSlot(s().doc.designs[0].id, "art");
    expect(hasWorkToLose()).toBe(true);
    requestProduct("mug-11oz");
    expect(s().leaveIntent).toEqual({ kind: "product", productId: "mug-11oz" });
    // Nothing changed yet.
    expect(s().doc.designs.map((d) => d.productId)).toEqual(["tee-full-front"]);
    proceedWith(s().leaveIntent!);
    expect(s().leaveIntent).toBeNull();
    expect(allPages(s()).flatMap((d) => d.designs).map((d) => d.productId)).toEqual(["mug-11oz"]);
  });

  it("asks for other replacements too, and opens the start dialog after", () => {
    s().addAsset(asset("art"));
    s().placeAsset("art", { width: 50, height: 50 });
    proceedWith({ kind: "start" });
    expect(s().dialog).toBe("start");
  });
});

describe("sheet dropdown", () => {
  it("changes the page sheet with undo, and sends Custom to the sheet dialog", () => {
    changeSheet("a3");
    expect(s().doc.page.sheet).toBe("a3");
    s().undo();
    expect(s().doc.page.sheet).toBe("a4");
    changeSheet("custom");
    expect(s().dialog).toBe("sheet");
    expect(s().doc.page.sheet).toBe("a4");
  });

  it("reserves room for the preview dock when fitting the page", () => {
    s().fitPage();
    const wide = s().zoom;
    s().setRightInset(248);
    expect(s().rightInset).toBe(248);
    expect(s().zoom).toBeLessThanOrEqual(wide);
  });
});
