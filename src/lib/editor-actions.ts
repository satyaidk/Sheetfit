/**
 * Use-case functions that combine the store with browser services.
 *
 * Components call these instead of talking to IndexedDB, file decoding or
 * exporters directly. Each function reads the current store state when it
 * runs, so it is safe to call from event handlers and keyboard shortcuts.
 */

import { toast } from "sonner";
import { allPages, makeDesign, PREVIEW_DOCK_MIN_CANVAS, PREVIEW_DOCK_PX, useEditor, type LeaveIntent } from "@/store/editor-store";
import type { PrintProcess } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import type { ProjectRecord } from "@/types/project";
import { ImageLoadError, LARGE_IMAGE_MEGAPIXELS, loadAssetFromBlob, loadAssetFromFile, megapixels } from "@/lib/image/image-loader";
import { buildRenderPlan } from "@/lib/render/render-plan";
import { downloadBlob, renderPreviewDataUrl } from "@/lib/export/export-raster";
import { parseProjectFile, PROJECT_FILE_EXTENSION, ProjectFileError, serializeProject } from "@/lib/storage/project-file";
import { loadProject, saveProject, StorageError } from "@/lib/storage/project-storage";
import { migratePages } from "@/lib/storage/migrate";
import { findProduct, slotSize } from "@/lib/catalogue/products";
import { renderSampleSvg, svgDataUrl, type SampleDesign } from "@/lib/catalogue/sample-designs";
import { placementStatus, printableRect, sheetLabel } from "@/lib/layout/sheet-layout";
import { pageFor } from "@/lib/layout/product-placement";
import { findSheet } from "@/lib/catalogue/sheets";

/** Drag-and-drop type for images dragged from the Uploads panel onto the canvas. */
export const ASSET_DRAG_TYPE = "application/x-sheetfit-asset";

function assetMap(): Map<string, LoadedAsset> {
  return new Map(Object.entries(useEditor.getState().assets));
}

export function currentPlan() {
  const { doc, assets } = useEditor.getState();
  return buildRenderPlan(doc, assets);
}

/** Decode files, add them as assets and place each on the sheet. */
export async function uploadFiles(files: Iterable<File>, options: { place?: boolean; at?: { x: number; y: number } } = {}) {
  const place = options.place ?? true;
  const placed: string[] = [];
  for (const file of files) {
    try {
      const asset = await loadAssetFromFile(file);
      useEditor.getState().addAsset(asset);
      if (megapixels(asset) > LARGE_IMAGE_MEGAPIXELS) {
        toast.warning(`${asset.name} is ${megapixels(asset).toFixed(0)} megapixels`, {
          description: "Large images can make editing and export slower.",
        });
      }
      if (place && options.at) {
        // Dropped files land centred on the drop point, cascading slightly.
        const offset = placed.length * 6;
        placeAssetAt(asset.id, { x: options.at.x + offset, y: options.at.y + offset });
        const sel = useEditor.getState().selection;
        if (sel[0]) placed.push(sel[0]);
      } else if (place) {
        const id = useEditor.getState().placeAsset(asset.id);
        if (id) placed.push(id);
      }
    } catch (error) {
      toast.error(error instanceof ImageLoadError ? error.message : `${file.name} could not be opened.`);
    }
  }
  if (placed.length > 1) useEditor.getState().select(placed);
  return placed;
}

export async function replaceDesignImage(designId: string, file: File) {
  try {
    const asset = await loadAssetFromFile(file);
    useEditor.getState().replaceAsset(designId, asset);
    toast.success("Image replaced", { description: "Size, position and page settings were kept." });
  } catch (error) {
    toast.error(error instanceof ImageLoadError ? error.message : "The image could not be replaced.");
  }
}

function makeThumbnail(): string | null {
  try {
    const state = useEditor.getState();
    // The project list shows the first page, like Canva.
    return renderPreviewDataUrl(buildRenderPlan(allPages(state)[0], state.assets), assetMap(), 240, "image/jpeg");
  } catch {
    return null;
  }
}

