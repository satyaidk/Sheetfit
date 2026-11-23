"use client";

/**
 * Crop and adjust mode: pan and zoom an image inside its fixed print box.
 *
 * The box (the product's real size) never changes. The overlay shows the
 * whole image, dimmed outside the box, so the user sees what is being left
 * out. Dragging pans (one finger or the mouse), pinching or the wheel zooms,
 * and the toolbar offers Fit (whole image, no crop), Fill (cover, centred),
 * Reset, Cancel and Apply. Gestures only change a local draft; Apply commits
 * one undoable change through `setView`, so a gesture is never hundreds of
 * history steps. The view is stored in source-relative terms
 * (`lib/image/image-fit.ts`), so it does not depend on screen zoom or DPI, and
 * every export uses the same window.
 */

/* eslint-disable @next/next/no-img-element -- local object URL of the source image */
import { useEffect, useRef, useState } from "react";
import { Check, Maximize, Minimize, RotateCcw, TriangleAlert, X } from "lucide-react";
import type { CropView, Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { useEditor } from "@/store/editor-store";
import {
  DEFAULT_VIEW,
  MAX_COVER_ZOOM,
  coverCroppedFraction,
  effectiveCrop,
  effectiveSourceRect,
  innerBox,
  normalizeView,
  panView,
  sourceCropRect,
  zoomView,
} from "@/lib/image/image-fit";
import { resolutionReport } from "@/lib/image/image-resolution";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function CropOverlay({
  design,
  asset,
  pan,
  pxPerMm,
}: {
  design: Design;
  asset: LoadedAsset;
  pan: { x: number; y: number };
  pxPerMm: number;
}) {
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const [opening] = useState<CropView>(() => normalizeView(design.fitMode === "cover" ? design.view : DEFAULT_VIEW));
  const [view, setDraft] = useState<CropView>(opening);
  const draft: Design = { ...design, fitMode: "cover", view };
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const apply = () => {
    useEditor.getState().setView(design.id, view);
    useEditor.getState().endCrop();
  };
  const cancel = () => useEditor.getState().endCrop();
  const fit = () => {
    useEditor.getState().setFitMode(design.id, "contain");
    useEditor.getState().endCrop();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        useEditor.getState().endCrop();
      } else if (e.key === "Enter") {
        e.preventDefault();
        useEditor.getState().setView(design.id, view);
        useEditor.getState().endCrop();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [design.id, view]);

  // Geometry in screen pixels.
  const inner = innerBox(design);
  const pad = Math.min(design.padding, design.width / 2, design.height / 2);
  const win = effectiveSourceRect(draft, natural);
  const base = sourceCropRect(natural, design.crop);
  const scale = (inner.width * pxPerMm) / win.width; // screen px per source px
  const boxW = design.width * pxPerMm;
  const boxH = design.height * pxPerMm;
  const cx = pan.x + (design.x + design.width / 2) * pxPerMm;
  const cy = pan.y + (design.y + design.height / 2) * pxPerMm;
  // Image placement relative to the box's top-left, so the window lands on the inner box.
  const imgLeft = pad * pxPerMm - win.x * scale;
  const imgTop = pad * pxPerMm - win.y * scale;
  const flip = `scale(${design.flipX ? -1 : 1}, ${design.flipY ? -1 : 1})`;

  const cropped = coverCroppedFraction(draft, natural);
  const quality = resolutionReport(natural, effectiveCrop(draft, natural), inner);

  /** Screen drag (px) to a drag in the box's own frame (mm), undoing rotation and flips. */
  const toLocalMm = (dx: number, dy: number) => {
    const rad = (-design.rotation * Math.PI) / 180;
    const lx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / pxPerMm;
    const ly = (dx * Math.sin(rad) + dy * Math.cos(rad)) / pxPerMm;
    return { x: design.flipX ? -lx : lx, y: design.flipY ? -ly : ly };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    e.preventDefault();
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.dist > 0) setDraft(zoomView(draft, natural, (pinch.current.zoom * dist) / pinch.current.dist));
      return;
    }
    const d = toLocalMm(now.x - prev.x, now.y - prev.y);
    setDraft(panView(draft, natural, d.x, d.y));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    setDraft(zoomView(draft, natural, view.zoom * Math.exp(-e.deltaY * 0.0025)));
  };

  return (
    <div className="absolute inset-0 z-40" role="dialog" aria-label="Crop and adjust image" aria-modal="true">
      {/* Dim everything; the box itself stays clear. */}
      <div className="absolute inset-0 bg-ink/35" onPointerDown={(e) => e.stopPropagation()} />
      <div
        className="absolute touch-none"
        style={{
          left: cx,
          top: cy,
          width: 0,
          height: 0,
          transform: `rotate(${design.rotation}deg)`,
        }}
      >
        <div
          className="absolute cursor-move touch-none select-none"
          style={{ left: -boxW / 2, top: -boxH / 2, width: boxW, height: boxH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          data-testid="crop-surface"
        >
          {/* Whole image, faint: shows what the crop leaves out. */}
          <div className="pointer-events-none absolute inset-0" style={{ transform: flip }}>
            <img
              src={asset.objectUrl}
              alt=""
              draggable={false}
              className="absolute max-w-none opacity-40"
              style={{ left: imgLeft, top: imgTop, width: natural.width * scale, height: natural.height * scale }}
            />
          </div>
          {/* The part that prints, at full strength, clipped to the box. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden bg-white" style={{ transform: flip }}>
            <img
              src={asset.objectUrl}
              alt=""
              draggable={false}
              className="absolute max-w-none"
              style={{ left: imgLeft, top: imgTop, width: natural.width * scale, height: natural.height * scale }}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 ring-2 ring-accent" />
          {/* Rule-of-thirds guide. */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="border border-white/40" />
            ))}
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-20 left-1/2 flex w-[min(560px,calc(100%-24px))] -translate-x-1/2 flex-col gap-2 rounded-xl bg-surface p-3 shadow-pop ring-1 ring-black/5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] font-semibold whitespace-nowrap">Crop and adjust</span>
          <Minimize className="size-4 shrink-0 text-ink-faint" aria-hidden />
          <Slider
            aria-label="Zoom"
            min={1}
            max={MAX_COVER_ZOOM}
            step={0.01}
            value={[view.zoom]}
            onValueChange={([z]) => setDraft(zoomView(draft, natural, z))}
          />
          <Maximize className="size-4 shrink-0 text-ink-faint" aria-hidden />
          <span className="tnum w-12 shrink-0 text-right text-[12px] font-medium">{Math.round(view.zoom * 100)}%</span>
        </div>
        <p className={cn("tnum text-[12px]", quality.level === "low" ? "text-danger" : "text-ink-muted")}>
          {quality.level === "low" && <TriangleAlert className="mr-1 inline size-3.5" />}
          Box stays {+design.width.toFixed(1)} × {+design.height.toFixed(1)} mm. {Math.round(cropped * 100)}% of the image is cropped away.{" "}
          {Math.round(quality.effectiveDpi)} DPI{quality.level === "low" ? ": low resolution at this zoom, the print may look soft." : "."}
          {base.width < natural.width || base.height < natural.height ? " Edge crop from the inspector also applies." : ""}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" onClick={fit} title="Show the whole image; empty space stays empty">
            Fit
          </Button>
          <Button size="sm" onClick={() => setDraft({ ...DEFAULT_VIEW })} title="Fill the box, centred">
            Fill
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(opening)} title="Back to the crop this design had when you opened it">
            <RotateCcw />
            Revert
          </Button>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" onClick={cancel}>
            <X />
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={apply}>
            <Check />
            Apply
          </Button>
        </div>
        <p className="text-[11px] text-ink-faint">Drag to move the image. Pinch, scroll or use the slider to zoom. Enter applies, Esc cancels.</p>
      </div>
    </div>
  );
}
