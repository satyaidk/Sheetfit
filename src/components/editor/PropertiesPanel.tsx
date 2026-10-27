"use client";

/**
 * Right-hand properties panel. Shows precise controls for the selection:
 * nothing selected → sheet summary; one design → every property; several
 * designs → alignment, grouping and arrangement.
 */

import { useRef, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Crop,
  Group as GroupIcon,
  ImageUp,
  Lock,
  LockOpen,
  RotateCcw,
  RotateCw,
  Trash2,
  TriangleAlert,
  Ungroup,
  Grid3x3,
  Crosshair,
} from "lucide-react";
import { useEditor, selectedDesigns } from "@/store/editor-store";
import type { Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/settings/NumberField";
import { DimensionControls } from "@/components/settings/DimensionControls";
import { Field, Note, Section } from "@/components/settings/Section";
import { computeImageRect, croppedSourceSize, aspectRatio } from "@/lib/image/image-fit";
import { QUALITY_COPY, resolutionReport } from "@/lib/image/image-resolution";
import { placementStatus } from "@/lib/layout/sheet-layout";
import type { AlignTarget } from "@/lib/layout/alignment";
import { gridCapacity } from "@/lib/layout/auto-arrange";
import { designBounds, printableRect } from "@/lib/layout/sheet-layout";
import { replaceDesignImage, uploadIntoSlot } from "@/lib/editor-actions";
import { findProduct, minSheetFor } from "@/lib/catalogue/products";
import { MockupCard, SampleStrip } from "@/components/products/MockupPreview";
import { pageSize, sheetLabel } from "@/lib/layout/sheet-layout";
import { ACCEPT_ATTR, megapixels } from "@/lib/image/image-loader";
import { cn } from "@/lib/utils";

export function PropertiesPanel() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const assets = useEditor((s) => s.assets);
  const picked = selectedDesigns({ doc, selection });

  if (picked.length === 0) return <SheetSummary />;
  if (picked.length > 1) return <MultiSelection designs={picked} />;
  const design = picked[0];
  if (!design.assetId) return <SlotInspector key={design.id} design={design} />;
  const asset = assets[design.assetId];
  if (!asset) return null;
  return <SingleDesign key={design.id} design={design} asset={asset} />;
}

