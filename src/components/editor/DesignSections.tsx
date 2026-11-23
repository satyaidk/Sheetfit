"use client";

/**
 * Inspector sections added in v0.9: how the image sits in its fixed box
 * (fit, fill, crop and adjust), two-sided cards (front and back), the cut
 * path (shape, offset, kiss or die, safe area, traced contour), quantity and
 * the rotation lock used by Auto Arrange. Every control writes real document
 * state through the store, so it is saved, undoable and used by every export.
 */

import { useRef, useState } from "react";
import { ArrowLeftRight, Crop, ImageUp, Link2Off, Loader2, Scissors, TriangleAlert, Copy, AlignHorizontalJustifyStart } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { CutSpec, Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/settings/NumberField";
import { Field, Note, Section } from "@/components/settings/Section";
import { coverCroppedFraction } from "@/lib/image/image-fit";
import { findProduct, sidesOf } from "@/lib/catalogue/products";
import { measuredPairGap, pairMembers, partnerOf } from "@/lib/layout/card-pair";
import { contourIsStale, cutPaths, resolvedCut, validatePath } from "@/lib/cut/cut-path";
import { ACCEPT_ATTR } from "@/lib/image/image-loader";
import { generateContour, uploadIntoSlot } from "@/lib/editor-actions";

/** Fit (whole image), Fill (cover the box, crop the excess) and crop and adjust. */
export function ImageFitSection({ design, asset }: { design: Design; asset: LoadedAsset }) {
  const setFitMode = useEditor((s) => s.setFitMode);
  const setView = useEditor((s) => s.setView);
  const startCrop = useEditor((s) => s.startCrop);
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const value = design.fitMode === "cover" ? "cover" : design.fitMode === "contain" || design.fitMode === "fill" ? "contain" : "other";
  const cropped = coverCroppedFraction(design, natural);
  const zoomed = design.fitMode === "cover" && design.view && (design.view.zoom > 1.001 || design.view.x !== 0.5 || design.view.y !== 0.5);
  return (
    <Section title="Image in the box">
      <Segmented<string>
        ariaLabel="How the image fills the box"
        value={value}
        onValueChange={(v) => {
          if (v === "contain") setFitMode(design.id, "contain");
          else if (v === "cover") setView(design.id, design.fitMode === "cover" ? design.view : null);
        }}
        options={[
          { value: "contain", label: "Fit whole image" },
          { value: "cover", label: "Fill box (crop)" },
          ...(value === "other" ? [{ value: "other", label: "Other" }] : []),
        ]}
      />
      <p className="mt-2 text-[12px] leading-snug text-ink-muted">
        {design.fitMode === "cover"
          ? `The box stays ${+design.width.toFixed(1)} × ${+design.height.toFixed(1)} mm and is filled edge to edge. ${Math.round(cropped * 100)}% of the image is left out${zoomed ? " (custom crop)" : ""}; the original file is kept.`
          : "The whole image is shown; space the image does not fill stays empty. Nothing is cropped."}
      </p>
      <Button className="mt-2 w-full" size="sm" disabled={design.locked} onClick={() => startCrop(design.id)}>
        <Crop />
        Crop and adjust
      </Button>
      <p className="mt-1.5 text-[11.5px] text-ink-faint">Also: double-click the image, or press and hold it on a touch screen.</p>
    </Section>
  );
}

/** Two-sided cards: which side this is, its partner, and pair actions. */
export function CardSection({ design }: { design: Design }) {
  const designs = useEditor((s) => s.doc.designs);
  const pairGap = useEditor((s) => s.doc.page.pairGap);
  const unit = useEditor((s) => s.unit);
  const dpi = useEditor((s) => s.doc.page.dpi);
  const setPage = useEditor((s) => s.setPage);
  const product = findProduct(design.productId);
  const twoSided = sidesOf(product) === 2;
  const input = useRef<HTMLInputElement>(null);
  if (!twoSided && !design.pairId) return null;
  const partner = partnerOf(designs, design);
  const [front, back] = pairMembers(designs, design.pairId);
  const s = useEditor.getState;
  return (
    <Section title="Front and back">
      {!partner ? (
        <>
          <p className="text-[12px] leading-snug text-ink-muted">
            One-sided: only this design prints. A back is never added by itself. Add one to print both sides side by side.
          </p>
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" variant="dark" className="flex-1" onClick={() => s().addCardBack(design.id)} disabled={design.side === "back"}>
              Add back side
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12px] text-ink-muted">
            This is the <span className="font-semibold text-ink">{design.side}</span>. Front and back move, copy and arrange together; edit
            either side on its own.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Button size="sm" onClick={() => front && s().select([front.id], "replace", { exact: true })} disabled={front?.id === design.id && s().selection.length === 1}>
              Select front
            </Button>
            <Button size="sm" onClick={() => back && s().select([back.id], "replace", { exact: true })} disabled={back?.id === design.id && s().selection.length === 1}>
              Select back
            </Button>
            <Button size="sm" onClick={() => s().swapSides(design.id)}>
              <ArrowLeftRight />
              Swap sides
            </Button>
            <Button size="sm" onClick={() => s().realignPair(design.id)}>
              <AlignHorizontalJustifyStart />
              Re-align
            </Button>
          </div>
          {!design.assetId && (
            <>
              <Button className="mt-1.5 w-full" size="sm" variant="primary" onClick={() => input.current?.click()}>
                <ImageUp />
                Add {design.side} image
              </Button>
              <input
                ref={input}
                type="file"
                accept={ACCEPT_ATTR}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadIntoSlot(f, design.id);
                  e.target.value = "";
                }}
              />
            </>
          )}
          <div className="mt-2 flex items-center justify-between gap-3 py-1">
            <span className="text-[13px]">Gap between front and back</span>
            <NumberField label="" className="w-28" valueMm={pairGap} unit={unit} dpi={dpi} min={0} max={100} onCommit={(v) => setPage({ pairGap: v })} />
          </div>
          {front && back && (
            <p className="tnum text-[12px] text-ink-muted">
              Measured between cut paths: {+measuredPairGap(front, back).toFixed(2)} mm
              {measuredPairGap(front, back) > pairGap + 0.01 ? " (bleeds need more room than the gap)" : ""}.
            </p>
          )}
          <Button
            className="mt-2 w-full"
            size="sm"
            variant="ghost"
            onClick={() => {
              if (window.confirm("Unlink front and back? Both designs stay on the sheet as separate one-sided designs.")) s().unlinkPair(design.id);
            }}
          >
            <Link2Off />
            Unlink pair
          </Button>
          <p className="mt-1 text-[11.5px] text-ink-faint">
            Labels are editor-only and never print. The output mirror (Sheet settings) applies to both sides alike.
          </p>
        </>
      )}
    </Section>
  );
}