/** Snapshot the current editor state (every page) as a storable project record. */
function currentProjectRecord(now: number): { record: ProjectRecord; blobs: Map<string, Blob> } {
  const state = useEditor.getState();
  const pages = structuredClone(allPages(state));
  const usedIds = new Set(pages.flatMap((p) => p.designs).map((d) => d.assetId));
  const assets = Object.values(state.assets).filter((a) => usedIds.has(a.id));
  const record: ProjectRecord = {
    id: state.project.id,
    name: state.project.name.trim() || "Untitled sheet",
    createdAt: state.project.createdAt,
    updatedAt: now,
    document: pages[0],
    pages,
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      mimeType: a.mimeType,
      naturalWidth: a.naturalWidth,
      naturalHeight: a.naturalHeight,
      sizeBytes: a.sizeBytes,
      hasAlpha: a.hasAlpha,
      createdAt: a.createdAt,
    })),
    thumbnail: makeThumbnail(),
  };
  return { record, blobs: new Map(assets.map((a) => [a.id, a.blob])) };
}

export async function saveCurrentProject(): Promise<boolean> {
  const now = Date.now();
  const { record, blobs } = currentProjectRecord(now);
  try {
    await saveProject(record, blobs);
    useEditor.getState().markSaved(now);
    toast.success("Project saved", { description: "Stored in this browser only." });
    return true;
  } catch (error) {
    toast.error(error instanceof StorageError ? error.message : "The project could not be saved.");
    return false;
  }
}

/** Download the sheet as a portable `.sheetfit` file with its original images. */
export async function exportProjectFile(filename: string) {
  const { record, blobs } = currentProjectRecord(Date.now());
  const text = await serializeProject(record, blobs);
  downloadBlob(new Blob([text], { type: "application/json" }), filename + PROJECT_FILE_EXTENSION);
  toast.success("Project file exported", { description: "Open it later from Projects to keep editing." });
}

export async function importProjectFile(file: File): Promise<boolean> {
  try {
    const { record, blobs } = parseProjectFile(await file.text());
    await applyLoadedProject(record, blobs, { dirty: true });
    toast.success("Opened " + record.name, { description: "Save it to keep it in this browser." });
    return true;
  } catch (error) {
    toast.error(error instanceof ProjectFileError ? error.message : file.name + " could not be opened.");
    return false;
  }
}

async function applyLoadedProject(record: ProjectRecord, blobs: Map<string, Blob>, options: { dirty: boolean }) {
  const assets: Record<string, LoadedAsset> = {};
  const missing: string[] = [];
  for (const meta of record.assets) {
    const blob = blobs.get(meta.id);
    if (!blob) {
      missing.push(meta.name);
      continue;
    }
    assets[meta.id] = await loadAssetFromBlob(blob, meta);
  }
  // Designs whose image is gone cannot be drawn; drop them visibly. Empty slots stay.
  const pages = migratePages(record).map((doc) => ({
    ...doc,
    designs: doc.designs.filter((d) => !d.assetId || assets[d.assetId]),
  }));
  useEditor.getState().loadState({
    doc: pages[0],
    pages,
    assets,
    project: {
      id: record.id,
      name: record.name,
      savedAt: options.dirty ? null : record.updatedAt,
      dirty: options.dirty,
      createdAt: record.createdAt,
    },
  });
  if (missing.length > 0) toast.warning("Some images were missing and were skipped: " + missing.join(", "));
}

export async function openProject(id: string): Promise<boolean> {
  try {
    const loaded = await loadProject(id);
    if (!loaded) {
      toast.error("That project no longer exists.");
      return false;
    }
    await applyLoadedProject(loaded.record, loaded.blobs, { dirty: false });
    return true;
  } catch (error) {
    toast.error(error instanceof StorageError ? error.message : "The project could not be opened.");
    return false;
  }
}

/**
 * Add a product template. It goes on the current page when it fits there;
 * otherwise it gets a new page with the sheet it needs, so other designs are
 * never moved to a different sheet (see `lib/layout/product-placement.ts`).
 */
