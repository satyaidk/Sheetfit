"use client";

/**
 * Upload panel: a drop zone plus the list of images in this project. Clicking
 * an uploaded image places another copy of it, at its default print size.
 */

import { useRef, useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { uploadFiles } from "@/lib/editor-actions";
import { ACCEPT_ATTR } from "@/lib/image/image-loader";
import { cn } from "@/lib/utils";
import { ImagePreview } from "./ImagePreview";

export function ImageUploader() {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const assets = useEditor((s) => s.assets);
  const placeAsset = useEditor((s) => s.placeAsset);
  const list = Object.values(assets).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          void uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          over ? "border-cyan bg-cyan-wash" : "border-line-strong bg-surface hover:border-cyan",
        )}
      >
        <ImagePlus className="size-6 text-cyan" />
        <span className="text-[13px] font-semibold">Upload images</span>
        <span className="text-[12px] text-ink-muted">PNG, JPG or WebP, up to 60 MB. Drop files here or click.</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {list.length > 0 && (
        <div>
          <h3 className="font-condensed mb-2 text-[14px] font-semibold">In this project</h3>
          <ul className="grid grid-cols-2 gap-2">
            {list.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => placeAsset(a.id)}
                  className="group relative block w-full rounded-md border border-line bg-surface p-1.5 text-left hover:border-cyan"
                  title={`Place another copy of ${a.name}`}
                >
                  <ImagePreview asset={a} />
                  <span className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-md bg-ink text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Plus className="size-3.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
