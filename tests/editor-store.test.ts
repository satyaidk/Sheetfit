import { beforeEach, describe, expect, it } from "vitest";
import { useEditor, defaultPrintSize, emptyDocument } from "@/store/editor-store";
import type { LoadedAsset } from "@/types/image";
import { designBounds, placementStatus, rectsOverlap } from "@/lib/layout/a4-layout";
import { computeImageRect } from "@/lib/image/image-fit";

function asset(id: string, w: number, h: number): LoadedAsset {
  return {
    id,
    name: `${id}.png`,
    mimeType: "image/png",
    naturalWidth: w,
    naturalHeight: h,
    sizeBytes: 1,
    hasAlpha: true,
    createdAt: 0,
    blob: new Blob([]),
    objectUrl: "blob:test",
    element: {} as HTMLImageElement,
  };
}

const s = () => useEditor.getState();

beforeEach(() => {
  useEditor.setState({ doc: emptyDocument(), assets: {}, selection: [], past: [], future: [], clipboard: [], lastLayoutReport: null });
});

describe("placing images", () => {
  it("uses the native size at 300 DPI and centres in the printable area", () => {
    s().addAsset(asset("a", 1063, 709));
    const id = s().placeAsset("a")!;
    const d = s().doc.designs[0];
    expect(d.id).toBe(id);
    expect(d.width).toBeCloseTo(90, 0);
    expect(d.height).toBeCloseTo(60, 0);
    expect(d.x + d.width / 2).toBeCloseTo(105);
    expect(s().selection).toEqual([id]);
  });

  it("caps very large images to the printable area without cropping", () => {
    const big = asset("b", 12000, 3000);
    const size = defaultPrintSize(big, { width: 200, height: 287 });
    expect(size.width).toBeCloseTo(200);
    expect(size.height).toBeCloseTo(50);
  });

  it("case 5: an explicit 90 × 60 box keeps the whole square logo", () => {
    s().addAsset(asset("sq", 1000, 1000));
    s().placeAsset("sq", { width: 90, height: 60 });
    const d = s().doc.designs[0];
    expect(d.lockAspect).toBe(false);
    expect(computeImageRect(d, { width: 1000, height: 1000 })).toEqual({ x: 15, y: 0, width: 60, height: 60 });
  });
});

describe("history", () => {
  it("undoes and redoes document changes", () => {
    s().addAsset(asset("a", 1000, 1000));
    const id = s().placeAsset("a")!;
    s().moveDesigns([{ id, x: 20, y: 30 }]);
    expect(s().doc.designs[0].x).toBe(20);
    s().undo();
    expect(s().doc.designs[0].x).not.toBe(20);
    s().redo();
    expect(s().doc.designs[0].x).toBe(20);
    s().undo();
    s().undo();
    expect(s().doc.designs).toHaveLength(0);
    expect(s().selection).toEqual([]);
  });
});

describe("editing", () => {
  beforeEach(() => {
    s().addAsset(asset("a", 1500, 1000));
    s().placeAsset("a", { width: 90, height: 60 });
  });
  const d = () => s().doc.designs[0];

  it("derives height from the image when the aspect lock is on", () => {
    s().updateDesign(d().id, { lockAspect: true });
    s().resizeDesign(d().id, { width: 150 });
    expect(d().height).toBeCloseTo(100);
  });

  it("fit-width derives the box height from the image", () => {
    s().updateDesign(d().id, { width: 120 });
    s().setFitMode(d().id, "fit-width");
    expect(d().height).toBeCloseTo(80);
  });

  it("nudges, duplicates and pastes with offsets", () => {
    const x = d().x;
    s().nudgeSelection(1, 0);
    expect(d().x).toBeCloseTo(x + 1);
    s().duplicateSelection();
    expect(s().doc.designs).toHaveLength(2);
    s().copySelection();
    s().paste();
    expect(s().doc.designs).toHaveLength(3);
    expect(s().doc.designs[2].x).toBeCloseTo(s().doc.designs[1].x + 5);
  });

  it("selecting one member of a group selects the whole group", () => {
    s().duplicateSelection();
    s().selectAll();
    s().groupSelection();
    s().select([s().doc.designs[0].id]);
    expect(s().selection).toHaveLength(2);
    s().ungroupSelection();
    s().select([s().doc.designs[0].id]);
    expect(s().selection).toHaveLength(1);
  });

  it("centres the selection on the printable area", () => {
    s().moveDesigns([{ id: d().id, x: 10, y: 10 }]);
    s().centerSelection();
    expect(d().x).toBeCloseTo((210 - 90) / 2);
    expect(d().y).toBeCloseTo((297 - 60) / 2);
  });
});

