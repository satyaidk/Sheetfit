"use client";

/**
 * Inspector sections added in v0.9: how the image sits in its fixed box
 * (fit, fill, crop and adjust), two-sided cards (front and back), the cut
 * path (shape, offset, kiss or die, safe area, traced contour), quantity and
 * the rotation lock used by Auto Arrange. Every control writes real document
 * state through the store, so it is saved, undoable and used by every export.
 */

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Crop,
  ImageUp,
  Link2Off,
  Loader2,
  Scissors,
  TriangleAlert,
  Copy,
  AlignHorizontalJustifyStart,
  Grid3x3,
  Printer,
  FileDown,
} from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { CutMethod, CutSpec, Design } from "@/types/editor";
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
import {
  CUT_METHODS,
  CUT_METHOD_INFO,
  GUIDE_COLORS,
  GUIDE_WIDTHS,
  HAND_MIN_SPACING_MM,
  cricutArea,
  stickerOutlineDefaults,
} from "@/lib/cut/cut-method";
import { fillCapacity, fillTurns, twinsOf } from "@/lib/layout/fill";
import { pageSize, sheetLabel } from "@/lib/layout/sheet-layout";
import type { StrapSpec } from "@/lib/layout/strap";
import { ACCEPT_ATTR, loadAssetFromFile } from "@/lib/image/image-loader";
import { applyStrapArt, generateContour, retraceAll, uploadIntoSlot } from "@/lib/editor-actions";
import { cn } from "@/lib/utils";

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
      <p className="mt-2 text-caption leading-snug text-ink-muted">
        {design.fitMode === "cover"
          ? `The box stays ${+design.width.toFixed(1)} × ${+design.height.toFixed(1)} mm and is filled edge to edge. ${Math.round(cropped * 100)}% of the image is left out${zoomed ? " (custom crop)" : ""}; the original file is kept.`
          : "The whole image is shown; space the image does not fill stays empty. Nothing is cropped."}
      </p>
      <Button className="mt-2 w-full" size="sm" disabled={design.locked} onClick={() => startCrop(design.id)}>
        <Crop />
        Crop and adjust
      </Button>
      <p className="mt-1.5 text-caption text-ink-faint">Also: double-click the image, or press and hold it on a touch screen.</p>
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
          <p className="text-caption leading-snug text-ink-muted">
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
          <p className="text-caption text-ink-muted">
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
            <span className="text-body">Gap between front and back</span>
            <NumberField label="" className="w-28" valueMm={pairGap} unit={unit} dpi={dpi} min={0} max={100} onCommit={(v) => setPage({ pairGap: v })} />
          </div>
          {front && back && (
            <p className="tnum text-caption text-ink-muted">
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
          <p className="mt-1 text-caption text-ink-faint">
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
      <p className="mt-1.5 text-caption text-ink-muted">
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
          <p className="text-caption text-ink-muted">
            Traced from the image&apos;s transparency, {offset} mm outside it. Opaque images (JPEG) have no outline to trace: use Rectangle or
            Circle instead.
          </p>
          {cut.contour && !stale && <p className="mt-1 text-caption text-ink">{cut.contour.paths.length} closed cut path(s).</p>}
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

/**
 * Copies on the sheet (step and repeat): how many fit, one click to fill the
 * sheet, or an exact number that spills onto new pages. Spacing is the page's
 * spacing between cut lines, the same one Auto Arrange uses.
 */
export function CopiesSection({ design }: { design: Design }) {
  const page = useEditor((s) => s.doc.page);
  const designs = useEditor((s) => s.doc.designs);
  const rotate = useEditor((s) => s.arrangeOptions.rotate);
  const setArrangeOptions = useEditor((s) => s.setArrangeOptions);
  const setPage = useEditor((s) => s.setPage);
  const updateDesign = useEditor((s) => s.updateDesign);
  const unit = useEditor((s) => s.unit);
  const [n, setN] = useState(20);
  const turn = fillTurns(design, rotate);
  const cap = useMemo(
    () => fillCapacity(design, page, designs, turn),
    // Geometry that changes the count; other fields of the design do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [design.id, design.width, design.height, design.rotation, design.bleed, design.cut, designs, page.sheet, page.customSize, page.orientation, page.margins, page.spacing, page.guides.registration, turn],
  );
  const onSheet = twinsOf(design, designs).length + 1;
  const sheet = sheetLabel(page);
  const blocked = design.locked || !!design.pairId;
  const handTooTight = page.process === "sticker" && page.cutMethod === "hand" && page.spacing < HAND_MIN_SPACING_MM;
  return (
    <Section title="Copies on this sheet" aside={<span className="tnum text-caption text-ink-muted">{onSheet} now</span>}>
      <div className="rounded-lg bg-subtle p-2.5">
        <p className="text-caption leading-snug">
          {cap.here > 0 ? (
            <>
              <span className="tnum text-title font-semibold">{cap.here}</span> fit on this {sheet}
              {cap.here !== cap.empty && <span className="text-ink-muted"> ({cap.empty} on an empty sheet)</span>}
            </>
          ) : (
            <span className="text-danger">Does not fit the free space on this {sheet}.</span>
          )}
        </p>
        <Button
          variant="primary"
          size="sm"
          className="mt-2 w-full"
          disabled={blocked || cap.here < 1}
          onClick={() => {
            const r = useEditor.getState().fillSheet(design.id);
            if (r.placed > 0)
              toast.success(`${sheet} filled with ${r.placed} copies`, {
                description: `${+page.spacing.toFixed(1)} mm between cut lines${r.turned ? `, ${r.turned} turned to fit` : ""}. Nothing was resized.`,
                action: { label: "Undo", onClick: () => useEditor.getState().undo() },
              });
          }}
        >
          <Grid3x3 />
          Fill sheet{cap.here > 0 ? ` (${cap.here})` : ""}
        </Button>
      </div>
      <div className="mt-2 flex gap-1.5">
        <NumberField label="Exactly" raw valueMm={n} min={1} max={1000} onCommit={(v) => setN(Math.round(v))} />
        <Button
          size="sm"
          className="shrink-0"
          disabled={blocked}
          onClick={() => {
            const r = useEditor.getState().setQuantity(design.id, n);
            if (r.placed > 0)
              toast.success(`${r.placed} copies made`, {
                description: r.pagesAdded ? `${r.pagesAdded} new ${r.pagesAdded === 1 ? "page" : "pages"} with the same sheet.` : `All on this ${sheet}.`,
                action: { label: "Undo", onClick: () => useEditor.getState().undo() },
              });
            else if (r.suggestions[0]) toast.error(r.suggestions[0]);
          }}
        >
          <Copy />
          Make {n}
        </Button>
      </div>
      <p className="mt-1.5 text-caption leading-snug text-ink-muted">
        Copies that do not fit go on new pages with the same sheet. Every copy stays editable.
        {design.pairId ? " Card pairs: duplicate the pair instead." : ""}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3 py-1">
        <span className="text-body">Space between cut lines</span>
        <NumberField label="" className="w-28" valueMm={page.spacing} unit={unit} dpi={page.dpi} min={0} max={100} onCommit={(spacing) => setPage({ spacing })} />
      </div>
      {handTooTight && (
        <Note tone="warn" icon={<TriangleAlert />}>
          Scissors need at least {HAND_MIN_SPACING_MM} mm between stickers.
        </Note>
      )}
      <Field label="Turn copies to fit more" htmlFor={`rot-${design.id}`}>
        <Switch id={`rot-${design.id}`} checked={rotate} onCheckedChange={(v) => setArrangeOptions({ rotate: v })} />
      </Field>
      <Field label="Never turn this design" htmlFor={`lr-${design.id}`}>
        <Switch id={`lr-${design.id}`} checked={design.lockRotation} onCheckedChange={(lockRotation) => updateDesign(design.id, { lockRotation })} />
      </Field>
    </Section>
  );
}

const METHOD_ICONS: Record<CutMethod, React.ReactNode> = {
  hand: <Scissors />,
  cricut: <Printer />,
  silhouette: <Printer />,
  file: <FileDown />,
};

/** How the stickers on this page are cut (page setting): decides the printed line and the downloads. */
export function CutMethodSection() {
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  const area = cricutArea(page);
  const info = CUT_METHOD_INFO[page.cutMethod];
  return (
    <Section title="How will you cut?">
      <div role="radiogroup" aria-label="How the stickers are cut" className="grid grid-cols-2 gap-1.5">
        {CUT_METHODS.map((m) => {
          const active = page.cutMethod === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPage({ cutMethod: m })}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left ring-1 transition-colors [&_svg]:size-4",
                active ? "bg-accent-soft ring-2 ring-accent" : "ring-line hover:bg-subtle",
              )}
            >
              <span className={cn("flex items-center gap-1.5 text-body font-semibold", active && "text-accent")}>
                {METHOD_ICONS[m]}
                {CUT_METHOD_INFO[m].label}
              </span>
              <span className="text-caption leading-tight text-ink-muted">{CUT_METHOD_INFO[m].short}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-caption leading-snug text-ink-muted">{info.hint}</p>
      {page.cutMethod === "cricut" &&
        (area ? (
          <div className="mt-2 rounded-lg bg-subtle p-2.5 text-caption leading-snug">
            <p>
              Keep stickers inside the dashed <strong className="font-semibold">{area.label}</strong> area: the largest Print Then Cut image on{" "}
              {page.sheet === "a4" ? "A4" : "US Letter"} paper.
            </p>
            <Button
              size="sm"
              className="mt-1.5 w-full"
              onClick={() => {
                const size = pageSize(page);
                const mx = +((size.width - area.width) / 2).toFixed(2);
                const my = +((size.height - area.height) / 2).toFixed(2);
                setPage({ margins: { top: my, bottom: my, left: mx, right: mx } });
                toast.success("Printable area set to the Cricut Print Then Cut area", { description: "Fill sheet and Auto Arrange now keep stickers inside it." });
              }}
            >
              Use it as the printable area
            </Button>
          </div>
        ) : (
          <Note className="mt-2">Choose A4 or US Letter for the Cricut Print Then Cut size limits.</Note>
        ))}
    </Section>
  );
}

/** The printed cutting line (page setting): colour, thickness and where it sits. */
export function CutLineSection() {
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  if (page.cutMethod !== "hand") return null;
  const g = page.cutGuide;
  const set = (patch: Partial<typeof g>) => setPage({ cutGuide: { ...g, ...patch } });
  return (
    <Section title="Cutting line" aside={<span className="h-0 w-10 border-t" style={{ borderColor: g.color, borderTopWidth: Math.max(1, g.width * 4) }} aria-hidden />}>
      <p className="mb-1.5 text-caption font-medium text-ink-muted">Colour</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cutting line colour">
        {GUIDE_COLORS.map((c) => (
          <button
            key={c.color}
            type="button"
            role="radio"
            aria-checked={g.color.toLowerCase() === c.color}
            aria-label={c.label}
            title={c.label}
            onClick={() => set({ color: c.color })}
            className={cn("size-7 rounded-full ring-1 ring-ink/20", g.color.toLowerCase() === c.color && "ring-2 ring-accent ring-offset-2")}
            style={{ background: c.color }}
          />
        ))}
        <label className="relative flex h-7 items-center gap-1.5 rounded-full border border-line px-2 text-caption text-ink-muted hover:border-line-strong">
          Custom
          <input type="color" aria-label="Custom line colour" value={g.color} onChange={(e) => set({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
      <p className="mt-3 mb-1.5 text-caption font-medium text-ink-muted">Thickness</p>
      <Segmented<string>
        ariaLabel="Cutting line thickness"
        value={String(GUIDE_WIDTHS.find((w) => Math.abs(w.width - g.width) < 1e-6)?.width ?? g.width)}
        onValueChange={(v) => set({ width: Number(v) })}
        options={GUIDE_WIDTHS.map((w) => ({ value: String(w.width), label: w.label, title: `${w.width} mm` }))}
      />
      <p className="mt-3 mb-1.5 text-caption font-medium text-ink-muted">Where the line sits</p>
      <Segmented<"inside" | "centre">
        ariaLabel="Where the cutting line sits"
        value={g.placement}
        onValueChange={(placement) => set({ placement })}
        options={[
          { value: "inside", label: "Inside the edge" },
          { value: "centre", label: "On the cut" },
        ]}
      />
      <p className="mt-2 text-caption leading-snug text-ink-muted">
        {g.placement === "inside"
          ? "Cut along the outside of the line: it stays on the sticker as a thin, even outline."
          : "Cut through the middle of the line."}{" "}
        Prints in every PDF, PNG and print; artwork-only files leave it out.
      </p>
    </Section>
  );
}

/** Sticker outline: shape, border and re-trace (sticker pages). */
export function StickerOutlineSection({ design }: { design: Design }) {
  const updateDesign = useEditor((s) => s.updateDesign);
  const page = useEditor((s) => s.doc.page);
  const unit = useEditor((s) => s.unit);
  const cut = resolvedCut(design);
  const [border, setBorder] = useState(cut.shape === "contour" ? cut.offset : stickerOutlineDefaults(page.cutMethod).offsetMm);
  const [holes, setHoles] = useState(false);
  const [busy, setBusy] = useState(false);
  const stale = contourIsStale(design);
  const problems = cutPaths(design).flatMap(validatePath);
  const shape = cut.shape;
  const trace = async (offsetMm: number) => {
    setBusy(true);
    const settings = stickerOutlineDefaults(page.cutMethod, offsetMm);
    await generateContour(design.id, { ...settings, holes: page.cutMethod !== "hand" && holes });
    setBusy(false);
  };
  return (
    <Section title="Sticker outline" aside={busy ? <Loader2 className="size-4 animate-spin text-accent" /> : <Scissors className="size-4 text-ink-faint" />}>
      <Segmented<CutSpec["shape"]>
        ariaLabel="Outline shape"
        value={shape}
        onValueChange={(s) => {
          if (s === "contour") void trace(border);
          else updateDesign(design.id, { cut: { ...cut, shape: s, offset: border, radius: s === "rect" ? Math.max(cut.radius, 2) : 0, contour: null } });
        }}
        options={[
          { value: "contour", label: "Follow the art" },
          { value: "rect", label: "Rounded box" },
          { value: "ellipse", label: "Circle" },
        ]}
      />
      <div className="mt-2 flex items-end gap-1.5">
        <NumberField
          label="Border"
          valueMm={shape === "contour" ? border : cut.offset}
          unit={unit}
          dpi={page.dpi}
          min={0}
          max={20}
          onCommit={(v) => {
            setBorder(v);
            if (shape === "contour") void trace(v);
            else updateDesign(design.id, { cut: { ...cut, offset: v } });
          }}
        />
        {shape === "contour" && (
          <Button size="sm" variant="dark" className="shrink-0" disabled={!design.assetId || busy} onClick={() => void trace(border)}>
            <Scissors />
            Re-trace
          </Button>
        )}
        {shape === "rect" && (
          <NumberField label="Corner" valueMm={cut.radius} unit={unit} dpi={page.dpi} min={0} max={50} onCommit={(radius) => updateDesign(design.id, { cut: { ...cut, radius } })} />
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="mt-1.5 w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const n = await retraceAll(border);
          setBusy(false);
          toast.success(`${n} ${n === 1 ? "sticker" : "stickers"} now have a ${border} mm border`, {
            action: { label: "Undo", onClick: () => useEditor.getState().undo() },
          });
        }}
      >
        Use this border for every sticker on the page
      </Button>
      <p className="mt-1 text-caption leading-snug text-ink-muted">
        {shape === "contour"
          ? page.cutMethod === "hand"
            ? "Traced automatically: round, one piece, no slots narrower than 3 mm, so scissors can follow it."
            : "Traced automatically around the artwork (transparency, or a plain background)."
          : "A fixed shape around the artwork."}{" "}
        Typical borders are 2–4 mm.
      </p>
      {page.cutMethod !== "hand" && shape === "contour" && (
        <Field label="Cut inner holes too" htmlFor={`holes-${design.id}`}>
          <Switch
            id={`holes-${design.id}`}
            checked={holes}
            onCheckedChange={(v) => {
              setHoles(v);
              void generateContour(design.id, { ...stickerOutlineDefaults(page.cutMethod, border), holes: v });
            }}
          />
        </Field>
      )}
      {shape === "contour" && cut.contour && !stale && (
        <p className="mt-1 text-caption text-ink">
          {cut.contour.paths.length === 1 ? "One closed outline." : `${cut.contour.paths.length} closed outlines.`}
        </p>
      )}
      {stale && (
        <Note tone="warn" icon={<TriangleAlert />} className="mt-2">
          {cut.contour ? "The image, size or crop changed since the outline was traced; it is being re-traced." : "Tracing the outline…"}
        </Note>
      )}
      {problems.length > 0 && (
        <Note tone="error" icon={<TriangleAlert />} className="mt-2">
          {problems[0].message} Re-trace or pick a simpler shape.
        </Note>
      )}
      {page.cutMethod !== "hand" && (
        <div className="mt-2">
          <Segmented<CutSpec["through"]>
            ariaLabel="Cut depth"
            value={cut.through}
            onValueChange={(through) => updateDesign(design.id, { cut: { ...cut, through } })}
            options={[
              { value: "die", label: "Die-cut (through)" },
              { value: "kiss", label: "Kiss-cut (on sheet)" },
            ]}
          />
        </div>
      )}
    </Section>
  );
}

/** Lanyard / keychain strap settings: change them and every matching strap is redrawn. */
export function StrapSection({ design }: { design: Design }) {
  const assets = useEditor((s) => s.assets);
  const unit = useEditor((s) => s.unit);
  const dpi = useEditor((s) => s.doc.page.dpi);
  const designs = useEditor((s) => s.doc.designs);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const strap = design.strap;
  if (!strap) return null;
  const source = strap.sourceAssetId ? assets[strap.sourceAssetId] : undefined;
  const count = twinsOf(design, designs).length + 1;
  const redo = async (patch: Partial<StrapSpec>, art = source) => {
    if (!art) {
      useEditor.getState().updateDesign(design.id, { strap: { ...strap, ...patch } });
      return;
    }
    setBusy(true);
    const n = await applyStrapArt(design.id, art, patch);
    setBusy(false);
    if (n > 1) toast.success(`${n} straps updated`);
  };
  return (
    <Section title="Strap" aside={busy ? <Loader2 className="size-4 animate-spin text-accent" /> : <span className="tnum text-caption text-ink-muted">{count} on the page</span>}>
      <p className="tnum text-caption">
        {+design.width.toFixed(1)} mm ribbon, {+design.height.toFixed(1)} mm long
      </p>
      <Button size="sm" variant={source ? "default" : "primary"} className="mt-2 w-full" onClick={() => input.current?.click()}>
        <ImageUp />
        {source ? "Change artwork on every strap" : "Add artwork to every strap"}
      </Button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const art = await loadAssetFromFile(f);
            await redo({}, art);
          } catch {
            toast.error(`${f.name} could not be opened.`);
          }
        }}
      />
      <div className="mt-2">
        <Segmented<StrapSpec["mode"]>
          ariaLabel="Artwork on the strap"
          value={strap.mode}
          onValueChange={(mode) => void redo({ mode })}
          options={[
            { value: "once", label: "Once" },
            { value: "repeat", label: "Repeat" },
            { value: "fill", label: "Fill (crop)" },
          ]}
        />
      </div>
      <Field label="Run along the strap" htmlFor={`along-${design.id}`}>
        <Switch id={`along-${design.id}`} checked={strap.along} onCheckedChange={(along) => void redo({ along })} />
      </Field>
      <Field label="Both faces (folded at the middle)" htmlFor={`fold-${design.id}`}>
        <Switch id={`fold-${design.id}`} checked={strap.fold} onCheckedChange={(fold) => void redo({ fold })} />
      </Field>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-body">Keep ends clear</span>
        <NumberField label="" className="w-28" valueMm={strap.endZone} unit={unit} dpi={dpi} min={0} max={100} onCommit={(endZone) => void redo({ endZone })} />
      </div>
      <p className="mt-1.5 text-caption leading-snug text-ink-muted">Changes apply to every strap of this size on the page. The sheet prints mirrored for sublimation.</p>
    </Section>
  );
}
