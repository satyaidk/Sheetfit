import type { Design, EditorDocument, PageSettings } from "@/types/editor";
import type { ImageAsset } from "@/types/image";

export function makePage(overrides: Partial<PageSettings> = {}): PageSettings {
  return {
    paper: "A4",
    orientation: "portrait",
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    background: "#ffffff",
    dpi: 300,
    showGrid: false,
    snapToGrid: false,
    gridSize: 5,
    snapToGuides: true,
    constrainToPrintable: false,
    cropMarks: false,
    ...overrides,
  };
}

export function makeDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "d1",
    name: "Logo",
    assetId: "a1",
    x: 0,
    y: 0,
    width: 90,
    height: 60,
    rotation: 0,
    fitMode: "contain",
    alignX: "center",
    alignY: "center",
    padding: 0,
    fillColor: null,
    lockAspect: true,
    border: false,
    crop: null,
    groupId: null,
    locked: false,
    ...overrides,
  };
}

export function makeAsset(overrides: Partial<ImageAsset> = {}): ImageAsset {
  return {
    id: "a1",
    name: "logo.png",
    mimeType: "image/png",
    naturalWidth: 1000,
    naturalHeight: 1000,
    sizeBytes: 1234,
    hasAlpha: true,
    createdAt: 0,
    ...overrides,
  };
}

export function makeDoc(designs: Design[], page: Partial<PageSettings> = {}): EditorDocument {
  return { page: makePage(page), designs };
}

/** A valid 1 × 1 transparent PNG. */
export const TINY_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);
