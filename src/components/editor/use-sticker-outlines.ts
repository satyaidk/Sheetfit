"use client";

/**
 * Automatic sticker outlines.
 *
 * On a sticker page, every design gets a cut outline without a manual step:
 * after an upload, a drop into a box, a sample design, a replaced image, a
 * resize, or switching the page to Stickers. One watcher covers all of those
 * paths instead of each upload function remembering to trace.
 *
 * Rules:
 * - Only designs with no cut yet, or with a traced contour that no longer
 *   matches the image, size or crop, are traced. A shape the user picked
 *   (rectangle, circle) is never replaced.
 * - Nothing runs while a drag, resize or crop is in progress.
 * - Each set of inputs is traced at most once, so undo never triggers a
 *   re-trace, and the outline is folded into the user's own undo step (the
 *   upload or resize), so one Undo removes both.
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { useEditor } from "@/store/editor-store";
import type { Design } from "@/types/editor";
import { contourIsStale, contourKey } from "@/lib/cut/cut-path";
import { autoOutline, type OutlineResult } from "@/lib/editor-actions";
import { CUT_METHOD_INFO } from "@/lib/cut/cut-method";

export function needsOutline(d: Design): boolean {
  if (!d.assetId || d.locked) return false;
  if (d.cut === null) return true;
  return d.cut.shape === "contour" && contourIsStale(d);
}

const inputsKey = (d: Design) => `${d.id}|${contourKey(d)}|${d.width.toFixed(3)}|${d.height.toFixed(3)}|${d.cut?.offset ?? ""}`;

function announce(results: OutlineResult[]) {
  const shaped = results.filter((r) => r.kind === "contour").length;
  const rect = results.filter((r) => r.kind === "shape").length;
  const page = useEditor.getState().doc.page;
  if (shaped > 0) {
    toast.success(shaped === 1 ? "Sticker outline added" : `${shaped} sticker outlines added`, {
      id: "sticker-outline",
      description:
        page.cutMethod === "hand"
          ? `A thin cutting line prints around ${shaped === 1 ? "it" : "each one"}. Change the border or line in Cut.`
          : `Ready for ${CUT_METHOD_INFO[page.cutMethod].label}. Change the border in Cut.`,
    });
  }
  if (rect > 0) {
    toast(`${rect === 1 ? "An image has" : `${rect} images have`} no transparent or plain background`, {
      id: "sticker-outline-rect",
      description: "It is cut as a rounded rectangle. Use Remove background or a transparent PNG for a shaped outline.",
    });
  }
}

export function useStickerOutlines() {
  useEffect(() => {
    const tried = new Set<string>();
    let busy = false;
    let timer: number | undefined;
    let disposed = false;

    const run = async () => {
      if (busy || disposed) return;
      const s = useEditor.getState();
      if (s.doc.page.process !== "sticker" || s.interacting || s.cropEditing) return;
      const todo = s.doc.designs.filter((d) => needsOutline(d) && !tried.has(inputsKey(d)));
      if (todo.length === 0) return;
      busy = true;
      const results: OutlineResult[] = [];
      try {
        for (const d of todo) {
          tried.add(inputsKey(d));
          const before = useEditor.getState().doc;
          const [r] = await autoOutline([d.id]);
          if (r) results.push(r);
          const after = useEditor.getState();
          // Fold the outline into the step that caused it (upload, resize, replace).
          if (after.doc !== before && after.past[after.past.length - 1] === before) {
            useEditor.setState({ past: after.past.slice(0, -1) });
          }
          const traced = after.doc.designs.find((x) => x.id === d.id);
          if (traced) tried.add(inputsKey(traced));
        }
      } finally {
        busy = false;
      }
      if (!disposed) announce(results);
      schedule();
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), 200);
    };

    const unsubscribe = useEditor.subscribe((s, prev) => {
      if (s.doc !== prev.doc || s.interacting !== prev.interacting || s.cropEditing !== prev.cropEditing) schedule();
    });
    schedule();
    return () => {
      disposed = true;
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
}
