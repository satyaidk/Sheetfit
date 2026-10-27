/**
 * Local project persistence in IndexedDB.
 *
 * Two object stores keep the data apart by size: `projects` holds small JSON
 * records (page settings, designs, asset metadata, a thumbnail), and `assets`
 * holds the original image Blobs. Assets are shared between projects (a
 * duplicated project points at the same blobs) and are garbage-collected when
 * no project references them any more.
 *
 * Nothing leaves the browser. When IndexedDB is unavailable (private mode in
 * some browsers, disabled storage) every call fails with a `StorageError`
 * that the UI can show as-is.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ProjectRecord, ProjectSummary } from "@/types/project";
import { createId } from "@/lib/id";

interface AssetBlobRecord {
  id: string;
  blob: Blob;
}

interface SheetfitDB extends DBSchema {
  projects: { key: string; value: ProjectRecord; indexes: { updatedAt: number } };
  assets: { key: string; value: AssetBlobRecord };
}

const DB_NAME = "sheetfit";
const DB_VERSION = 1;

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}

let dbPromise: Promise<IDBPDatabase<SheetfitDB>> | null = null;

function getDb(): Promise<IDBPDatabase<SheetfitDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new StorageError("Saving is unavailable: this browser has no local storage for projects."),
    );
  }
  dbPromise ??= openDB<SheetfitDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const projects = db.createObjectStore("projects", { keyPath: "id" });
      projects.createIndex("updatedAt", "updatedAt");
      db.createObjectStore("assets", { keyPath: "id" });
    },
  }).catch((error) => {
    dbPromise = null;
    throw new StorageError("Local storage could not be opened. Check the browser's site settings.", {
      cause: error,
    });
  });
  return dbPromise;
}

function wrap(error: unknown, action: string): StorageError {
  if (error instanceof StorageError) return error;
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new StorageError(
      `Could not ${action}: the browser storage quota is full. Delete old projects or use smaller images.`,
      { cause: error },
    );
  }
  return new StorageError(`Could not ${action}.`, { cause: error });
}

export async function saveProject(record: ProjectRecord, blobs: Map<string, Blob>): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(["projects", "assets"], "readwrite");
    const assetStore = tx.objectStore("assets");
    for (const asset of record.assets) {
      const existing = await assetStore.getKey(asset.id);
      const blob = blobs.get(asset.id);
      if (!existing && blob) await assetStore.put({ id: asset.id, blob });
    }
    await tx.objectStore("projects").put(record);
    await tx.done;
  } catch (error) {
    throw wrap(error, "save the project");
  }
}

export async function loadProject(
  id: string,
): Promise<{ record: ProjectRecord; blobs: Map<string, Blob> } | null> {
  try {
    const db = await getDb();
    const record = await db.get("projects", id);
    if (!record) return null;
    const blobs = new Map<string, Blob>();
    for (const asset of record.assets) {
      const stored = await db.get("assets", asset.id);
      if (stored) blobs.set(asset.id, stored.blob);
    }
    return { record, blobs };
  } catch (error) {
    throw wrap(error, "open the project");
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  try {
    const db = await getDb();
    const all = await db.getAllFromIndex("projects", "updatedAt");
    return all.reverse().map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      thumbnail: p.thumbnail,
      designCount: (p.pages ?? [p.document]).reduce((n, page) => n + page.designs.length, 0),
      pageCount: (p.pages ?? [p.document]).length,
    }));
  } catch (error) {
    throw wrap(error, "list saved projects");
  }
}

export async function duplicateProject(id: string): Promise<ProjectRecord | null> {
  try {
    const db = await getDb();
    const source = await db.get("projects", id);
    if (!source) return null;
    const now = Date.now();
    const copy: ProjectRecord = {
      ...structuredClone(source),
      id: createId("project"),
      name: `${source.name} copy`,
      createdAt: now,
      updatedAt: now,
    };
    await db.put("projects", copy);
    return copy;
  } catch (error) {
    throw wrap(error, "duplicate the project");
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(["projects", "assets"], "readwrite");
    const projects = tx.objectStore("projects");
    await projects.delete(id);
    const remaining = await projects.getAll();
    const inUse = new Set(remaining.flatMap((p) => p.assets.map((a) => a.id)));
    const assets = tx.objectStore("assets");
    for (const key of await assets.getAllKeys()) {
      if (!inUse.has(key)) await assets.delete(key);
    }
    await tx.done;
  } catch (error) {
    throw wrap(error, "delete the project");
  }
}

/** Close and forget the cached connection (used by tests between cases). */
export async function resetStorageConnection(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (pending) (await pending.catch(() => null))?.close();
}
