/**
 * Use-case functions that combine the store with browser services.
 *
 * Components call these instead of talking to IndexedDB, file decoding or
 * exporters directly. Each function reads the current store state when it
 * runs, so it is safe to call from event handlers and keyboard shortcuts.
 */

import { toast } from "sonner";
import { allPages, makeDesign, PREVIEW_DOCK_MIN_CANVAS, PREVIEW_DOCK_PX, useEditor, type LayoutReport, type LeaveIntent } from "@/store/editor-store";
import type { PrintProcess } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import type { ProjectRecord } from "@/types/project";
import { ACCEPT_ATTR, ImageLoadError, LARGE_IMAGE_MEGAPIXELS, loadAssetFromBlob, loadAssetFromFile, megapixels } from "@/lib/image/image-loader";
import { buildRenderPlan } from "@/lib/render/render-plan";
import { downloadBlob, renderPreviewDataUrl } from "@/lib/export/export-raster";
import { parseProjectFile, PROJECT_FILE_EXTENSION, ProjectFileError, serializeProject } from "@/lib/storage/project-file";
import { loadProject, saveProject, StorageError } from "@/lib/storage/project-storage";
import { migratePages } from "@/lib/storage/migrate";
import { findProduct, sidesOf, slotSize } from "@/lib/catalogue/products";
import { planStrip, stripSegmentDesign, type StripProfile, type StripUse } from "@/lib/layout/strip-layout";
import { saveStrapSpec, strapArtPlacements, strapDesign, strapImageSize, type StrapSpec } from "@/lib/layout/strap";
import { twinsOf } from "@/lib/layout/fill";
import { CONTOUR_MASK_MAX, alphaMask, traceContour, type ContourOptions } from "@/lib/cut/contour";
import { detectPlainBackground, knockOut, opaqueBounds } from "@/lib/image/background";
import { stickerOutlineDefaults } from "@/lib/cut/cut-method";
import { computeImageRect, effectiveSourceRect } from "@/lib/image/image-fit";
import { DEFAULT_GUIDES } from "@/lib/storage/migrate";
import type { CutSpec } from "@/types/editor";
import { contourKey } from "@/lib/cut/cut-path";
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

/**
 * Upload files into a two-sided card: the first fills the selected side; a
 * second file becomes the other side (created beside it if missing). A single
 * file never creates a back.
 */
export async function uploadCardSides(files: File[], designId: string) {
  await uploadIntoSlot(files[0], designId);
  if (files.length < 2) return;
  const state = useEditor.getState();
  const d = state.doc.designs.find((x) => x.id === designId);
  if (!d || sidesOf(findProduct(d.productId)) !== 2) {
    void uploadFiles(files.slice(1));
    return;
  }
  const partner = d.pairId ? state.doc.designs.find((x) => x.pairId === d.pairId && x.id !== d.id) : undefined;
  const otherId = partner?.id ?? (d.side !== "back" ? state.addCardBack(d.id) : null);
  if (otherId) await uploadIntoSlot(files[1], otherId);
  else void uploadFiles(files.slice(1));
  if (files.length > 2) void uploadFiles(files.slice(2));
  useEditor.getState().select([designId]);
  toast("Front and back placed side by side", { description: "Swap sides from the inspector if they are the wrong way round." });
}

/**
 * Draw a strap image: the artwork placed on a ribbon-wide strip exactly as
 * `strapArtPlacements` plans it (once, repeated or filling; turned to run
 * along the strap; the second half turned 180° for folded straps), at
 * 600 DPI, transparent around the artwork.
 */
