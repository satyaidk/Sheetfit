/**
 * Portable project files (`.sheetfit`).
 *
 * IndexedDB keeps projects in one browser profile. A project file carries the
 * same record plus the original image bytes (base64), so a sheet can be moved
 * to another computer or archived with a print job and reopened for editing.
 * Images are stored unchanged; nothing is re-encoded.
 */

import type { ProjectRecord } from "@/types/project";
import type { SupportedMime } from "@/types/image";
import { createId } from "@/lib/id";

export const PROJECT_FILE_FORMAT = "sheetfit-project";
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXTENSION = ".sheetfit";

interface ProjectFile {
  format: typeof PROJECT_FILE_FORMAT;
  version: number;
  project: ProjectRecord;
  images: Record<string, { mimeType: SupportedMime; base64: string }>;
}

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectFileError";
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function serializeProject(record: ProjectRecord, blobs: Map<string, Blob>): Promise<string> {
  const images: ProjectFile["images"] = {};
  for (const asset of record.assets) {
    const blob = blobs.get(asset.id);
    if (!blob) continue;
    images[asset.id] = {
      mimeType: asset.mimeType,
      base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
    };
  }
  const file: ProjectFile = {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    project: { ...record, thumbnail: null },
    images,
  };
  return JSON.stringify(file);
}

/**
 * Parse a project file. The imported project gets a new id so it never
 * overwrites a project already saved in this browser.
 */
export function parseProjectFile(text: string): { record: ProjectRecord; blobs: Map<string, Blob> } {
  let data: ProjectFile;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProjectFileError("This file is not a Sheetfit project.");
  }
  if (data?.format !== PROJECT_FILE_FORMAT || !data.project?.document) {
    throw new ProjectFileError("This file is not a Sheetfit project.");
  }
  if (data.version > PROJECT_FILE_VERSION) {
    throw new ProjectFileError("This project was saved by a newer version of Sheetfit.");
  }
  const blobs = new Map<string, Blob>();
  for (const [id, image] of Object.entries(data.images ?? {})) {
    blobs.set(id, new Blob([base64ToBytes(image.base64) as BlobPart], { type: image.mimeType }));
  }
  const now = Date.now();
  return {
    record: { ...data.project, id: createId("project"), updatedAt: now },
    blobs,
  };
}