export function addProduct(productId: string) {
  const product = findProduct(productId);
  if (!product) return;
  const result = useEditor.getState().addProductSlot(productId);
  if (!result.designId) return;
  const label = `${product.name}, ${product.detail}`;
  const page = useEditor.getState().doc.page;
  const sheet = sheetLabel(page);
  const hint = "Drop an image on it, or pick one from Uploads or Designs.";
  if (result.newPage) {
    const why =
      result.reason === "process"
        ? `It is printed with ${page.process === "dtf" ? "DTF" : "sublimation"}, so it has its own page.`
        : result.reason === "sheet-full"
          ? "The current page is full."
          : `It needs ${sheet}; your other pages keep their sheets.`;
    toast(`${label} added on page ${result.pageNumber} (${sheet})`, {
      description: why,
      action: { label: "Delete page", onClick: () => useEditor.getState().deletePage(result.pageNumber - 1) },
    });
  } else if (result.reason === "page-adjusted") {
    toast(`${label} added`, { description: `This page was set to ${sheet} ${page.orientation} to hold it. ${hint}` });
  } else {
    toast(`${label} added`, { description: hint });
  }
}

/** Rasterise a sample design to a PNG asset at print resolution for `size` (mm). */
export async function sampleDesignAsset(design: SampleDesign, size: { width: number; height: number }) {
  const aspect = size.width / size.height;
  const svg = renderSampleSvg(design, aspect);
  // 300 DPI at the target size, capped so very long wraps stay fast.
  const longMm = Math.max(size.width, size.height);
  const longPx = Math.min(4800, Math.max(1200, Math.round((longMm / 25.4) * 300)));
  const w = aspect >= 1 ? longPx : Math.round(longPx * aspect);
  const h = aspect >= 1 ? Math.round(longPx / aspect) : longPx;
  const img = new Image();
  img.src = svgDataUrl(svg);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The design could not be drawn."))), "image/png"),
  );
  return loadAssetFromBlob(blob, { name: `${design.name}.png`, mimeType: "image/png" });
}

/**
 * Use a sample design: fill `targetId` or the selected product box (drawn at
 * that box's shape), or else place it on the page.
 */
export async function applySampleDesign(design: SampleDesign, targetId?: string) {
  const state = useEditor.getState();
  const pickId = targetId ?? (state.selection.length === 1 ? state.selection[0] : undefined);
  const selected = pickId ? state.doc.designs.find((d) => d.id === pickId) : undefined;
  const target = selected && (!selected.assetId || selected.productId) ? selected : undefined;
  const product = findProduct(target?.productId);
  const size = target
    ? { width: target.width, height: target.height }
    : product
      ? slotSize(product)
      : { width: 80, height: 80 };
  try {
    const asset = await sampleDesignAsset(design, size);
    useEditor.getState().addAsset(asset);
    if (target) {
      useEditor.getState().fillSlot(target.id, asset.id);
      useEditor.getState().select([target.id]);
    } else {
      useEditor.getState().placeAsset(asset.id, { width: 80, height: 80 });
    }
  } catch {
    toast.error("The sample design could not be drawn in this browser.");
  }
}

/** Upload one file straight into an empty product slot. */
export async function uploadIntoSlot(file: File, designId: string) {
  try {
    const asset = await loadAssetFromFile(file);
    useEditor.getState().addAsset(asset);
    useEditor.getState().fillSlot(designId, asset.id);
    useEditor.getState().select([designId]);
  } catch (error) {
    toast.error(error instanceof ImageLoadError ? error.message : `${file.name} could not be opened.`);
  }
}

/** Place an already-uploaded image centred on a point of the sheet (mm). */
export function placeAssetAt(assetId: string, point: { x: number; y: number }) {
  const state = useEditor.getState();
  state.clearSelection();
  const id = state.placeAsset(assetId);
  if (!id) return;
  const d = useEditor.getState().doc.designs.find((x) => x.id === id)!;
  useEditor.getState().moveDesigns([{ id, x: point.x - d.width / 2, y: point.y - d.height / 2 }]);
  // moveDesigns made a second history entry; fold it into the placement.
  useEditor.setState((s) => ({ past: s.past.slice(0, -1) }));
}