export async function composeStrapImage(art: LoadedAsset, spec: StrapSpec): Promise<LoadedAsset> {
  const size = strapImageSize(spec, 600);
  const k = size.width / spec.width;
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the strap.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const aw = art.naturalWidth;
  const ah = art.naturalHeight;
  for (const p of strapArtPlacements(spec, aw / ah)) {
    const r = { x: p.rect.x * k, y: p.rect.y * k, w: p.rect.width * k, h: p.rect.height * k };
    const sideways = p.rotation % 180 !== 0;
    const boxW = sideways ? r.h : r.w;
    const boxH = sideways ? r.w : r.h;
    const s = p.cover ? Math.max(boxW / aw, boxH / ah) : Math.min(boxW / aw, boxH / ah);
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.drawImage(art.element, (-aw * s) / 2, (-ah * s) / 2, aw * s, ah * s);
    ctx.restore();
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The strap image could not be created.");
  const base = art.name.replace(/\.[^.]+$/, "");
  return loadAssetFromBlob(blob, {
    name: `${base}, strap ${+spec.width.toFixed(1)} × ${+spec.length.toFixed(1)} mm${spec.fold ? ", folded" : ""}.png`,
    mimeType: "image/png",
  });
}

/**
 * Lay out lanyard or keychain straps on a sheet: one strap box per strap,
 * filling the sheet (or exactly `count`, adding pages), mirrored for
 * sublimation. A page that holds work is never changed: the straps get a new
 * page unless the current one is empty.
 */
export async function layoutStraps(
  spec: StrapSpec,
  options: { count: "fill" | number; sheet: string; gap: number; art?: LoadedAsset | null },
): Promise<LayoutReport | null> {
  const state = useEditor.getState();
  saveStrapSpec(browserStorage(), spec);
  let composed: LoadedAsset | null = null;
  if (options.art) {
    try {
      composed = await composeStrapImage(options.art, spec);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The strap image could not be created.");
      return null;
    }
    state.addAsset(options.art);
    state.addAsset(composed);
  }
  const page = {
    ...state.doc.page,
    sheet: findSheet(options.sheet) ? options.sheet : "a4",
    customSize: null,
    process: "sublimation" as const,
    mirrorMode: "auto" as const,
    spacing: Math.max(0, options.gap),
    constrainToPrintable: true,
  };
  if (state.doc.designs.length > 0) state.addPage(page);
  const area = printableRect(page);
  const design = makeDesign({
    ...strapDesign(spec, options.art?.id ?? null),
    assetId: composed?.id ?? null,
    x: area.x,
    y: area.y,
  });
  useEditor.getState().commit({ page, designs: [design] });
  // The page set-up and the straps are one step for Undo.
  const before = useEditor.getState().past.length;
  const report =
    options.count === "fill" ? useEditor.getState().fillSheet(design.id, { rotate: true }) : useEditor.getState().setQuantity(design.id, options.count);
  if (useEditor.getState().past.length === before + 1) useEditor.setState((x) => ({ past: x.past.slice(0, -1) }));
  useEditor.getState().fitPage();
  const where = `${sheetLabel(page)}${report.pagesAdded ? ` (${report.pagesAdded + 1} pages)` : ""}`;
  toast.success(`${report.placed} ${report.placed === 1 ? "strap" : "straps"} on ${where}`, {
    description: composed
      ? "Mirrored for sublimation. Lay the ribbon on the printed strips and press."
      : "Add artwork from the inspector: it fills every strap on the page.",
  });
  return report;
}

/** Compose `art` for the strap `designId` and put it on every matching strap on this page. One undo step. */
export async function applyStrapArt(designId: string, art: LoadedAsset, patch: Partial<StrapSpec> = {}): Promise<number> {
  const state = useEditor.getState();
  const d = state.doc.designs.find((x) => x.id === designId);
  if (!d?.strap) return 0;
  const spec: StrapSpec = { width: d.width, length: d.height, fold: d.strap.fold, endZone: d.strap.endZone, mode: d.strap.mode, along: d.strap.along, ...patch };
  let composed: LoadedAsset;
  try {
    composed = await composeStrapImage(art, spec);
  } catch {
    toast.error("The strap image could not be created.");
    return 0;
  }
  state.addAsset(art);
  state.addAsset(composed);
  const now = useEditor.getState().doc;
  const targets = new Set([d.id, ...twinsOf(d, now.designs).map((t) => t.id)]);
  const strap = { fold: spec.fold, endZone: spec.endZone, mode: spec.mode, along: spec.along, sourceAssetId: art.id };
  useEditor.getState().commit({
    ...now,
    designs: now.designs.map((x) => (targets.has(x.id) ? { ...x, assetId: composed.id, strap, crop: null, view: null, fitMode: "fill" } : x)),
  });
  return targets.size;
}

function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Lay out lanyard straps on ribbon: one page per section, each page the
 * ribbon itself, every strap an empty box with a cut guide. Added after the
 * current page (or into it, if it is empty) so no work is replaced.
 */
export function createStripLayout(profile: StripProfile, use: StripUse, count: number, sectionLength: number, cutGuides: boolean) {
  const sections = planStrip(profile, count, sectionLength);
  sections.forEach((section, i) => {
    const state = useEditor.getState();
    const page = {
      ...state.doc.page,
      ...section.page,
      process: "sublimation" as const,
      mirrorMode: "auto" as const,
      constrainToPrintable: false,
      guides: { ...DEFAULT_GUIDES, cutlines: cutGuides },
    };
    const designs = section.segments.map((seg, k) =>
      makeDesign({ ...stripSegmentDesign(profile, use, i * 100 + k), ...seg }),
    );
    if (i === 0 && state.doc.designs.length === 0) state.commit({ page, designs });
    else {
      state.addPage(page);
      useEditor.getState().commit({ page, designs });
    }
  });
  useEditor.getState().fitPage();
  toast(`${count} straps laid out on ${sections.length} ${sections.length === 1 ? "page" : "pages"}`, {
    description: "Drop artwork on a strap, or use Repeat to fill them all. Sizes are your own (custom, unverified).",
  });
}

export interface ContourRequest {
  offsetMm: number;
  holes: boolean;
  smoothing?: number;
  threshold?: number;
  /** Closing radius in mm (fills slots narrower than twice this). */
  closeMm?: number;
  /** Keep growing the closing (up to 6 mm) until the design is one piece. */
  mergeIslands?: boolean;
  /** No success toast (automatic outlines report once, from the caller). */
  quiet?: boolean;
}

export type OutlineResult =
  | { kind: "contour"; outlines: number; holes: number; background: "alpha" | "removed" }
  | { kind: "shape"; reason: string }
  | { kind: "failed"; reason: string };

/**
 * Trace a cut contour around a design's artwork. The artwork is drawn exactly
 * as it prints (same source window and image rectangle) into a mask with room
 * for the border, and traced in pure code (`lib/cut/contour.ts`):
 *
 * - Transparent images are traced from their alpha.
 * - Opaque images (JPEG, flat PNG) on a plain background have that background
 *   found by a flood fill from the edges (`lib/image/background.ts`) and are
 *   traced around what remains.
 * - Anything else (a photo with a busy edge) gets a rounded rectangle at the
 *   same border, never a guessed outline.
 *
 * Paths are stored in box-relative coordinates with the inputs they were
 * traced for, so the editor can tell when they are out of date.
 */
export async function generateContour(designId: string, options: ContourRequest): Promise<OutlineResult> {
  const state = useEditor.getState();
  const d = state.doc.designs.find((x) => x.id === designId);
  const asset = d?.assetId ? state.assets[d.assetId] : undefined;
  if (!d || !asset) return { kind: "failed", reason: "The design has no image." };
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const src = effectiveSourceRect(d, natural);
  const img = computeImageRect(d, { width: src.width, height: src.height });
  const offsetMm = Math.max(0, options.offsetMm);
  const closeMm = Math.max(0, options.closeMm ?? 0);
  const maxClose = options.mergeIslands ? Math.max(closeMm, 6) : closeMm;
  const padMm = offsetMm + maxClose + 1;
  const spanW = d.width + 2 * padMm;
  const spanH = d.height + 2 * padMm;
  const pxPerMm = Math.min(CONTOUR_MASK_MAX / Math.max(spanW, spanH), 12);
  const w = Math.max(8, Math.round(spanW * pxPerMm));
  const h = Math.max(8, Math.round(spanH * pxPerMm));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { kind: "failed", reason: "This browser cannot read image pixels." };
  ctx.save();
  ctx.scale(pxPerMm, pxPerMm);
  ctx.translate(padMm + img.x + img.width / 2, padMm + img.y + img.height / 2);
  if (d.flipX || d.flipY) ctx.scale(d.flipX ? -1 : 1, d.flipY ? -1 : 1);
  ctx.drawImage(asset.element, src.x, src.y, src.width, src.height, -img.width / 2, -img.height / 2, img.width, img.height);
  ctx.restore();
  const data = ctx.getImageData(0, 0, w, h).data;
  const threshold = options.threshold ?? 16;

  // Alpha first; an (almost) fully opaque image has no shape in its alpha.
  let mask = alphaMask(data, w, h, threshold);
  let background: "alpha" | "removed" = "alpha";
  const imgPx = Math.max(1, img.width * pxPerMm * img.height * pxPerMm);
  let inkPx = 0;
  for (let i = 0; i < mask.length; i++) inkPx += mask[i];
  if (inkPx / imgPx > 0.985) {
    const plain = detectPlainBackground(data, w, h, { alphaThreshold: threshold });
    if (!plain) {
      const reason = "The image has no transparency and no plain background, so it is cut as a rounded rectangle.";
      useEditor.getState().updateDesign(d.id, {
        cut: { shape: "rect", radius: Math.max(1, offsetMm), offset: offsetMm, through: d.cut?.through ?? "die", safeInset: 0, contour: null },
      });
      if (!options.quiet) toast(reason, { description: "Upload a PNG with a transparent background, or use Remove background, for a shaped outline." });
      return { kind: "shape", reason };
    }
    mask = plain.ink;
    background = "removed";
  }

  const base: Partial<ContourOptions> = {
    threshold,
    offsetPx: offsetMm * pxPerMm,
    tolerancePx: 0.6,
    smoothing: options.smoothing ?? 1,
    holes: options.holes,
    minAreaPx: Math.max(4, (pxPerMm * pxPerMm) / 4),
  };
  // Hand cutting: one piece per design. Grow the closing until stray islands
  // (separate letters, specks) join the main shape, within reason.
  const radii = options.mergeIslands ? [closeMm, 3, 6].filter((r, i, a) => r >= closeMm && a.indexOf(r) === i) : [closeMm];
  let result = traceContour(mask, w, h, { ...base, closePx: radii[0] * pxPerMm });
  for (const r of radii.slice(1)) {
    if (result.outlines.length <= 1) break;
    result = traceContour(mask, w, h, { ...base, closePx: r * pxPerMm });
  }
  if (result.outlines.length === 0) {
    const reason = result.problems[0] ?? "No artwork was found to trace.";
    if (!options.quiet) toast.error("No outline could be traced", { description: reason });
    return { kind: "failed", reason };
  }
  const toBox = (pts: number[]) =>
    pts.map((v, i) => (i % 2 === 0 ? (v / pxPerMm - padMm) / d.width : (v / pxPerMm - padMm) / d.height));
  const paths = [...result.outlines, ...result.holes].map(toBox);
  const cut: CutSpec = {
    shape: "contour",
    radius: 0,
    offset: offsetMm,
    through: d.cut?.through ?? "die",
    safeInset: 0,
    contour: { paths, generatedFor: { assetId: asset.id, width: d.width, height: d.height, offset: offsetMm, key: contourKey(d) } },
  };
  useEditor.getState().updateDesign(d.id, { cut });
  if (!options.quiet) {
    const dropped = result.dropped > 0 ? ` ${result.dropped} specks were ignored.` : "";
    toast.success(`Outline traced: ${result.outlines.length} ${result.outlines.length === 1 ? "piece" : "pieces"}`, {
      description: `${offsetMm} mm border${background === "removed" ? " around the artwork (plain background left out)" : " outside the artwork"}.${options.holes && result.holes.length ? ` ${result.holes.length} inner holes cut.` : ""}${dropped}`,
    });
  }
  return { kind: "contour", outlines: result.outlines.length, holes: result.holes.length, background };
}

/**
 * Give stickers their outline with the settings the page's cut method calls
 * for (`stickerOutlineDefaults`), quietly. Called by the editor's outline
 * watcher (`use-sticker-outlines`) after uploads, drops, replacements and
 * resizes, so a sticker never needs a manual "trace" step.
 */
export async function autoOutline(designIds: string[]): Promise<OutlineResult[]> {
  const results: OutlineResult[] = [];
  for (const id of designIds) {
    const state = useEditor.getState();
    const d = state.doc.designs.find((x) => x.id === id);
    if (!d?.assetId || state.doc.page.process !== "sticker") continue;
    const settings = stickerOutlineDefaults(state.doc.page.cutMethod, d.cut?.shape === "contour" ? d.cut.offset : null);
    results.push(await generateContour(id, { ...settings, quiet: true }));
  }
  return results;
}

/**
 * Re-trace every contour sticker on the page with the current cut method's
 * settings and `offsetMm` (or each sticker's own border). One undo step.
 */
export async function retraceAll(offsetMm?: number): Promise<number> {
  const state = useEditor.getState();
  if (state.doc.page.process !== "sticker") return 0;
  const before = state.past.length;
  let n = 0;
  for (const d of state.doc.designs) {
    if (!d.assetId || d.locked || (d.cut && d.cut.shape !== "contour")) continue;
    const settings = stickerOutlineDefaults(state.doc.page.cutMethod, offsetMm ?? (d.cut?.shape === "contour" ? d.cut.offset : null));
    const r = await generateContour(d.id, { ...settings, quiet: true });
    if (r.kind !== "failed") n++;
  }
  // Fold the per-sticker steps into one.
  const after = useEditor.getState();
  if (after.past.length > before + 1) useEditor.setState({ past: after.past.slice(0, before + 1) });
  return n;
}

/** Largest image side processed by Remove background (keeps memory reasonable). */
const KNOCKOUT_MAX_SIDE = 6000;

/** Read an asset's pixels at native resolution (capped), or null if the browser cannot. */
function assetPixels(asset: LoadedAsset, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(asset.naturalWidth, asset.naturalHeight));
  const w = Math.max(1, Math.round(asset.naturalWidth * scale));
  const h = Math.max(1, Math.round(asset.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(asset.element, 0, 0, w, h);
  return { canvas, ctx, w, h, data: ctx.getImageData(0, 0, w, h) };
}

/**
 * Make a plain background transparent (white or any flat colour touching the
 * image edges), as a new PNG asset. Size, position, crop and fit are kept;
 * the original file stays in Uploads, and Undo restores it. Inner areas of
 * the background colour (letters, eyes) are kept because only background
 * connected to the edge is removed.
 */
export async function removeBackground(designId: string, tolerance = 40): Promise<boolean> {
  const state = useEditor.getState();
  const d = state.doc.designs.find((x) => x.id === designId);
  const asset = d?.assetId ? state.assets[d.assetId] : undefined;
  if (!d || !asset) return false;
  const px = assetPixels(asset, KNOCKOUT_MAX_SIDE);
  if (!px) return false;
  const found = detectPlainBackground(px.data.data, px.w, px.h, { tolerance });
  if (!found) {
    toast.error("No plain background found", {
      description: "Only a flat background colour that touches the image edges can be removed. Photos with busy edges are left as they are.",
    });
    return false;
  }
  const out = knockOut(px.data.data, px.w, px.h, found, found.color);
  px.ctx.putImageData(new ImageData(out, px.w, px.h), 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => px.canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;
  const next = await loadAssetFromBlob(blob, { name: asset.name.replace(/\.[^.]+$/, "") + " (no background).png", mimeType: "image/png" });
  useEditor.getState().addAsset(next);
  useEditor.getState().updateDesign(d.id, { assetId: next.id });
  const pct = Math.round(found.removed * 100);
  toast.success("Background removed", {
    description: `${pct}% of the image was background. The original is still in Uploads.`,
    action: { label: "Undo", onClick: () => useEditor.getState().undo() },
  });
  return true;
}

/**
 * Trim empty transparent margins: crop to the visible artwork and shrink the
 * box around it at the same printed scale, so the art stays the same size on
 * paper but packs tighter. Non-destructive (a crop on the design).
 */
export function trimEmptyEdges(designId: string): boolean {
  const state = useEditor.getState();
  const d = state.doc.designs.find((x) => x.id === designId);
  const asset = d?.assetId ? state.assets[d.assetId] : undefined;
  if (!d || !asset || d.fitMode === "cover" || d.fitMode === "stretch") return false;
  const px = assetPixels(asset, 2048);
  if (!px) return false;
  const b = opaqueBounds(px.data.data, px.w, px.h);
  if (!b) return false;
  const W = px.w;
  const H = px.h;
  const crop = { left: b.x / W, top: b.y / H, right: (W - b.x - b.width) / W, bottom: (H - b.y - b.height) / H };
  if (crop.left + crop.right + crop.top + crop.bottom < 0.01) {
    toast("Nothing to trim", { description: "The artwork already reaches the image edges." });
    return false;
  }
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const src = effectiveSourceRect(d, natural);
  const img = computeImageRect(d, { width: src.width, height: src.height });
  // Millimetres per source pixel stay the same; the box shrinks to the trimmed art.
  const mmPerPx = img.width / src.width;
  const width = Math.max(1, natural.width * (1 - crop.left - crop.right) * mmPerPx + 2 * d.padding);
  const height = Math.max(1, natural.height * (1 - crop.top - crop.bottom) * mmPerPx + 2 * d.padding);
  const cx = d.x + d.width / 2;
  const cy = d.y + d.height / 2;
  useEditor.getState().updateDesign(d.id, {
    crop,
    width,
    height,
    x: cx - width / 2,
    y: cy - height / 2,
    fitMode: "contain",
    lockAspect: true,
  });
  toast.success("Empty edges trimmed", {
    description: `The box is now ${+width.toFixed(1)} × ${+height.toFixed(1)} mm; the artwork kept its size.`,
    action: { label: "Undo", onClick: () => useEditor.getState().undo() },
  });
  return true;
}

/** Upload one file straight into an empty product slot. */
export async function uploadIntoSlot(file: File, designId: string) {
  try {
    const asset = await loadAssetFromFile(file);
    useEditor.getState().addAsset(asset);
    putAssetInSlot(designId, asset.id);
  } catch (error) {
    toast.error(error instanceof ImageLoadError ? error.message : `${file.name} could not be opened.`);
  }
}

/**
 * Put an uploaded image into an empty box. When the sheet holds more empty
 * boxes of the same product and size (a filled sheet of keychains, say),
 * they all get the image in the same undo step: the usual "fill the sheet,
 * then add the design" order works in one go. Strap boxes compose the strap
 * image instead.
 */
export function putAssetInSlot(designId: string, assetId: string): number {
  const state = useEditor.getState();
  const d = state.doc.designs.find((x) => x.id === designId);
  if (!d) return 0;
  if (d.strap) {
    const art = state.assets[assetId];
    if (art) void applyStrapArt(designId, art);
    return 1;
  }
  const empties = d.assetId ? [] : twinsOf(d, state.doc.designs).filter((t) => !t.assetId && !t.pairId);
  const before = state.past.length;
  state.fillSlot(designId, assetId);
  for (const t of empties) useEditor.getState().fillSlot(t.id, assetId);
  const after = useEditor.getState();
  if (after.past.length > before + 1) useEditor.setState({ past: after.past.slice(0, before + 1) });
  useEditor.getState().select([designId]);
  if (empties.length > 0) {
    toast.success(`Image added to all ${empties.length + 1} empty boxes`, {
      description: "Each box keeps its size; the image is fitted inside, never cropped.",
      action: { label: "Undo", onClick: () => useEditor.getState().undo() },
    });
  }
  return empties.length + 1;
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
    mirrorMode: "auto" as const,
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
    side: sidesOf(product) === 2 ? "front" : null,
    cut: product.cut
      ? {
          shape: product.cut.shape ?? "rect",
          radius: product.cut.radius ?? product.cornerRadius ?? 0,
          offset: product.cut.offset ?? 0,
          through: product.cut.through ?? "die",
          safeInset: product.cut.safeInset ?? 0,
          contour: null,
        }
      : null,
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
    // On laptop screens the product catalogue has done its job: give the new
    // design the room (the rail brings the panel back in one click).
    panelOpen: typeof window !== "undefined" && window.innerWidth < 1600 ? false : x.panelOpen,
    project: { ...x.project, name: `${product.name}, ${product.detail}`, dirty: false },
  }));
  // The product's print area fills the canvas, like a design canvas in Canva.
  useEditor.getState().zoomToSelection();
  // If closing the side panel widens the canvas, zoom again once it has.
  const unsubscribe = useEditor.subscribe((s, prev) => {
    if (s.viewport.width !== prev.viewport.width) {
      unsubscribe();
      s.zoomToSelection();
    }
  });
  setTimeout(unsubscribe, 600);
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

/**
 * Open the browser's file chooser without a mounted <input> (menus and the
 * command palette have none). Must run inside a user gesture; resolves with
 * an empty list when the user cancels.
 */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve(input.files ? [...input.files] : []);
      input.remove();
    });
    input.addEventListener("cancel", () => {
      resolve([]);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

/** "Upload images…" from a menu: the same path as dropping files on the sheet. */
export async function chooseAndUploadImages() {
  const files = await pickFiles(ACCEPT_ATTR, true);
  if (files.length) await uploadFiles(files);
}

/** "Open .sheetfit file…" from a menu. */
export async function chooseAndImportProject() {
  const [file] = await pickFiles(`${PROJECT_FILE_EXTENSION},application/json`);
  if (file) await importProjectFile(file);
}

/**
 * Fill the free space of the page with copies of one design (the quick bar's
 * "Fill sheet", the Arrange menu and the command palette share this), and say
 * what happened with an Undo action.
 */
export function fillSheetWith(designId: string) {
  const s = useEditor.getState();
  const spacing = s.doc.page.spacing;
  const r = s.fillSheet(designId);
  if (r.placed > 0)
    toast.success(`Sheet filled with ${r.placed} copies`, {
      description: `${spacing} mm between cut lines${r.turned ? `, ${r.turned} turned to fit` : ""}. Nothing was resized.`,
      action: { label: "Undo", onClick: () => useEditor.getState().undo() },
    });
  else toast.info("No more copies fit on this sheet", { description: "Try a smaller spacing, turning the sheet, or a larger sheet." });
  return r;
}
