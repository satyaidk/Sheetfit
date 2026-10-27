"use client";

/**
 * Upload panel: a drop zone plus the list of images in this project. Clicking
 * an uploaded image places another copy of it, at its default print size.
 */

import { useRef, useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { ASSET_DRAG_TYPE, uploadFiles } from "@/lib/editor-actions";
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
          "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors",
          over ? "border-accent bg-accent-soft" : "border-line-strong bg-subtle hover:border-accent hover:bg-accent-soft",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-white">
          <ImagePlus className="size-5" />
        </span>
        <span className="text-[14px] font-semibold">Upload images</span>
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
          <h3 className="mb-2 text-[13px] font-semibold">
            In this project <span className="font-normal text-ink-faint">{list.length}</span>
          </h3>
          <p className="mb-2 text-[12px] text-ink-muted">Click to add, or drag onto the sheet or into a product box.</p>
          <ul className="grid grid-cols-2 gap-2">
            {list.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(ASSET_DRAG_TYPE, a.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => placeAsset(a.id)}
                  className="group relative block w-full rounded-lg p-1.5 text-left transition-colors hover:bg-subtle"
                  title={`Click to add ${a.name}, or drag it onto the sheet or a product box`}
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
