"use client";

/**
 * Print size and fitting controls for one design.
 *
 * This is where the product's main promise is visible: the user types a box
 * size, and the panel states exactly how big the image itself will print and
 * how much of the box stays empty. Switching to the one distorting mode
 * (stretch) requires an explicit confirmation.
 */

import { useState } from "react";
import { Link2, Link2Off, TriangleAlert, Info } from "lucide-react";
import type { Design, FitMode } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { useEditor } from "@/store/editor-store";
import { boxFollowsImage, croppedSourceSize, describeFit } from "@/lib/image/image-fit";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { NumberField } from "./NumberField";
import { Note, Section } from "./Section";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const SIZE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: "50 × 50", width: 50, height: 50 },
  { label: "90 × 60", width: 90, height: 60 },
  { label: "85.6 × 54", width: 85.6, height: 54 },
  { label: "100 × 150", width: 100, height: 150 },
  { label: "180 × 250", width: 180, height: 250 },
];

const FIT_MODES: { value: FitMode; title: string; body: string }[] = [
  { value: "contain", title: "Fit entire image", body: "Whole image inside the box, centred. Default." },
  { value: "fit-width", title: "Fit width", body: "Matches the width; height follows the image." },
  { value: "fit-height", title: "Fit height", body: "Matches the height; width follows the image." },
  { value: "fill", title: "Fill remaining space", body: "Whole image, empty area painted with a colour." },
  { value: "manual", title: "Manual scale", body: "Box hugs the image. Drag the corners to scale." },
  { value: "stretch", title: "Stretch to box", body: "Distorts the image to fill the box exactly." },
];

