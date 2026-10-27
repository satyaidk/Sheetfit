"use client";

/**
 * Konva, canvas decoding and IndexedDB only exist in the browser, so the
 * editor is loaded client-side only. The server renders a lightweight shell.
 */

import dynamic from "next/dynamic";

const EditorLayout = dynamic(() => import("@/components/editor/EditorLayout"), {
  ssr: false,
  loading: () => (
    <div className="canvas-surface flex h-dvh items-center justify-center">
      <p className="rounded-md bg-surface px-3 py-2 text-[13px] font-medium shadow-lg">Opening the editor…</p>
    </div>
  ),
});

export function EditorClient() {
  return <EditorLayout />;
}
