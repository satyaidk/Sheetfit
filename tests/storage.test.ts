import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteProject,
  duplicateProject,
  listProjects,
  loadProject,
  resetStorageConnection,
  saveProject,
} from "@/lib/storage/project-storage";
import type { ProjectRecord } from "@/types/project";
import { makeAsset, makeDesign, makeDoc } from "./fixtures";

function record(id: string, updatedAt: number): ProjectRecord {
  return {
    id,
    name: `Project ${id}`,
    createdAt: 0,
    updatedAt,
    document: makeDoc([makeDesign({ x: 12.5, rotation: 15 })]),
    assets: [makeAsset()],
    thumbnail: null,
  };
}

beforeEach(async () => {
  await resetStorageConnection();
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("sheetfit");
    req.onsuccess = resolve;
    req.onerror = reject;
  });
});

describe("project storage", () => {
  it("restores positions, sizes, rotation and fitting settings", async () => {
    const blob = new Blob(["png-bytes"], { type: "image/png" });
    await saveProject(record("p1", 1), new Map([["a1", blob]]));
    const loaded = await loadProject("p1");
    expect(loaded?.record.document.designs[0]).toMatchObject({ x: 12.5, rotation: 15, fitMode: "contain" });
    expect(loaded?.blobs.get("a1")?.size).toBe(blob.size);
  });

  it("lists newest first and duplicates without copying blobs", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    await saveProject(record("p1", 1), new Map([["a1", blob]]));
    await saveProject(record("p2", 2), new Map());
    expect((await listProjects()).map((p) => p.id)).toEqual(["p2", "p1"]);
    const copy = await duplicateProject("p1");
    expect(copy?.name).toBe("Project p1 copy");
    expect((await loadProject(copy!.id))?.blobs.has("a1")).toBe(true);
  });

  it("deletes unreferenced assets with the last project using them", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    await saveProject(record("p1", 1), new Map([["a1", blob]]));
    const copy = await duplicateProject("p1");
    await deleteProject("p1");
    expect((await loadProject(copy!.id))?.blobs.has("a1")).toBe(true);
    await deleteProject(copy!.id);
    expect(await listProjects()).toEqual([]);
    expect(await loadProject("p1")).toBeNull();
  });
});