describe("multi-design layout", () => {
  it("repeats a design into a grid and reports copies that do not fit", () => {
    s().addAsset(asset("a", 1000, 1000));
    const id = s().placeAsset("a", { width: 50, height: 50 })!;
    const ok = s().repeatDesign(id, 12);
    expect(ok.unplaced).toBe(0);
    expect(s().doc.designs).toHaveLength(12);
    const tooMany = s().repeatDesign(id, 40);
    expect(tooMany.placed).toBeLessThan(40);
    expect(tooMany.unplaced).toBe(40 - tooMany.placed);
    // Never resized to make them fit.
    expect(s().doc.designs.every((d) => d.width === 50 && d.height === 50)).toBe(true);
  });

  it("auto-arranges mixed sizes without overlap inside the printable area", () => {
    s().addAsset(asset("a", 1000, 1000));
    for (const [w, h] of [[90, 60], [100, 150], [50, 50], [85.6, 54]]) s().placeAsset("a", { width: w, height: h });
    const report = s().autoArrange("all");
    expect(report.unplaced).toBe(0);
    const designs = s().doc.designs;
    for (let i = 0; i < designs.length; i++) {
      expect(placementStatus(designs[i], s().doc.page).exceedsPrintable).toBe(false);
      for (let j = i + 1; j < designs.length; j++) {
        expect(rectsOverlap(designBounds(designs[i]), designBounds(designs[j]))).toBe(false);
      }
    }
  });
});

describe("more store actions", () => {
  beforeEach(() => {
    s().addAsset(asset("a", 1000, 1000));
    s().placeAsset("a", { width: 40, height: 40 });
    s().placeAsset("a", { width: 60, height: 30 });
  });
  const designs = () => s().doc.designs;

  it("aligns a selection to the printable area, the page and each other", () => {
    s().selectAll();
    s().alignSelection("left", "printable");
    expect(Math.min(...designs().map((d) => d.x))).toBeCloseTo(5);
    s().alignSelection("top", "page");
    expect(Math.min(...designs().map((d) => d.y))).toBeCloseTo(0);
    s().alignSelection("right", "selection");
    const rights = designs().map((d) => d.x + d.width);
    expect(rights[0]).toBeCloseTo(rights[1]);
  });

  it("reorders layers", () => {
    const [first, second] = designs().map((d) => d.id);
    expect(designs().map((d) => d.id)).toEqual([first, second]);
    s().bringForward(first, true);
    expect(designs()[1].id).toBe(first);
    s().sendBackward(first, true);
    expect(designs()[0].id).toBe(first);
    s().bringForward(first);
    expect(designs().map((d) => d.id)).toEqual([second, first]);
    s().sendBackward(first);
    expect(designs().map((d) => d.id)).toEqual([first, second]);
  });

  it("resets a design to the whole image with no rotation or crop", () => {
    const id = designs()[1].id;
    s().updateDesign(id, { rotation: 30, crop: { top: 0.1, right: 0, bottom: 0, left: 0 }, fitMode: "stretch" });
    s().resetDesign(id);
    const d = designs()[1];
    expect(d).toMatchObject({ rotation: 0, crop: null, fitMode: "contain", lockAspect: true });
    expect(d.width).toBeCloseTo(d.height);
  });

  it("replaces an image but keeps the box and position", () => {
    const before = designs()[0];
    s().replaceAsset(before.id, asset("b", 2000, 1000));
    const after = designs()[0];
    expect(after.assetId).toBe("b");
    expect(after.x).toBe(before.x);
    expect(after.width).toBe(before.width);
  });

  it("deletes and cuts unused assets", () => {
    s().addAsset(asset("unused", 10, 10));
    s().selectAll();
    s().deleteSelection();
    expect(designs()).toHaveLength(0);
    useEditor.setState({ past: [] });
    s().removeUnusedAssets();
    expect(Object.keys(s().assets)).toEqual([]);
  });

  it("changes page settings with undo, and fits the view", () => {
    s().setViewport({ width: 1000, height: 800 });
    s().setPage({ orientation: "landscape" });
    expect(s().doc.page.orientation).toBe("landscape");
    expect(s().zoom).toBeGreaterThan(0);
    s().zoomTo(2, { x: 0, y: 0 });
    expect(s().zoom).toBe(2);
    s().zoomTo(100);
    expect(s().zoom).toBe(8);
    s().undo();
    expect(s().doc.page.orientation).toBe("portrait");
  });

  it("starts a new project and loads saved state", () => {
    s().setProjectName("Mugs");
    expect(s().project.dirty).toBe(true);
    s().markSaved(123);
    expect(s().project).toMatchObject({ dirty: false, savedAt: 123 });
    const doc = structuredClone(s().doc);
    s().newProject();
    expect(designs()).toHaveLength(0);
    s().loadState({ doc, assets: {}, project: { id: "p", name: "Back", savedAt: 1, dirty: false, createdAt: 0 } });
    expect(designs()).toHaveLength(2);
    expect(s().past).toEqual([]);
  });

  it("selects by toggling and clears", () => {
    const [a, b] = designs().map((d) => d.id);
    s().select([a]);
    s().select([b], "toggle");
    expect(s().selection).toEqual([a, b]);
    s().select([a], "toggle");
    expect(s().selection).toEqual([b]);
    s().select([a], "add");
    expect(s().selection).toHaveLength(2);
    s().clearSelection();
    expect(s().selection).toEqual([]);
  });

  it("auto-arranges only the selection and reports overflow", () => {
    for (let i = 0; i < 6; i++) s().placeAsset("a", { width: 130, height: 60 });
    s().selectAll();
    const report = s().autoArrange("selection");
    expect(report.unplaced).toBeGreaterThan(0);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });
});
