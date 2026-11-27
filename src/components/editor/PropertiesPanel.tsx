"use client";

/**
 * Right-hand properties panel (the inspector).
 *
 * Nothing selected → the sheet and what to do next. One design → a short
 * header (picture, name, size, print quality) and three tabs, so no setting
 * is more than one click away and the panel never turns into a long scroll:
 *
 *   Design   product colour and preview, the image (replace, remove
 *            background, trim, fit or fill, crop), print size, quality
 *   Arrange  copies (fill the sheet, exact number), position, front and back,
 *            layer order
 *   Cut      how the page is cut, the outline and the printed cutting line
 *            (sticker pages and products with a cut)
 *
 * Several designs → alignment, grouping and arranging. The chosen tab is
 * kept in the store, so it stays put while the selection changes.
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
  ChevronDown,
  Copy,
  Crop,
  Eraser,
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
  Shirt,
  Scissors,
  Shrink,
  Palette,
  LayoutGrid,
  Download,
  Package,
  Upload,
  Keyboard,
  CheckCircle2,
  Circle,
  Ribbon,
} from "lucide-react";
import { useEditor, selectedDesigns, type InspectorTab } from "@/store/editor-store";
import type { Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumberField } from "@/components/settings/NumberField";
import { DimensionControls } from "@/components/settings/DimensionControls";
import { Field, Note, Section } from "@/components/settings/Section";
import { computeImageRect, aspectRatio, effectiveCrop, effectiveSourceSize } from "@/lib/image/image-fit";
import {
  CardSection,
  CopiesSection,
  CutLineSection,
  CutMethodSection,
  CutSection,
  ImageFitSection,
  StickerOutlineSection,
  StrapSection,
} from "./DesignSections";
import { QUALITY_COPY, resolutionReport } from "@/lib/image/image-resolution";
import { placementStatus } from "@/lib/layout/sheet-layout";
import type { AlignTarget } from "@/lib/layout/alignment";
import { removeBackground, replaceDesignImage, trimEmptyEdges, uploadCardSides } from "@/lib/editor-actions";
import { findProduct, minSheetFor } from "@/lib/catalogue/products";
import { ProductSection, SampleStrip } from "@/components/products/MockupPreview";
import { pageSize, sheetLabel } from "@/lib/layout/sheet-layout";
import { ACCEPT_ATTR, megapixels } from "@/lib/image/image-loader";
import { cn } from "@/lib/utils";
import { resolveMirror } from "@/lib/render/mirror";
import { PROCESS_LABELS } from "@/lib/catalogue/processes";
import { CUT_METHOD_INFO } from "@/lib/cut/cut-method";

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

/** True when the Cut tab has something to offer for this design. */
function hasCutTab(design: Design, process: string): boolean {
  const p = findProduct(design.productId);
  return process === "sticker" || !!design.cut || !!p?.cornerRadius || !!p?.cut;
}

function InspectorTabs({ design, panels }: { design: Design; panels: Record<InspectorTab, React.ReactNode | null> }) {
  const tab = useEditor((s) => s.inspectorTab);
  const setTab = useEditor((s) => s.setInspectorTab);
  const value: InspectorTab = panels[tab] ? tab : "design";
  return (
    <Tabs value={value} onValueChange={(v) => setTab(v as InspectorTab)}>
      {/* Sticks under the panel header on desktop (48 px); the phone sheet sets the offset to 0. */}
      <TabsList aria-label="Design settings" className="sticky top-[var(--inspector-sticky,48px)] z-10">
        <TabsTrigger value="design">
          <Palette />
          Design
        </TabsTrigger>
        <TabsTrigger value="arrange">
          <LayoutGrid />
          Arrange
        </TabsTrigger>
        {panels.cut && (
          <TabsTrigger value="cut">
            <Scissors />
            Cut
          </TabsTrigger>
        )}
        {design.locked && <Lock className="my-auto ml-auto size-3.5 text-accent" aria-label="Position locked" />}
      </TabsList>
      {(Object.keys(panels) as InspectorTab[]).map((k) =>
        panels[k] ? (
          <TabsContent key={k} value={k} className="outline-none animate-fade">
            {panels[k]}
          </TabsContent>
        ) : null,
      )}
    </Tabs>
  );
}

