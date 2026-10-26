/**
 * Use-case functions that combine the store with browser services.
 *
 * Components call these instead of talking to IndexedDB, file decoding or
 * exporters directly. Each function reads the current store state when it
 * runs, so it is safe to call from event handlers and keyboard shortcuts.
 */

import { toast } from "sonner";
import { useEditor } from "@/store/editor-store";
import type { LoadedAsset } from "@/types/image";
import type { ProjectRecord } from "@/types/project";
import { ImageLoadError, LARGE_IMAGE_MEGAPIXELS, loadAssetFromBlob, loadAssetFromFile, megapixels } from "@/lib/image/image-loader";
import { buildRenderPlan } from "@/lib/render/render-plan";
import { downloadBlob, renderPreviewDataUrl } from "@/lib/export/export-raster";
import { parseProjectFile, PROJECT_FILE_EXTENSION, ProjectFileError, serializeProject } from "@/lib/storage/project-file";
import { loadProject, saveProject, StorageError } from "@/lib/storage/project-storage";

function assetMap(): Map<string, LoadedAsset> {
  return new Map(Object.entries(useEditor.getState().assets));
}

export function currentPlan() {
  const { doc, assets } = useEditor.getState();
  return buildRenderPlan(doc, assets);
}

/** Decode files, add them as assets and place each on the sheet. */
export async function uploadFiles(files: Iterable<File>, options: { place?: boolean } = {}) {
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
      if (place) {
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
    return renderPreviewDataUrl(currentPlan(), assetMap(), 240, "image/jpeg");
  } catch {
    return null;
  }
}

/** Snapshot the current editor state as a storable project record. */
function currentProjectRecord(now: number): { record: ProjectRecord; blobs: Map<string, Blob> } {
  const state = useEditor.getState();
  const usedIds = new Set(state.doc.designs.map((d) => d.assetId));
  const assets = Object.values(state.assets).filter((a) => usedIds.has(a.id));
  const record: ProjectRecord = {
    id: state.project.id,
    name: state.project.name.trim() || "Untitled sheet",
    createdAt: state.project.createdAt,
    updatedAt: now,
    document: structuredClone(state.doc),
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
  useEditor.getState().loadState({
    doc: {
      ...record.document,
      // Designs whose image is gone cannot be drawn; drop them visibly.
      designs: record.document.designs.filter((d) => assets[d.assetId]),
    },
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