/** Inspector for an empty product box: what it is, its real size, how to fill it. */
function SlotInspector({ design }: { design: Design }) {
  const unit = useEditor((s) => s.unit);
  const page = useEditor((s) => s.doc.page);
  const resizeDesign = useEditor((s) => s.resizeDesign);
  const moveDesigns = useEditor((s) => s.moveDesigns);
  const updateDesign = useEditor((s) => s.updateDesign);
  const input = useRef<HTMLInputElement>(null);
  const product = findProduct(design.productId);
  const sheet = product ? minSheetFor(product) : null;
  const status = placementStatus(design, page);
  const host = product ? new URL(product.source).hostname.replace(/^www\./, "") : null;

  return (
    <div>
      {product && (
        <Section title={`${product.name} preview`}>
          <MockupCard design={design} />
        </Section>
      )}
      <Section title={product ? product.name : "Empty box"}>
        {product && (
          <div className="mb-3">
            <div className="min-w-0 text-[12px] leading-relaxed">
              <p className="text-[13px] font-semibold">{product.detail}</p>
              <p className="text-ink-muted">
                Print area {+product.width.toFixed(1)} × {+product.height.toFixed(1)} mm
                {product.wrap ? ", wraps around" : ""}
              </p>
              <p className="text-ink-muted">
                {design.bleed > 0 ? `Box includes ${design.bleed} mm bleed per side.` : product.wrap ? "Box includes 6 mm seam overlap." : "No bleed."}
              </p>
              <p className="text-ink-muted">Smallest sheet: {sheet ? sheet.name : "a roll"}</p>
            </div>
          </div>
        )}
        <Button variant="primary" className="w-full" onClick={() => input.current?.click()}>
          <ImageUp />
          Add image
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
        <p className="mt-2 text-[12px] text-ink-muted">Or drag an image from your computer or from Uploads onto the box.</p>
        {product && (
          <div className="mt-3">
            <SampleStrip design={design} />
          </div>
        )}
        {product?.note && <Note className="mt-3">{product.note}</Note>}
        {host && (
          <p className="mt-2 text-[11.5px] text-ink-faint">
            Size source: <a href={product!.source} target="_blank" rel="noreferrer" className="underline hover:text-ink">{host}</a>,{" "}
            {product!.confidence} confidence. Blanks vary by brand; adjust if yours differs.
          </p>
        )}
      </Section>
      <Section title="Size and position">
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="W" valueMm={design.width} unit={unit} dpi={page.dpi} min={1} max={6000} onCommit={(width) => resizeDesign(design.id, { width })} />
          <NumberField label="H" valueMm={design.height} unit={unit} dpi={page.dpi} min={1} max={6000} onCommit={(height) => resizeDesign(design.id, { height })} />
          <NumberField label="X" valueMm={design.x} unit={unit} dpi={page.dpi} onCommit={(x) => moveDesigns([{ id: design.id, x, y: design.y }])} />
          <NumberField label="Y" valueMm={design.y} unit={unit} dpi={page.dpi} onCommit={(y) => moveDesigns([{ id: design.id, x: design.x, y }])} />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <NumberField label="R" raw suffix="°" valueMm={design.rotation} min={-360} max={360} onCommit={(rotation) => updateDesign(design.id, { rotation })} />
          <Button size="icon" aria-label="Rotate 90° right" onClick={() => updateDesign(design.id, { rotation: (design.rotation + 90) % 360 })}>
            <RotateCw />
          </Button>
        </div>
        {status.exceedsPrintable && (
          <Note tone="error" icon={<TriangleAlert />} className="mt-3">
            {status.largerThanPrintable ? "This box is larger than the printable area of this sheet." : "Part of this box is outside the printable area."}
          </Note>
        )}
      </Section>
      <RepeatSection design={design} />
      <Section title="Layer" className="border-b-0">
        <LayerActions design={design} />
      </Section>
    </div>
  );
}

const ALIGN_BUTTONS: { target: AlignTarget; label: string; icon: React.ReactNode }[] = [
  { target: "left", label: "Align left", icon: <AlignStartVertical /> },
  { target: "center-x", label: "Centre horizontally", icon: <AlignCenterVertical /> },
  { target: "right", label: "Align right", icon: <AlignEndVertical /> },
  { target: "top", label: "Align top", icon: <AlignStartHorizontal /> },
  { target: "center-y", label: "Centre vertically", icon: <AlignCenterHorizontal /> },
  { target: "bottom", label: "Align bottom", icon: <AlignEndHorizontal /> },
];

function AlignRow({ relativeTo }: { relativeTo: "printable" | "page" | "selection" }) {
  const alignSelection = useEditor((s) => s.alignSelection);
  return (
    <div className="grid grid-cols-6 gap-1">
      {ALIGN_BUTTONS.map((b) => (
        <Tooltip key={b.target} label={b.label}>
          <Button variant="default" size="icon" aria-label={b.label} onClick={() => alignSelection(b.target, relativeTo)} className="w-full">
            {b.icon}
          </Button>
        </Tooltip>
      ))}
    </div>
  );
}

