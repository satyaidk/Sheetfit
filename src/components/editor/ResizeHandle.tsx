"use client";

/**
 * Drag handle on a panel edge (the "window splitter" pattern of VS Code and
 * Figma): drag to resize, or focus it and use the arrow keys (Shift for
 * bigger steps), Home and End for the limits, Enter or a double-click for the
 * default width. Exposed as a focusable `separator` with its current value,
 * so screen readers announce the width. The width is live while dragging and
 * saved in the browser when the drag ends.
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function ResizeHandle({
  label,
  edge,
  width,
  min,
  max,
  onResize,
  onCommit,
  onReset,
}: {
  label: string;
  /** Which edge of the panel the handle sits on. */
  edge: "left" | "right";
  width: number;
  min: number;
  max: number;
  /** Live width while dragging or stepping (already within min and max). */
  onResize: (width: number) => void;
  /** Width to keep once the gesture ends. */
  onCommit: (width: number) => void;
  onReset: () => void;
}) {
  const drag = useRef<{ x: number; width: number; last: number } | null>(null);
  const clamp = (w: number) => Math.round(Math.min(max, Math.max(min, w)));
  // A handle on the right edge widens the panel when moved right; on the left edge, when moved left.
  const sign = edge === "right" ? 1 : -1;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, width, last: width };
        document.documentElement.style.cursor = "col-resize";
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const next = clamp(d.width + sign * (e.clientX - d.x));
        if (next !== d.last) {
          d.last = next;
          onResize(next);
        }
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        document.documentElement.style.cursor = "";
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        if (d) onCommit(d.last);
      }}
      onPointerCancel={() => {
        const d = drag.current;
        drag.current = null;
        document.documentElement.style.cursor = "";
        if (d) onCommit(d.last);
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 64 : 16;
        let next: number | null = null;
        if (e.key === "ArrowLeft") next = clamp(width - sign * step);
        else if (e.key === "ArrowRight") next = clamp(width + sign * step);
        else if (e.key === "Home") next = min;
        else if (e.key === "End") next = max;
        else if (e.key === "Enter") {
          e.preventDefault();
          onReset();
          return;
        }
        if (next === null) return;
        e.preventDefault();
        onResize(next);
        onCommit(next);
      }}
      className={cn(
        "group absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none outline-none",
        edge === "right" ? "-right-1" : "-left-1",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors duration-(--duration-fast) group-hover:bg-accent group-focus-visible:bg-accent group-active:bg-accent"
      />
    </div>
  );
}