/** Picture, name, size and quality at a glance, above the tabs. */
function DesignHeader({ design, asset }: { design: Design; asset: LoadedAsset | null }) {
  const updateDesign = useEditor((s) => s.updateDesign);
  const page = useEditor((s) => s.doc.page);
  let quality: ReturnType<typeof resolutionReport> | null = null;
  if (asset) {
    const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
    const rect = computeImageRect(design, effectiveSourceSize(design, natural));
    quality = resolutionReport(natural, effectiveCrop(design, natural), { width: rect.width, height: rect.height });
  }
  const tone = !quality ? "" : quality.level === "high" ? "bg-ok-soft text-ok" : quality.level === "acceptable" ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger";
  const status = placementStatus(design, page);
  return (
    <div className="flex gap-3 border-b border-line px-4 py-3">
      <span className="checker flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-line">
        {asset ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img src={asset.objectUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <ImageUp className="size-5 text-ink-faint" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <Input
          aria-label="Design name"
          value={design.name}
          onChange={(e) => updateDesign(design.id, { name: e.target.value })}
          className="h-7 px-1.5 text-body font-semibold"
        />
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span data-testid="design-size" className="tnum rounded-md bg-subtle px-1.5 py-0.5 text-caption font-medium">
            {+design.width.toFixed(1)} × {+design.height.toFixed(1)} mm
          </span>
          {quality && (
            <Tooltip label={`${QUALITY_COPY[quality.level].title}. 300 DPI or more prints sharp.`}>
              <span className={cn("tnum rounded-md px-1.5 py-0.5 text-caption font-semibold", tone)}>{Math.round(quality.effectiveDpi)} DPI</span>
            </Tooltip>
          )}
          {status.exceedsPrintable && <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-caption font-semibold text-danger">Off the printable area</span>}
        </div>
      </div>
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
    </div>
  );
}

/** Inspector for an empty product box: what it is, its real size, how to fill it. */
function SlotInspector({ design }: { design: Design }) {
  const page = useEditor((s) => s.doc.page);
  const input = useRef<HTMLInputElement>(null);
  const product = findProduct(design.productId);
  const sheet = product ? minSheetFor(product) : null;
  const host = product ? new URL(product.source).hostname.replace(/^www\./, "") : null;
  const sticker = page.process === "sticker";

  const designTab = (
    <>
      {product && (
        <Section title="Product">
          <ProductSection design={design} />
        </Section>
      )}
      {design.strap && <StrapSection design={design} />}
      <Section title={product ? `${product.name}, ${product.detail.toLowerCase()}` : design.strap ? "Strap artwork" : "Empty box"}>
        {product && (
          <div className="mb-3 text-caption leading-relaxed text-ink-muted">
            <p>
              Print area {+product.width.toFixed(1)} × {+product.height.toFixed(1)} mm{product.wrap ? ", wraps around" : ""}.{" "}
              {design.bleed > 0 ? `The box includes ${design.bleed} mm bleed per side.` : product.wrap ? "The box includes 6 mm seam overlap." : ""}
            </p>
            <p>Smallest sheet: {sheet ? sheet.name : "a roll"}</p>
          </div>
        )}
        {!design.strap && (
          <>
            <Button variant="primary" className="w-full" onClick={() => input.current?.click()}>
              <ImageUp />
              Add image
            </Button>
            <input
              ref={input}
              type="file"
              accept={ACCEPT_ATTR}
              multiple={product?.sides === 2}
              hidden
              onChange={(e) => {
                const files = e.target.files ? [...e.target.files] : [];
                if (files[0]) void uploadCardSides(files, design.id);
                e.target.value = "";
              }}
            />
            <p className="mt-2 text-caption text-ink-muted">
              Or drag an image from your computer or from Uploads onto the box.
              {product?.sides === 2 && design.side !== "back" ? " Pick two files to fill the front and the back." : ""}
              {sticker ? " The sticker outline is added automatically." : ""}
            </p>
          </>
        )}
        {product && (
          <div className="mt-3">
            <SampleStrip design={design} />
          </div>
        )}
        {product?.note && <Note className="mt-3">{product.note}</Note>}
        {host && (
          <p className="mt-2 text-caption text-ink-faint">
            Size source:{" "}
            <a href={product!.source} target="_blank" rel="noreferrer" className="underline hover:text-ink">
              {host}
            </a>
            , {product!.confidence} confidence. Blanks vary by brand; adjust if yours differs.
          </p>
        )}
      </Section>
      <SizeSection design={design} />
    </>
  );

  return (
    <div>
      <DesignHeader design={design} asset={null} />
      <InspectorTabs
        design={design}
        panels={{
          design: designTab,
          arrange: (
            <>
              <CopiesSection design={design} />
              <PositionSection design={design} />
              <CardSection design={design} />
              <LayerSection design={design} />
            </>
          ),
          cut: hasCutTab(design, page.process) ? <CutPanel design={design} /> : null,
        }}
      />
    </div>
  );
}

function SizeSection({ design }: { design: Design }) {
  const unit = useEditor((s) => s.unit);
  const page = useEditor((s) => s.doc.page);
  const resizeDesign = useEditor((s) => s.resizeDesign);
  return (
    <Section title="Size">
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField label="W" valueMm={design.width} unit={unit} dpi={page.dpi} min={1} max={6000} onCommit={(width) => resizeDesign(design.id, { width })} />
        <NumberField label="H" valueMm={design.height} unit={unit} dpi={page.dpi} min={1} max={6000} onCommit={(height) => resizeDesign(design.id, { height })} />
      </div>
    </Section>
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

/** Position, rotation and alignment on the sheet. */
function PositionSection({ design }: { design: Design }) {
  const unit = useEditor((s) => s.unit);
  const page = useEditor((s) => s.doc.page);
  const updateDesign = useEditor((s) => s.updateDesign);
  const moveDesigns = useEditor((s) => s.moveDesigns);
  const centerSelection = useEditor((s) => s.centerSelection);
  const status = placementStatus(design, page);
  return (
    <Section title="Position on sheet">
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField label="X" valueMm={design.x} unit={unit} dpi={page.dpi} disabled={design.locked} onCommit={(x) => moveDesigns([{ id: design.id, x, y: design.y }])} />
        <NumberField label="Y" valueMm={design.y} unit={unit} dpi={page.dpi} disabled={design.locked} onCommit={(y) => moveDesigns([{ id: design.id, x: design.x, y }])} />
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <NumberField label="R" raw suffix="°" valueMm={design.rotation} min={-360} max={360} disabled={design.locked} onCommit={(rotation) => updateDesign(design.id, { rotation })} />
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
      <p className="mt-3 mb-1.5 text-caption font-medium text-ink-muted">Align to printable area</p>
      <AlignRow relativeTo="printable" />
      <Button className="mt-1.5 w-full" size="sm" onClick={centerSelection} disabled={design.locked}>
        <Crosshair />
        Centre on sheet
      </Button>
      {(status.exceedsPrintable || status.exceedsPage) && (
        <Note tone="error" icon={<TriangleAlert />} className="mt-3">
          {status.largerThanPrintable
            ? "This design is larger than the printable area. Make it smaller, reduce the margins or turn the sheet."
            : status.exceedsPage
              ? "Part of this design is off the page and will not print."
              : "Part of this design is in the margin, where many printers cannot print."}
        </Note>
      )}
    </Section>
  );
}

function LayerSection({ design }: { design: Design }) {
  const updateDesign = useEditor((s) => s.updateDesign);
  return (
    <Section title="Layer" className="border-b-0">
      <LayerActions design={design} />
      {design.assetId && (
        <Field label="Thin black box border (prints)" htmlFor="border-switch">
          <Switch id="border-switch" checked={design.border} onCheckedChange={(border) => updateDesign(design.id, { border })} />
        </Field>
      )}
    </Section>
  );
}

/** The Cut tab: sticker pages get the cut method, outline and printed line; cards get their cut path. */
function CutPanel({ design }: { design: Design }) {
  const process = useEditor((s) => s.doc.page.process);
  if (process !== "sticker") return <CutSection design={design} />;
  return (
    <>
      <CutMethodSection />
      {design.assetId ? (
        <StickerOutlineSection key={design.id} design={design} />
      ) : (
        <Section title="Sticker outline">
          <p className="text-caption text-ink-muted">Added automatically as soon as the box has an image.</p>
        </Section>
      )}
      <CutLineSection />
    </>
  );
}

function SingleDesign({ design, asset }: { design: Design; asset: LoadedAsset }) {
  const page = useEditor((s) => s.doc.page);
  const product = findProduct(design.productId);
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const imageRect = computeImageRect(design, effectiveSourceSize(design, natural));
  const quality = resolutionReport(natural, effectiveCrop(design, natural), { width: imageRect.width, height: imageRect.height });

  const designTab = (
    <>
      {product ? (
        <Section title="Product">
          <ProductSection design={design} />
        </Section>
      ) : design.strap ? null : (
        <Section title="Preview on a product">
          <Button className="w-full" onClick={() => useEditor.getState().openMockup(design.id)}>
            <Shirt />
            See it on a T-shirt, mug or tote
          </Button>
        </Section>
      )}
      {design.strap && <StrapSection design={design} />}
      <ImageSection design={design} asset={asset} />
      {!design.strap && <ImageFitSection design={design} asset={asset} />}
      {!design.strap && <DimensionControls design={design} asset={asset} />}
      <Section title="Print quality">
        <QualityMeter dpi={quality.effectiveDpi} level={quality.level} />
        <p className="mt-2 text-caption leading-snug text-ink-muted">
          {QUALITY_COPY[quality.level].body} Exporting at a higher DPI does not add detail the source file lacks.
        </p>
      </Section>
      <MoreImageSettings design={design} asset={asset} />
    </>
  );

  return (
    <div>
      <DesignHeader design={design} asset={asset} />
      <InspectorTabs
        design={design}
        panels={{
          design: designTab,
          arrange: (
            <>
              <CopiesSection design={design} />
              <PositionSection design={design} />
              <CardSection design={design} />
              <LayerSection design={design} />
            </>
          ),
          cut: hasCutTab(design, page.process) ? <CutPanel design={design} /> : null,
        }}
      />
    </div>
  );
}

/** Replace, remove background, trim, flip and reset. */
function ImageSection({ design, asset }: { design: Design; asset: LoadedAsset }) {
  const resetDesign = useEditor((s) => s.resetDesign);
  const flipDesigns = useEditor((s) => s.flipDesigns);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const process = useEditor((s) => s.doc.page.process);
  if (design.strap) return null;
  return (
    <Section title="Image">
      <div className="grid grid-cols-2 gap-1.5">
        <Button size="sm" onClick={() => replaceInput.current?.click()}>
          <ImageUp />
          Replace
        </Button>
        <Button size="sm" onClick={() => resetDesign(design.id)}>
          <RotateCcw />
          Reset
        </Button>
        <Tooltip label="Make a white or flat background transparent (keeps white inside the artwork)">
          <Button
            size="sm"
            className="col-span-2 justify-start"
            disabled={busy || design.locked}
            onClick={async () => {
              setBusy(true);
              await removeBackground(design.id);
              setBusy(false);
            }}
          >
            <Eraser />
            Remove plain background
          </Button>
        </Tooltip>
        <Tooltip label="Crop away empty transparent margins; the artwork keeps its printed size">
          <Button
            size="sm"
            className="col-span-2 justify-start"
            disabled={!asset.hasAlpha || design.locked || design.fitMode === "cover"}
            onClick={() => trimEmptyEdges(design.id)}
          >
            <Shrink />
            Trim empty edges
          </Button>
        </Tooltip>
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
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => flipDesigns("x")}>
          Flip horizontally
        </Button>
        <Button size="sm" variant="ghost" onClick={() => flipDesigns("y")}>
          Flip vertically
        </Button>
      </div>
      {process === "dtf" && !asset.hasAlpha && (
        <Note tone="warn" icon={<TriangleAlert />} className="mt-2">
          DTF prints white ink under every pixel, so this image&apos;s background prints as a box. Remove the background first.
        </Note>
      )}
    </Section>
  );
}

/** File details and the edge crop, folded away by default. */
function MoreImageSettings({ design, asset }: { design: Design; asset: LoadedAsset }) {
  const [open, setOpen] = useState(false);
  const ratio = aspectRatio({ width: asset.naturalWidth, height: asset.naturalHeight });
  return (
    <section className="border-b border-line px-4 py-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-8 w-full items-center justify-between text-body font-medium text-ink-muted hover:text-ink">
        File details and edge crop
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="pb-2">
          <dl className="tnum grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-caption">
            <dt className="text-ink-muted">File</dt>
            <dd className="truncate text-right" title={asset.name}>
              {asset.name}
            </dd>
            <dt className="text-ink-muted">Pixels</dt>
            <dd className="text-right">
              {asset.naturalWidth} × {asset.naturalHeight} ({megapixels(asset).toFixed(1)} MP)
            </dd>
            <dt className="text-ink-muted">Aspect ratio</dt>
            <dd className="text-right">{ratio.toFixed(3)} : 1</dd>
            <dt className="text-ink-muted">Transparency</dt>
            <dd className="text-right">{asset.hasAlpha ? "Yes, kept in PNG and PDF" : "None"}</dd>
          </dl>
          <CropSliders design={design} />
        </div>
      )}
    </section>
  );
}

function QualityMeter({ dpi, level }: { dpi: number; level: "high" | "acceptable" | "low" }) {
  const pct = Math.min(100, (dpi / 400) * 100);
  const color = level === "high" ? "bg-ok" : level === "acceptable" ? "bg-warn" : "bg-danger";
  const text = level === "high" ? "text-ok" : level === "acceptable" ? "text-warn" : "text-danger";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={cn("text-body font-semibold", text)}>{QUALITY_COPY[level].title}</span>
        <span className="tnum text-body font-medium">{Math.round(dpi)} DPI effective</span>
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

function CropSliders({ design }: { design: Design }) {
  const updateDesign = useEditor((s) => s.updateDesign);
  const crop = design.crop;
  const sides = ["top", "right", "bottom", "left"] as const;
  return (
    <div className="mt-3">
      <Field label="Trim the image edges" htmlFor={`crop-${design.id}`}>
        <Switch
          id={`crop-${design.id}`}
          checked={crop !== null}
          onCheckedChange={(on) => updateDesign(design.id, { crop: on ? { top: 0, right: 0, bottom: 0, left: 0 } : null })}
        />
      </Field>
      {crop === null ? (
        <p className="flex gap-2 text-caption text-ink-muted">
          <Crop className="size-3.5 shrink-0" />
          Off: the whole image prints. The original file is always kept.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sides.map((side) => (
            <div key={side} className="grid grid-cols-[52px_1fr_36px] items-center gap-2 text-caption">
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
    </div>
  );
}

function LayerActions({ design }: { design: Design }) {
  const bringForward = useEditor((s) => s.bringForward);
  const sendBackward = useEditor((s) => s.sendBackward);
  const duplicateSelection = useEditor((s) => s.duplicateSelection);
  const deleteSelection = useEditor((s) => s.deleteSelection);
  return (
    <div className="flex gap-1.5">
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
  const duplicateSelection = useEditor((s) => s.duplicateSelection);
  const deleteSelection = useEditor((s) => s.deleteSelection);
  const centerSelection = useEditor((s) => s.centerSelection);
  const report = useEditor((s) => s.lastLayoutReport);
  const [ran, setRan] = useState(false);
  const grouped = designs.every((d) => d.groupId && d.groupId === designs[0].groupId);

  return (
    <div>
      <Section title={`${designs.length} designs selected`}>
        <p className="mb-1.5 text-caption font-medium text-ink-muted">Align as a block to the printable area</p>
        <AlignRow relativeTo="printable" />
        <p className="mt-3 mb-1.5 text-caption font-medium text-ink-muted">Align to each other</p>
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
              useEditor.getState().setArrangeOptions({ scope: "selection" });
              useEditor.getState().setDialog("arrange");
              setRan(true);
            }}
          >
            <Grid3x3 />
            Auto Arrange selection
          </Button>
          {designs.length === 2 && !designs.some((d) => d.pairId) && (
            <Button
              size="sm"
              onClick={() => {
                if (!useEditor.getState().pairSelection()) window.alert("Front and back must be the same size, including bleed.");
              }}
            >
              Pair as front and back
            </Button>
          )}
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
        {report.placed} arranged. {report.unplaced} did not fit and stayed where they were (now selected). Nothing was resized.
      </p>
      <ul className="mt-1 list-disc pl-4">
        {report.suggestions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Note>
  );
}

/** Nothing selected: the sheet at a glance and the next step, in order. */
function SheetSummary() {
  const doc = useEditor((s) => s.doc);
  const assets = useEditor((s) => s.assets);
  const pageCount = useEditor((s) => s.pages.length);
  const activePage = useEditor((s) => s.activePage);
  const size = pageSize(doc.page);
  const issues = doc.designs.filter((d) => placementStatus(d, doc.page).exceedsPrintable).length;
  const empty = doc.designs.filter((d) => !d.assetId).length;
  const lowRes = doc.designs.filter((d) => {
    const a = d.assetId ? assets[d.assetId] : undefined;
    if (!a) return false;
    const n = { width: a.naturalWidth, height: a.naturalHeight };
    const r = computeImageRect(d, effectiveSourceSize(d, n));
    return resolutionReport(n, effectiveCrop(d, n), r).level === "low";
  }).length;
  const s = useEditor.getState;
  const hasArt = doc.designs.some((d) => d.assetId);
  const sticker = doc.page.process === "sticker";

  const steps: { done: boolean; title: string; body: string; action?: React.ReactNode }[] = [
    {
      done: hasArt,
      title: "Add your designs",
      body: sticker ? "Upload stickers: the cut outline is added automatically." : "Upload images, or start from a product template.",
      action: !hasArt && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              s().setSidebarTab("uploads");
              s().setPanelOpen(true);
            }}
          >
            <Upload />
            Upload
          </Button>
          <Button
            size="sm"
            onClick={() => {
              s().setSidebarTab("products");
              s().setPanelOpen(true);
            }}
          >
            <Package />
            Products
          </Button>
          {doc.page.process === "sublimation" && (
            <Button size="sm" onClick={() => s().setDialog("strip")}>
              <Ribbon />
              Straps
            </Button>
          )}
        </div>
      ),
    },
    {
      done: hasArt && doc.designs.length > 1,
      title: "Fill the sheet",
      body: "Select a design and use Fill sheet (Arrange tab), or Auto Arrange to pack mixed designs.",
      action: hasArt && (
        <Button
          size="sm"
          className="mt-1.5"
          onClick={() => {
            s().setArrangeOptions({ scope: "all" });
            s().setDialog("arrange");
          }}
        >
          <LayoutGrid />
          Auto Arrange
        </Button>
      ),
    },
    {
      done: hasArt && issues === 0 && lowRes === 0 && empty === 0,
      title: "Check before printing",
      body:
        issues + lowRes + empty === 0
          ? "Everything is inside the printable area and sharp enough."
          : [issues && `${issues} outside the printable area`, lowRes && `${lowRes} low resolution`, empty && `${empty} empty ${empty === 1 ? "box" : "boxes"}`]
              .filter(Boolean)
              .join(", ") + ".",
    },
    {
      done: false,
      title: "Download or print",
      body: sticker && doc.page.cutMethod !== "hand" ? `Files for ${CUT_METHOD_INFO[doc.page.cutMethod].label} are in Download.` : "Print at 100% (actual size), never “fit to page”.",
      action: hasArt && (
        <Button size="sm" variant="dark" className="mt-1.5" onClick={() => s().setDialog("export")}>
          <Download />
          Download
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Section title="Sheet">
        <dl className="tnum grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body">
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
            {PROCESS_LABELS[doc.page.process]}, {resolveMirror(doc.page) ? "mirrored" : "not mirrored"}
            {doc.page.mirrorMode !== "auto" && " (your choice)"}
          </dd>
          {sticker && (
            <>
              <dt className="text-ink-muted">Cutting</dt>
              <dd className="text-right">{CUT_METHOD_INFO[doc.page.cutMethod].label}</dd>
            </>
          )}
          <dt className="text-ink-muted">Designs</dt>
          <dd className="text-right">{doc.designs.length}</dd>
        </dl>
        {issues > 0 && (
          <Note tone="error" icon={<TriangleAlert />} className="mt-3">
            {issues} {issues === 1 ? "design is" : "designs are"} outside the printable area (dashed red outline).
          </Note>
        )}
        {lowRes > 0 && (
          <Note tone="warn" icon={<TriangleAlert />} className="mt-2">
            {lowRes} {lowRes === 1 ? "design has" : "designs have"} low resolution for the printed size.
          </Note>
        )}
      </Section>
      <Section title="Next steps">
        <ol className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-2.5">
              {step.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <Circle className="mt-0.5 size-4 shrink-0 text-ink-faint" />}
              <div className="min-w-0">
                <p className={cn("text-body font-semibold", step.done && "text-ink-muted")}>
                  {i + 1}. {step.title}
                </p>
                <p className="text-caption leading-snug text-ink-muted">{step.body}</p>
                {step.action}
              </div>
            </li>
          ))}
        </ol>
      </Section>
      {sticker && <CutMethodSection />}
      <Section title="Shortcuts" className="border-b-0">
        <Button size="sm" variant="ghost" className="w-full" onClick={() => s().setDialog("shortcuts")}>
          <Keyboard />
          Keyboard shortcuts
        </Button>
      </Section>
    </div>
  );
}
