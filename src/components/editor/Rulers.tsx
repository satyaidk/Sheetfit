"use client";

/**
 * Millimetre rulers along the top and left of the workspace.
 *
 * Drawn on plain 2D canvases rather than in Konva because they live outside
 * the zoomable scene and only need to redraw when pan, zoom or the selection
 * changes. Tick spacing adapts to zoom so labels never collide.
 */

import { useEffect, useRef } from "react";
import type { Rect } from "@/lib/image/image-fit";

import { RULER_PX } from "@/store/editor-store";

const LABEL_STEPS = [1, 2, 5, 10, 20, 50, 100];

function chooseStep(pxPerMm: number) {
  return LABEL_STEPS.find((s) => s * pxPerMm >= 44) ?? 100;
}

function drawRuler(
  canvas: HTMLCanvasElement,
  axis: "x" | "y",
  length: number,
  offset: number,
  pxPerMm: number,
  pageLength: number,
  highlight: { start: number; end: number } | null,
) {
  const dpr = window.devicePixelRatio || 1;
  const w = axis === "x" ? length : RULER_PX;
  const h = axis === "x" ? RULER_PX : length;
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#f4f5f3";
  ctx.fillRect(0, 0, w, h);

  // Page extent shown as a lighter band.
  const p0 = offset;
  const p1 = offset + pageLength * pxPerMm;
  ctx.fillStyle = "#ffffff";
  if (axis === "x") ctx.fillRect(p0, 0, p1 - p0, h);
  else ctx.fillRect(0, p0, w, p1 - p0);

  if (highlight) {
    ctx.fillStyle = "rgba(0, 160, 224, 0.18)";
    const a = offset + highlight.start * pxPerMm;
    const b = offset + highlight.end * pxPerMm;
    if (axis === "x") ctx.fillRect(a, 0, b - a, h);
    else ctx.fillRect(0, a, w, b - a);
  }

  const step = chooseStep(pxPerMm);
  const minor = step >= 10 ? step / 10 : step >= 5 ? 1 : step / 2;
  const startMm = Math.floor(-offset / pxPerMm / minor) * minor;
  const endMm = (length - offset) / pxPerMm;
  ctx.strokeStyle = "#8a9199";
  ctx.fillStyle = "#59616a";
  ctx.font = "500 10px var(--font-archivo), sans-serif";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let mm = startMm; mm <= endMm; mm += minor) {
    const rounded = Math.round(mm * 1000) / 1000;
    const pos = Math.round(offset + rounded * pxPerMm) + 0.5;
    const isLabel = Math.abs(rounded / step - Math.round(rounded / step)) < 1e-6;
    const isMid = !isLabel && Math.abs((rounded * 2) / step - Math.round((rounded * 2) / step)) < 1e-6;
    const tick = isLabel ? RULER_PX - 6 : isMid ? 7 : 4;
    if (axis === "x") {
      ctx.moveTo(pos, RULER_PX);
      ctx.lineTo(pos, RULER_PX - tick);
    } else {
      ctx.moveTo(RULER_PX, pos);
      ctx.lineTo(RULER_PX - tick, pos);
    }
    if (isLabel) {
      const text = String(Math.round(rounded));
      if (axis === "x") {
        ctx.fillText(text, pos + 3, 10);
      } else {
        ctx.save();
        ctx.translate(10, pos - 3);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }
  }
  ctx.stroke();
  ctx.strokeStyle = "#d9dcd6";
  ctx.beginPath();
  if (axis === "x") {
    ctx.moveTo(0, RULER_PX - 0.5);
    ctx.lineTo(w, RULER_PX - 0.5);
  } else {
    ctx.moveTo(RULER_PX - 0.5, 0);
    ctx.lineTo(RULER_PX - 0.5, h);
  }
  ctx.stroke();
}

export function Rulers({
  width,
  height,
  pan,
  pxPerMm,
  page,
  highlight,
}: {
  width: number;
  height: number;
  pan: { x: number; y: number };
  pxPerMm: number;
  page: { width: number; height: number };
  highlight: Rect | null;
}) {
  const top = useRef<HTMLCanvasElement>(null);
  const left = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (top.current)
      drawRuler(top.current, "x", width, pan.x, pxPerMm, page.width,
        highlight ? { start: highlight.x, end: highlight.x + highlight.width } : null);
    if (left.current)
      drawRuler(left.current, "y", height, pan.y, pxPerMm, page.height,
        highlight ? { start: highlight.y, end: highlight.y + highlight.height } : null);
  }, [width, height, pan.x, pan.y, pxPerMm, page.width, page.height, highlight]);

  return (
    <>
      <canvas ref={top} aria-hidden className="pointer-events-none absolute top-0 left-0 z-10" />
      <canvas ref={left} aria-hidden className="pointer-events-none absolute top-0 left-0 z-10" />
      <div
        aria-hidden
        className="absolute top-0 left-0 z-20 flex items-center justify-center border-r border-b border-line bg-chrome text-[9px] font-semibold text-ink-faint"
        style={{ width: RULER_PX, height: RULER_PX }}
      >
        mm
      </div>
    </>
  );
}