function SingleDesign({ design, asset }: { design: Design; asset: LoadedAsset }) {
  const unit = useEditor((s) => s.unit);
  const page = useEditor((s) => s.doc.page);
  const updateDesign = useEditor((s) => s.updateDesign);
  const moveDesigns = useEditor((s) => s.moveDesigns);
  const resetDesign = useEditor((s) => s.resetDesign);
  const centerSelection = useEditor((s) => s.centerSelection);
  const replaceInput = useRef<HTMLInputElement>(null);

  const source = croppedSourceSize({ width: asset.naturalWidth, height: asset.naturalHeight }, design.crop);
  const imageRect = computeImageRect(design, source);
  const quality = resolutionReport(
    { width: asset.naturalWidth, height: asset.naturalHeight },
    design.crop,
    { width: imageRect.width, height: imageRect.height },
  );
  const status = placementStatus(design, page);
  const ratio = aspectRatio({ width: asset.naturalWidth, height: asset.naturalHeight });
  const product = findProduct(design.productId);

  return (
    <div>
      <Section title={product ? `${product.name} preview` : "Preview on a product"}>
        <MockupCard design={design} />
        {product && (
          <p className="mt-2 text-[12px] text-ink-muted">
            {product.detail}, {+product.width.toFixed(1)} × {+product.height.toFixed(1)} mm print area.
          </p>
        )}
      </Section>
      <Section
        title="Design"
        aside={
          <Tooltip label={design.locked ? "Unlock position" : "Lock position"}>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={design.locked ? "Unlock position" : "Lock position"}
              aria-pressed={design.locked}
              onClick={() => updateDesign(design.id, { locked: !design.locked })}
            >
              {design.locked ? <Lock className="text-accent" /> : <LockOpen />}
            </Button>
          </Tooltip>
        }
      >
        <Input
          aria-label="Design name"
          value={design.name}
          onChange={(e) => updateDesign(design.id, { name: e.target.value })}
        />
        <dl className="tnum mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
          <dt className="text-ink-muted">File</dt>
          <dd className="truncate text-right" title={asset.name}>{asset.name}</dd>
          <dt className="text-ink-muted">Pixels</dt>
          <dd className="text-right">
            {asset.naturalWidth} × {asset.naturalHeight} ({megapixels(asset).toFixed(1)} MP)
          </dd>
          <dt className="text-ink-muted">Aspect ratio</dt>
          <dd className="text-right">{ratio.toFixed(3)} : 1</dd>
          <dt className="text-ink-muted">Transparency</dt>
          <dd className="text-right">{asset.hasAlpha ? "Yes, preserved in PNG and PDF" : "None"}</dd>
        </dl>
        <div className="mt-3 flex gap-1.5">
          <Button size="sm" onClick={() => replaceInput.current?.click()}>
            <ImageUp />
            Replace image
          </Button>
          <Button size="sm" onClick={() => resetDesign(design.id)}>
            <RotateCcw />
            Reset
          </Button>
          <input
            ref={replaceInput}
            type="file"
            accept={ACCEPT_ATTR}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void replaceDesignImage(design.id, f);
              e.target.value = "";
            }}
          />
        </div>
      </Section>

      <DimensionControls design={design} asset={asset} />

      <Section title="Position on sheet">
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="X" valueMm={design.x} unit={unit} dpi={page.dpi} disabled={design.locked} onCommit={(x) => moveDesigns([{ id: design.id, x, y: design.y }])} />
          <NumberField label="Y" valueMm={design.y} unit={unit} dpi={page.dpi} disabled={design.locked} onCommit={(y) => moveDesigns([{ id: design.id, x: design.x, y }])} />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <NumberField
            label="R"
            raw
            suffix="°"
            valueMm={design.rotation}
            min={-360}
            max={360}
            disabled={design.locked}
            onCommit={(rotation) => updateDesign(design.id, { rotation })}
          />
          <Tooltip label="Rotate 90° left">
            <Button size="icon" aria-label="Rotate 90° left" disabled={design.locked} onClick={() => updateDesign(design.id, { rotation: (design.rotation - 90) % 360 })}>
              <RotateCcw />
            </Button>
          </Tooltip>
          <Tooltip label="Rotate 90° right">
            <Button size="icon" aria-label="Rotate 90° right" disabled={design.locked} onClick={() => updateDesign(design.id, { rotation: (design.rotation + 90) % 360 })}>
              <RotateCw />
            </Button>
          </Tooltip>
        </div>
        <p className="mt-3 mb-1.5 text-[12px] font-medium text-ink-muted">Align to printable area</p>
        <AlignRow relativeTo="printable" />
        <Button className="mt-1.5 w-full" size="sm" onClick={centerSelection} disabled={design.locked}>
          <Crosshair />
          Centre on sheet
        </Button>
        {(status.exceedsPrintable || status.exceedsPage) && (
          <Note tone="error" icon={<TriangleAlert />} className="mt-3">
            {status.largerThanPrintable
              ? "This design is larger than the printable area. Make it smaller, reduce the margins or switch orientation."
              : status.exceedsPage
                ? "Part of this design is off the page and will not print."
                : "Part of this design is in the margin, where many printers cannot print."}
          </Note>
        )}
      </Section>

      <Section title="Print quality">
        <QualityMeter dpi={quality.effectiveDpi} level={quality.level} />
        <p className="mt-2 text-[12px] leading-snug text-ink-muted">
          {QUALITY_COPY[quality.level].body} Exporting at a higher DPI does not add detail the source file lacks.
        </p>
      </Section>

      <RepeatSection design={design} />
      <CropSection design={design} />

      <Section title="Cut line and layers">
        <Field label="Border as cut line" htmlFor="border-switch">
          <Switch id="border-switch" checked={design.border} onCheckedChange={(border) => updateDesign(design.id, { border })} />
        </Field>
        <LayerActions design={design} />
      </Section>
    </div>
  );
}

