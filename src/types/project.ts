import type { EditorDocument } from "./editor";
import type { ImageAsset } from "./image";

/** Serialisable project record as stored in IndexedDB. */
export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** First page; kept so v0.2 readers and the project list keep working. */
  document: EditorDocument;
  /** Every page in order (v0.3+). Absent in older records: then `[document]`. */
  pages?: EditorDocument[];
  /** Asset metadata; the image blobs live in a separate object store. */
  assets: ImageAsset[];
  /** Small JPEG data URL used in the saved-projects list. */
  thumbnail: string | null;
}

export type ProjectSummary = Pick<
  ProjectRecord,
  "id" | "name" | "createdAt" | "updatedAt" | "thumbnail"
> & { designCount: number; pageCount: number };
