import type { EditorDocument } from "./editor";
import type { ImageAsset } from "./image";

/** Serialisable project record as stored in IndexedDB. */
export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  document: EditorDocument;
  /** Asset metadata; the image blobs live in a separate object store. */
  assets: ImageAsset[];
  /** Small JPEG data URL used in the saved-projects list. */
  thumbnail: string | null;
}

export type ProjectSummary = Pick<
  ProjectRecord,
  "id" | "name" | "createdAt" | "updatedAt" | "thumbnail"
> & { designCount: number };