function QualityMeter({ dpi, level }: { dpi: number; level: "high" | "acceptable" | "low" }) {
  const pct = Math.min(100, (dpi / 400) * 100);
  const color = level === "high" ? "bg-ok" : level === "acceptable" ? "bg-warn" : "bg-danger";
  const text = level === "high" ? "text-ok" : level === "acceptable" ? "text-warn" : "text-danger";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={cn("text-[13px] font-semibold", text)}>{QUALITY_COPY[level].title}</span>
        <span className="tnum text-[13px] font-medium">{Math.round(dpi)} DPI effective</span>
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-line" role="meter" aria-valuemin={0} aria-valuemax={400} aria-valuenow={Math.round(dpi)} aria-label="Effective resolution">
        <div className={cn("absolute inset-y-0 left-0 rounded-full", color)} style={{ width: `${pct}%` }} />
        {/* Band edges at 150 and 250 DPI. */}
        <span className="absolute inset-y-[-3px] w-px bg-ink-faint" style={{ left: "37.5%" }} />
        <span className="absolute inset-y-[-3px] w-px bg-ink-faint" style={{ left: "62.5%" }} />
      </div>
    </div>
  );
}

function RepeatSection({ design }: { design: Design }) {
  const page = useEditor((s) => s.doc.page);
  const gap = useEditor((s) => s.layoutGap);
  const setLayoutGap = useEditor((s) => s.setLayoutGap);
  const repeatDesign = useEditor((s) => s.repeatDesign);
  const report = useEditor((s) => s.lastLayoutReport);
  const b = designBounds(design);
  const capacity = gridCapacity({ width: b.width, height: b.height }, printableRect(page), gap);
  const [copies, setCopies] = useState(Math.max(1, capacity.count));
  const [ran, setRan] = useState(false);

  return (
    <Section title="Repeat on sheet">
      <p className="mb-2 text-[12px] text-ink-muted">
        At this size and spacing, <span className="tnum font-semibold text-ink">{capacity.count}</span> copies fit ({capacity.cols} ×{" "}
        {capacity.rows}).
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        <NumberField label="#" raw valueMm={copies} min={1} max={500} onCommit={(n) => setCopies(Math.round(n))} />
        <NumberField label="↔" valueMm={gap.x} min={0} max={50} onCommit={(x) => setLayoutGap({ ...gap, x })} />
        <NumberField label="↕" valueMm={gap.y} min={0} max={50} onCommit={(y) => setLayoutGap({ ...gap, y })} />
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <Button
          size="sm"
          variant="dark"
          className="flex-1"
          disabled={design.locked}
          onClick={() => {
            repeatDesign(design.id, copies);
            setRan(true);
          }}
        >
          <Grid3x3 />
          Arrange {copies} {copies === 1 ? "copy" : "copies"}
        </Button>
        <Button
          size="sm"
          disabled={design.locked || capacity.count === 0}
          onClick={() => {
            setCopies(capacity.count);
            repeatDesign(design.id, capacity.count);
            setRan(true);
          }}
        >
          Fill sheet
        </Button>
      </div>
      {ran && report && report.unplaced > 0 && (
        <Note tone="warn" icon={<TriangleAlert />} className="mt-2">
          <p>{report.placed} placed. {report.unplaced} did not fit and were not added. Designs are never shrunk to fit.</p>
          <ul className="mt-1 list-disc pl-4">
            {report.suggestions.slice(1).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Note>
      )}
    </Section>
  );
}

function CropSection({ design }: { design: Design }) {
  const updateDesign = useEditor((s) => s.updateDesign);
  const crop = design.crop;
  const sides = ["top", "right", "bottom", "left"] as const;
  return (
    <Section
      title="Crop"
      aside={
        <Switch
          aria-label="Enable cropping"
          checked={crop !== null}
          onCheckedChange={(on) => updateDesign(design.id, { crop: on ? { top: 0, right: 0, bottom: 0, left: 0 } : null })}
        />
      }
    >
      {crop === null ? (
        <p className="flex gap-2 text-[12px] text-ink-muted">
          <Crop className="size-3.5 shrink-0" />
          Off. The whole image is always printed. Turn on to trim edges deliberately; the original file is kept.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sides.map((side) => (
            <div key={side} className="grid grid-cols-[52px_1fr_36px] items-center gap-2 text-[12px]">
              <span className="capitalize text-ink-muted">{side}</span>
              <Slider
                aria-label={`Crop ${side}`}
                min={0}
                max={45}
                step={0.5}
                value={[crop[side] * 100]}
                onValueChange={([v]) => updateDesign(design.id, { crop: { ...crop, [side]: v / 100 } })}
              />
              <span className="tnum text-right">{(crop[side] * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function LayerActions({ design }: { design: Design }) {
  const bringForward = useEditor((s) => s.bringForward);
  const sendBackward = useEditor((s) => s.sendBackward);
  const duplicateSelection = useEditor((s) => s.duplicateSelection);
  const deleteSelection = useEditor((s) => s.deleteSelection);
  return (
    <div className="mt-2 flex gap-1.5">
      <Tooltip label="Bring to front">
        <Button size="icon" aria-label="Bring to front" onClick={() => bringForward(design.id, true)}>
          <ArrowUpToLine />
        </Button>
      </Tooltip>
      <Tooltip label="Send to back">
        <Button size="icon" aria-label="Send to back" onClick={() => sendBackward(design.id, true)}>
          <ArrowDownToLine />
        </Button>
      </Tooltip>
      <Tooltip label="Duplicate" shortcut="Ctrl D">
        <Button size="icon" aria-label="Duplicate" onClick={duplicateSelection}>
          <Copy />
        </Button>
      </Tooltip>
      <Button size="md" variant="danger" className="ml-auto" onClick={deleteSelection}>
        <Trash2 />
        Delete
      </Button>
    </div>
  );
}

function MultiSelection({ designs }: { designs: Design[] }) {
  const groupSelection = useEditor((s) => s.groupSelection);
  const ungroupSelection = useEditor((s) => s.ungroupSelection);
  const autoArrange = useEditor((s) => s.autoArrange);
  const duplicateSelection = useEditor((s) => s.duplicateSelection);
  const deleteSelection = useEditor((s) => s.deleteSelection);
  const centerSelection = useEditor((s) => s.centerSelection);
  const report = useEditor((s) => s.lastLayoutReport);
  const [ran, setRan] = useState(false);
  const grouped = designs.every((d) => d.groupId && d.groupId === designs[0].groupId);

  return (
    <div>
      <Section title={`${designs.length} designs selected`}>
        <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Align as a block to the printable area</p>
        <AlignRow relativeTo="printable" />
        <p className="mt-3 mb-1.5 text-[12px] font-medium text-ink-muted">Align to each other</p>
        <AlignRow relativeTo="selection" />
        <Button className="mt-2 w-full" size="sm" onClick={centerSelection}>
          <Crosshair />
          Centre block on sheet
        </Button>
      </Section>
      <Section title="Arrange">
        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            variant="dark"
            onClick={() => {
              autoArrange("selection");
              setRan(true);
            }}
          >
            <Grid3x3 />
            Arrange in rows without overlap
          </Button>
          <div className="flex gap-1.5">
            {grouped ? (
              <Button size="sm" className="flex-1" onClick={ungroupSelection}>
                <Ungroup />
                Ungroup
              </Button>
            ) : (
              <Button size="sm" className="flex-1" onClick={groupSelection}>
                <GroupIcon />
                Group
              </Button>
            )}
            <Button size="sm" className="flex-1" onClick={duplicateSelection}>
              <Copy />
              Duplicate
            </Button>
            <Button size="sm" variant="danger" onClick={deleteSelection} aria-label="Delete selected">
              <Trash2 />
            </Button>
          </div>
        </div>
        {ran && report && report.unplaced > 0 && <LayoutWarning />}
      </Section>
    </div>
  );
}

export function LayoutWarning() {
  const report = useEditor((s) => s.lastLayoutReport);
  if (!report || report.unplaced === 0) return null;
  return (
    <Note tone="warn" icon={<TriangleAlert />} className="mt-2">
      <p>
        {report.placed} arranged. {report.unplaced} did not fit and stayed where they were (now selected). Nothing was
        resized.
      </p>
      <ul className="mt-1 list-disc pl-4">
        {report.suggestions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Note>
  );
}

function SheetSummary() {
  const doc = useEditor((s) => s.doc);
  const assets = useEditor((s) => s.assets);
  const pageCount = useEditor((s) => s.pages.length);
  const activePage = useEditor((s) => s.activePage);
  const size = pageSize(doc.page);
  const issues = doc.designs.filter((d) => placementStatus(d, doc.page).exceedsPrintable).length;
  const lowRes = doc.designs.filter((d) => {
    const a = d.assetId ? assets[d.assetId] : undefined;
    if (!a) return false;
    const r = computeImageRect(d, croppedSourceSize({ width: a.naturalWidth, height: a.naturalHeight }, d.crop));
    return resolutionReport({ width: a.naturalWidth, height: a.naturalHeight }, d.crop, r).level === "low";
  }).length;

  return (
    <div>
      <Section title="Sheet">
        <dl className="tnum grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
          {pageCount > 1 && (
            <>
              <dt className="text-ink-muted">Page</dt>
              <dd className="text-right">
                {activePage + 1} of {pageCount}
              </dd>
            </>
          )}
          <dt className="text-ink-muted">Sheet</dt>
          <dd className="text-right">
            {sheetLabel(doc.page)}, {doc.page.orientation}
          </dd>
          <dt className="text-ink-muted">Size</dt>
          <dd className="text-right">
            {+size.width.toFixed(1)} × {+size.height.toFixed(1)} mm
          </dd>
          <dt className="text-ink-muted">Process</dt>
          <dd className="text-right">
            {doc.page.process === "dtf" ? "DTF" : "Sublimation"}, {doc.page.mirrorOutput ? "mirrored" : "not mirrored"}
          </dd>
          <dt className="text-ink-muted">Export resolution</dt>
          <dd className="text-right">{doc.page.dpi} DPI</dd>
          <dt className="text-ink-muted">Designs</dt>
          <dd className="text-right">{doc.designs.length}</dd>
        </dl>
        {issues > 0 && (
          <Note tone="error" icon={<TriangleAlert />} className="mt-3">
            {issues} {issues === 1 ? "design is" : "designs are"} outside the printable area (dashed danger outline).
          </Note>
        )}
        {lowRes > 0 && (
          <Note tone="warn" icon={<TriangleAlert />} className="mt-2">
            {lowRes} {lowRes === 1 ? "design has" : "designs have"} low resolution for the printed size.
          </Note>
        )}
      </Section>
      <Section title="Keyboard">
        <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-[12px]">
          {[
            ["Move 1 mm (Shift: 10 mm)", "Arrows"],
            ["Duplicate", "Ctrl D"],
            ["Copy, paste", "Ctrl C, Ctrl V"],
            ["Undo, redo", "Ctrl Z, Ctrl Shift Z"],
            ["Group, ungroup", "Ctrl G, Ctrl Shift G"],
            ["Zoom", "Ctrl + wheel"],
            ["Snap off while dragging", "Alt"],
            ["Select several", "Shift click, Shift drag"],
          ].map(([a, k]) => (
            <div key={a} className="contents">
              <dt className="text-ink-muted">{a}</dt>
              <dd className="text-right font-medium">{k}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