const SHAPES: { value: CutSpec["shape"]; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "ellipse", label: "Circle / oval" },
  { value: "contour", label: "Contour" },
];

/** The cut path: shape, offset, kiss or die, safe area and a traced contour. */
export function CutSection({ design }: { design: Design }) {
  const updateDesign = useEditor((s) => s.updateDesign);
  const unit = useEditor((s) => s.unit);
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  const cut = resolvedCut(design);
  const [offset, setOffset] = useState(cut.shape === "contour" ? cut.offset : 2);
  const [holes, setHoles] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<CutSpec>) => updateDesign(design.id, { cut: { ...cut, ...p } });
  const stale = contourIsStale(design);
  const problems = cutPaths(design).flatMap(validatePath);
  return (
    <Section title="Cut path" aside={<Scissors className="size-4 text-ink-faint" />}>
      <Segmented<CutSpec["shape"]> ariaLabel="Cut shape" value={cut.shape} onValueChange={(shape) => patch({ shape })} options={SHAPES} />
      <div className="mt-2">
        <Segmented<CutSpec["through"]>
          ariaLabel="Cut depth"
          value={cut.through}
          onValueChange={(through) => patch({ through })}
          options={[
            { value: "die", label: "Die-cut (through backing)" },
            { value: "kiss", label: "Kiss-cut (sticker only)" },
          ]}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {cut.shape === "rect" && (
          <NumberField label="R" valueMm={cut.radius} unit={unit} dpi={page.dpi} min={0} max={100} onCommit={(radius) => patch({ radius })} />
        )}
        {cut.shape !== "contour" && (
          <NumberField label="Offset" valueMm={cut.offset} unit={unit} dpi={page.dpi} min={-20} max={20} onCommit={(o) => patch({ offset: o })} />
        )}
        {cut.shape !== "contour" && (
          <NumberField label="Safe" valueMm={cut.safeInset} unit={unit} dpi={page.dpi} min={0} max={50} onCommit={(safeInset) => patch({ safeInset })} />
        )}
        <NumberField label="Bleed" valueMm={design.bleed} unit={unit} dpi={page.dpi} min={0} max={20} onCommit={(bleed) => updateDesign(design.id, { bleed })} />
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-muted">
        The cut follows the trim (box minus bleed). Offset moves it out (+) or in (−); the safe area is a guide for text. Bleed is artwork
        past the cut.
      </p>
      {cut.shape === "contour" && (
        <div className="mt-2 rounded-lg bg-subtle p-2.5">
          <div className="flex items-end gap-1.5">
            <NumberField label="Border" valueMm={offset} unit={unit} dpi={page.dpi} min={0} max={20} onCommit={setOffset} />
            <Button
              size="sm"
              variant="dark"
              className="shrink-0"
              disabled={!design.assetId || busy}
              onClick={async () => {
                setBusy(true);
                await generateContour(design.id, { offsetMm: offset, holes });
                setBusy(false);
              }}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Scissors />}
              {cut.contour ? "Re-trace" : "Trace contour"}
            </Button>
          </div>
          <Field label="Cut inner holes too" htmlFor={`holes-${design.id}`}>
            <Switch id={`holes-${design.id}`} checked={holes} onCheckedChange={setHoles} />
          </Field>
          <p className="text-[11.5px] text-ink-muted">
            Traced from the image&apos;s transparency, {offset} mm outside it. Opaque images (JPEG) have no outline to trace: use Rectangle or
            Circle instead.
          </p>
          {cut.contour && !stale && <p className="mt-1 text-[12px] text-ink">{cut.contour.paths.length} closed cut path(s).</p>}
          {stale && (
            <Note tone="warn" icon={<TriangleAlert />} className="mt-2">
              {cut.contour ? "The image, size or crop changed since the contour was traced. Re-trace it." : "No contour yet: the trim rectangle is used until you trace one."}
            </Note>
          )}
        </div>
      )}
      {problems.length > 0 && (
        <Note tone="error" icon={<TriangleAlert />} className="mt-2">
          {problems[0].message} Re-trace or pick a simpler shape.
        </Note>
      )}
      <Field label="Show cut lines in prints and PDFs" htmlFor={`cl-${design.id}`}>
        <Switch id={`cl-${design.id}`} checked={page.guides.cutlines} onCheckedChange={(cutlines) => setPage({ guides: { ...page.guides, cutlines } })} />
      </Field>
    </Section>
  );
}

