import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64, parseProjectFile, serializeProject } from "@/lib/storage/project-file";
import type { ProjectRecord } from "@/types/project";
import { makeAsset, makeDesign, makeDoc, TINY_PNG } from "./fixtures";

const record: ProjectRecord = {
  id: "p1",
  name: "Stickers",
  createdAt: 1,
  updatedAt: 2,
  document: makeDoc([makeDesign({ x: 12.5, rotation: 90, fitMode: "fill", fillColor: "#ff0000" })]),
  assets: [makeAsset()],
  thumbnail: "data:image/jpeg;base64,xx",
};

describe("project files", () => {
  it("round-trips the document and the original image bytes", async () => {
    const text = await serializeProject(record, new Map([["a1", new Blob([TINY_PNG as BlobPart], { type: "image/png" })]]));
    const { record: back, blobs } = parseProjectFile(text);
    expect(back.document).toEqual(record.document);
    expect(back.name).toBe("Stickers");
    expect(back.id).not.toBe("p1");
    expect(back.thumbnail).toBeNull();
    const bytes = new Uint8Array(await blobs.get("a1")!.arrayBuffer());
    expect(bytes).toEqual(TINY_PNG);
    expect(blobs.get("a1")!.type).toBe("image/png");
  });

  it("rejects other files and newer versions", () => {
    expect(() => parseProjectFile("not json")).toThrow(/not a Sheetfit project/);
    expect(() => parseProjectFile('{"format":"other"}')).toThrow(/not a Sheetfit project/);
    expect(() =>
      parseProjectFile(JSON.stringify({ format: "sheetfit-project", version: 99, project: record, images: {} })),
    ).toThrow(/newer version/);
  });

  it("encodes large byte arrays in chunks", () => {
    const big = new Uint8Array(100_000).map((_, i) => i % 256);
    expect(base64ToBytes(bytesToBase64(big))).toEqual(big);
  });
});