/**
 * Start a fresh design for one product: a new project whose only page is the
 * smallest sheet that holds the product (or `sheet`, when it is big enough),
 * with the empty product box zoomed to fill the canvas. The box sits at the top
 * centre of the sheet, which leaves the rest free if the user later chooses
 * "Add to this sheet" (a centred box splits the space into unusable strips).
 */
export function openProductDesign(productId: string, options: { process?: PrintProcess; sheet?: string } = {}) {
  const product = findProduct(productId);
  if (!product) return;
  const wanted = options.process ?? useEditor.getState().doc.page.process;
  const process = product.processes.includes(wanted) ? wanted : product.processes[0];
  const store = useEditor.getState();
  store.newProject();
  const blank = useEditor.getState().doc.page;
  const start = {
    ...blank,
    process,
    mirrorOutput: process === "sublimation",
    sheet: options.sheet && findSheet(options.sheet) ? options.sheet : blank.sheet,
  };
  const slot = slotSize(product);
  const { page } = pageFor(slot, start);
  const area = printableRect(page);
  const design = makeDesign({
    name: `${product.name}, ${product.detail}`,
    productId: product.id,
    width: slot.width,
    height: slot.height,
    bleed: slot.bleed,
    x: area.x + (area.width - slot.width) / 2,
    y: area.y,
    fitMode: "fill",
  });
  useEditor.setState((x) => ({
    doc: { page, designs: [design] },
    pages: [{ ...x.pages[0], doc: { page, designs: [design] } }],
    selection: [design.id],
    past: [],
    future: [],
    previewDock: true,
    // The preview dock appears for product designs; reserve its space before zooming.
    rightInset: x.viewport.width >= PREVIEW_DOCK_MIN_CANVAS ? PREVIEW_DOCK_PX : 0,
    project: { ...x.project, name: `${product.name}, ${product.detail}`, dirty: false },
  }));
  // The product's print area fills the canvas, like a design canvas in Canva.
  useEditor.getState().zoomToSelection();
  toast(`${product.name}, ${product.detail}: ${sheetLabel(page)} ${page.orientation} ready`, {
    description: "Drop your design on the box, click Add image, or pick one from Designs. The preview updates as you go.",
  });
}

/** True when replacing the current design would lose something worth asking about. */
export function hasWorkToLose(): boolean {
  const state = useEditor.getState();
  const designs = allPages(state).flatMap((d) => d.designs);
  if (designs.length === 0) return false;
  // A fresh, untouched product design (empty boxes only) can be replaced silently.
  return state.project.dirty || designs.some((d) => d.assetId);
}

/** Carry out an intent without asking (after the user chose, or when nothing would be lost). */
export function proceedWith(intent: LeaveIntent) {
  const state = useEditor.getState();
  state.setLeaveIntent(null);
  if (intent.kind === "product") openProductDesign(intent.productId);
  else if (intent.kind === "blank") state.newProject();
  else if (intent.kind === "start") state.setDialog("start");
  else void import("./sample").then((m) => m.loadSampleSheet());
}

/** Ask before replacing the current design when there is work to lose. */
export function requestLeave(intent: LeaveIntent) {
  if (hasWorkToLose()) useEditor.getState().setLeaveIntent(intent);
  else proceedWith(intent);
}

/** Product card click: a new design for this product (asking first if needed). */
export function requestProduct(productId: string) {
  requestLeave({ kind: "product", productId });
}

/**
 * Change the active page's sheet from a dropdown. Designs keep their size and
 * position; if any end up off the sheet, the toast says so and offers Undo.
 */
export function changeSheet(sheetId: string) {
  const state = useEditor.getState();
  if (sheetId === state.doc.page.sheet) return;
  if (sheetId === "custom") {
    state.setDialog("sheet");
    return;
  }
  state.setSheet(sheetId, null, state.doc.page.orientation);
  const { doc } = useEditor.getState();
  const off = doc.designs.filter((d) => placementStatus(d, doc.page).exceedsPage).length;
  if (off > 0) {
    toast.warning(`${off} ${off === 1 ? "design is" : "designs are"} partly off the ${sheetLabel(doc.page)} sheet`, {
      description: "Nothing was resized. Move them, turn the sheet, or undo.",
      action: { label: "Undo", onClick: () => useEditor.getState().undo() },
    });
  }
}