/** Quantity (packed with Auto Arrange) and the rotation lock. */
export function QuantitySection({ design }: { design: Design }) {
  const [n, setN] = useState(10);
  const setQuantity = useEditor((s) => s.setQuantity);
  const updateDesign = useEditor((s) => s.updateDesign);
  const report = useEditor((s) => s.lastLayoutReport);
  const [ran, setRan] = useState(false);
  return (
    <Section title="Quantity">
      <div className="flex gap-1.5">
        <NumberField label="Total" raw valueMm={n} min={1} max={500} onCommit={(v) => setN(Math.round(v))} />
        <Button
          size="sm"
          variant="dark"
          className="shrink-0"
          disabled={design.locked || !!design.pairId}
          onClick={() => {
            setQuantity(design.id, n);
            setRan(true);
          }}
        >
          <Copy />
          Make {n}
        </Button>
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-muted">
        Adds copies until there are {n} and packs them with Auto Arrange at the sheet&apos;s gap. Each copy stays editable.
        {design.pairId ? " For card pairs, duplicate the pair instead." : ""}
      </p>
      {ran && report && report.unplaced > 0 && (
        <Note tone="warn" icon={<TriangleAlert />} className="mt-2">
          {report.unplaced} copies did not fit and sit on top of the original; turn on &ldquo;Add pages for the rest&rdquo; in Auto Arrange.
        </Note>
      )}
      <Field label="Never turn when arranging" htmlFor={`lr-${design.id}`}>
        <Switch id={`lr-${design.id}`} checked={design.lockRotation} onCheckedChange={(lockRotation) => updateDesign(design.id, { lockRotation })} />
      </Field>
    </Section>
  );
}
