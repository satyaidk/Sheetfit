import type { Design, EditorDocument, PageSettings } from "@/types/editor";
import type { ImageAsset } from "@/types/image";

export function makePage(overrides: Partial<PageSettings> = {}): PageSettings {
  return {
    sheet: "a4",
    customSize: null,
    process: "dtf",
    mirrorMode: "auto",
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
    spacing: 5,
    pairGap: 5,
    guides: { cutlines: false, centreMarks: false, registration: false, registrationSize: 5 },
    sheetCut: false,
    // Pre-v0.10 behaviour unless a test opts in: no printed cutting line, no painted border.
    cutMethod: "file",
    cutGuide: { color: "#000000", width: 0.25, placement: "inside" },
    borderFill: null,
    ...overrides,
  };
}

export function makeDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "d1",
    name: "Logo",
    assetId: "a1",
    productId: null,
    productColor: null,
    bleed: 0,
    flipX: false,
    flipY: false,
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
    view: null,
    lockRotation: false,
    side: null,
    pairId: null,
    cut: null,
    strap: null,
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