export function DimensionControls({ design, asset }: { design: Design; asset: LoadedAsset }) {
  const unit = useEditor((s) => s.unit);
  const dpi = useEditor((s) => s.doc.page.dpi);
  const resizeDesign = useEditor((s) => s.resizeDesign);
  const updateDesign = useEditor((s) => s.updateDesign);
  const setFitMode = useEditor((s) => s.setFitMode);
  const [confirmStretch, setConfirmStretch] = useState(false);

  const source = croppedSourceSize({ width: asset.naturalWidth, height: asset.naturalHeight }, design.crop);
  const fit = describeFit(design, source);
  const derived = boxFollowsImage(design.fitMode);
  const fmt = (mm: number) => formatUnit(mm, unit, dpi);

  const applyPreset = (w: number, h: number) => {
    // Presets set the box; the image is fitted inside without cropping.
    if (design.fitMode === "manual" || design.fitMode === "fit-width" || design.fitMode === "fit-height") {
      setFitMode(design.id, "contain");
    }
    updateDesign(design.id, {
      width: w,
      height: h,
      lockAspect: false,
      x: design.x + design.width / 2 - w / 2,
      y: design.y + design.height / 2 - h / 2,
    });
  };

  const onPickMode = (mode: FitMode) => {
    if (mode === "stretch" && fit.aspectMismatch) setConfirmStretch(true);
    else setFitMode(design.id, mode);
  };

  return (
    <>
      <Section title="Print size">
        <div className="flex items-center gap-1.5">
          <NumberField
            label="W"
            valueMm={design.width}
            unit={unit}
            dpi={dpi}
            min={1}
            max={1000}
            disabled={design.fitMode === "fit-height"}
            onCommit={(width) => resizeDesign(design.id, { width })}
          />
          <Tooltip label={design.lockAspect ? "Unlock aspect ratio" : "Lock to image proportions"}>
            <button
              type="button"
              aria-pressed={design.lockAspect}
              aria-label="Lock aspect ratio"
              disabled={design.fitMode === "manual" || design.fitMode === "stretch"}
              onClick={() => {
                const lock = !design.lockAspect;
                updateDesign(design.id, { lockAspect: lock });
                if (lock) resizeDesign(design.id, { width: design.width });
              }}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md border disabled:opacity-40",
                design.lockAspect ? "border-cyan bg-cyan-wash text-cyan" : "border-line bg-surface text-ink-muted",
              )}
            >
              {design.lockAspect ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
            </button>
          </Tooltip>
          <NumberField
            label="H"
            valueMm={design.height}
            unit={unit}
            dpi={dpi}
            min={1}
            max={1000}
            disabled={design.fitMode === "fit-width" || design.fitMode === "manual"}
            onCommit={(height) => resizeDesign(design.id, { height })}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Size presets in millimetres">
          {SIZE_PRESETS.map((p) => {
            const active = Math.abs(p.width - design.width) < 0.05 && Math.abs(p.height - design.height) < 0.05;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.width, p.height)}
                className={cn(
                  "tnum h-6 rounded-[4px] border px-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-cyan bg-cyan-wash text-cyan"
                    : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          {fit.distorted ? (
            <Note tone="warn" icon={<TriangleAlert />}>
              The image is stretched to {fmt(fit.image.width)} × {fmt(fit.image.height)} {unit} and no longer keeps its
              proportions.
            </Note>
          ) : fit.aspectMismatch ? (
            <Note icon={<Info />}>
              The image prints at{" "}
              <strong className="tnum font-semibold text-ink">
                {fmt(fit.image.width)} × {fmt(fit.image.height)} {unit}
              </strong>
              . Its shape differs from the box, so{" "}
              {fit.unusedWidth > 0.05 ? `${fmt(fit.unusedWidth)} ${unit} of width` : `${fmt(fit.unusedHeight)} ${unit} of height`}{" "}
              stays {design.fitMode === "fill" && design.fillColor ? "filled with the background" : "empty"}. Nothing is
              cropped.
            </Note>
          ) : (
            <Note tone="ok">
              The whole image fills the box at{" "}
              <strong className="tnum font-semibold">
                {fmt(fit.image.width)} × {fmt(fit.image.height)} {unit}
              </strong>
              .
            </Note>
          )}
        </div>
        {derived && design.fitMode !== "manual" && (
          <p className="mt-2 text-[12px] text-ink-muted">
            {design.fitMode === "fit-width" ? "Height" : "Width"} is calculated from the image proportions.
          </p>
        )}
      </Section>

      <Section title="Fitting">
        <div role="radiogroup" aria-label="Fitting mode" className="flex flex-col gap-1">
          {FIT_MODES.map((m) => {
            const active = design.fitMode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => !active && onPickMode(m.value)}
                className={cn(
                  "flex items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors",
                  active ? "border-cyan bg-cyan-wash" : "border-transparent hover:bg-chrome-sunk",
                )}
              >
                <FitGlyph mode={m.value} active={active} />
                <span className="min-w-0">
                  <span className={cn("block text-[13px] font-medium", m.value === "stretch" && !active && "text-ink-muted")}>
                    {m.title}
                  </span>
                  <span className="block text-[12px] leading-snug text-ink-muted">{m.body}</span>
                </span>
              </button>
            );
          })}
        </div>

        {design.fitMode === "fill" && (
          <div className="mt-3">
            <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Background in the box</p>
            <ColorChoices
              value={design.fillColor}
              onChange={(fillColor) => updateDesign(design.id, { fillColor })}
            />
          </div>
        )}

        {(design.fitMode === "contain" || design.fitMode === "fill") && fit.aspectMismatch && (
          <div className="mt-3">
            <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Position inside the box</p>
            <AlignGrid
              alignX={design.alignX}
              alignY={design.alignY}
              onChange={(alignX, alignY) => updateDesign(design.id, { alignX, alignY })}
            />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[13px]">Padding</span>
          <NumberField
            label=""
            className="w-28"
            valueMm={design.padding}
            unit={unit}
            dpi={dpi}
            min={0}
            max={Math.min(design.width, design.height) / 2 - 0.5}
            onCommit={(padding) => updateDesign(design.id, { padding })}
          />
        </div>
      </Section>

      <AlertDialog open={confirmStretch} onOpenChange={setConfirmStretch}>
        <AlertDialogContent
          title="Stretch the image?"
          description={
            <>
              The image is {fit.sourceAspect.toFixed(2)}:1 and the box is {fit.boxAspect.toFixed(2)}:1. Stretching fills
              the box by distorting the design, so circles print as ovals and text looks squashed. You can undo this.
            </>
          }
          confirmLabel="Stretch image"
          onConfirm={() => setFitMode(design.id, "stretch")}
        />
      </AlertDialog>
    </>
  );
}

const SWATCHES = ["#ffffff", "#000000", "#f2f0eb", "#1f3b6f", "#c0185a", "#f2c14e"];

export function ColorChoices({
  value,
  onChange,
  allowTransparent = true,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  allowTransparent?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowTransparent && (
        <button
          type="button"
          aria-label="Transparent"
          title="Transparent"
          onClick={() => onChange(null)}
          className={cn(
            "size-7 rounded-md border bg-[conic-gradient(#e6e8e4_25%,#fff_0_50%,#e6e8e4_0_75%,#fff_0)] bg-[length:10px_10px]",
            value === null ? "ring-2 ring-cyan ring-offset-1" : "border-line",
          )}
        />
      )}
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colour ${c}`}
          title={c}
          onClick={() => onChange(c)}
          className={cn(
            "size-7 rounded-md border border-line",
            value?.toLowerCase() === c && "ring-2 ring-cyan ring-offset-1",
          )}
          style={{ background: c }}
        />
      ))}
      <label className="relative flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 text-[12px] text-ink-muted hover:border-line-strong">
        <span className="size-4 rounded-[3px] border border-line" style={{ background: value ?? "transparent" }} />
        Custom
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value ?? "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom colour"
        />
      </label>
    </div>
  );
}

function AlignGrid({
  alignX,
  alignY,
  onChange,
}: {
  alignX: Design["alignX"];
  alignY: Design["alignY"];
  onChange: (x: Design["alignX"], y: Design["alignY"]) => void;
}) {
  const steps = ["start", "center", "end"] as const;
  return (
    <div className="grid w-fit grid-cols-3 gap-0.5 rounded-md border border-line bg-chrome-sunk p-0.5" role="group" aria-label="Image position in box">
      {steps.map((y) =>
        steps.map((x) => {
          const active = x === alignX && y === alignY;
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              aria-label={`Align ${y === "start" ? "top" : y === "end" ? "bottom" : "middle"} ${x === "start" ? "left" : x === "end" ? "right" : "centre"}`}
              aria-pressed={active}
              onClick={() => onChange(x, y)}
              className={cn("flex size-6 items-center justify-center rounded-[3px]", active ? "bg-surface shadow-[0_0_0_1px_var(--line)]" : "hover:bg-surface/60")}
            >
              <span className={cn("size-1.5 rounded-full", active ? "bg-cyan" : "bg-ink-faint")} />
            </button>
          );
        }),
      )}
    </div>
  );
}

/** Tiny diagram of each fitting mode: box outline plus where the image goes. */
function FitGlyph({ mode, active }: { mode: FitMode; active: boolean }) {
  const stroke = active ? "var(--cyan)" : "var(--ink-faint)";
  const fill = active ? "var(--cyan)" : "var(--ink-muted)";
  const img: Record<FitMode, { x: number; y: number; w: number; h: number }> = {
    contain: { x: 8, y: 2, w: 12, h: 12 },
    "fit-width": { x: 2, y: 1, w: 24, h: 14 },
    "fit-height": { x: 7, y: 2, w: 14, h: 12 },
    fill: { x: 8, y: 2, w: 12, h: 12 },
    manual: { x: 6, y: 3, w: 10, h: 10 },
    stretch: { x: 2, y: 2, w: 24, h: 12 },
  };
  const r = img[mode];
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden className="mt-0.5 shrink-0">
      {mode === "fill" && <rect x="2" y="2" width="24" height="12" fill={fill} opacity="0.18" />}
      <rect x="2" y="2" width="24" height="12" fill="none" stroke={stroke} strokeDasharray={mode === "manual" ? "2 2" : undefined} />
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={fill} opacity={mode === "stretch" ? 0.55 : 0.85} rx="1" />
      {mode !== "stretch" && <circle cx={r.x + r.w / 2} cy={r.y + r.h / 2} r={Math.min(r.w, r.h) / 4} fill="#fff" />}
      {mode === "stretch" && <ellipse cx="14" cy="8" rx="8" ry="3" fill="#fff" />}
    </svg>
  );
}
