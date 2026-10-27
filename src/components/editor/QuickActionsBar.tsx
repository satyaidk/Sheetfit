"use client";

/**
 * Quick-actions bar: a fixed bar above the canvas whose tools follow the
 * selection (Canva's quick actions, kept in one stable place as Adobe Express
 * and Figma recommend). Nothing selected shows sheet tools; an image shows
 * replace, fit, size, flip, position and its print quality; an empty product
 * box shows how to fill it; several designs show align and arrange.
 * `Edit` opens the full inspector for every remaining setting.
 */

/* eslint-disable @next/next/no-img-element -- local object URLs */
import { useRef } from "react";
import {
  ChevronDown,
  Crosshair,
  FlipHorizontal2,
  FlipVertical2,
  Grid3x3,
  Group,
  ImagePlus,
  ImageUp,
  LayoutGrid,
  Magnet,
  PanelRight,
  RectangleHorizontal,
  RectangleVertical,
  Scaling,
  Shirt,
  Ungroup,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Move,
} from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/store/editor-store";
import type { Design, FitMode } from "@/types/editor";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "@/components/ui/toolbar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/settings/NumberField";
import { ColorChoices, SIZE_PRESETS } from "@/components/settings/DimensionControls";
import { sheetLabel } from "@/components/settings/SheetPanel";
import { ALIGN_ITEMS } from "./CanvasContextMenu";
import { computeImageRect, croppedSourceSize } from "@/lib/image/image-fit";
import { resolutionReport } from "@/lib/image/image-resolution";
import { findProduct } from "@/lib/catalogue/products";
import { ACCEPT_ATTR } from "@/lib/image/image-loader";
import { replaceDesignImage, uploadIntoSlot } from "@/lib/editor-actions";
import { cn } from "@/lib/utils";

const FIT_LABELS: Record<Exclude<FitMode, "stretch">, string> = {
  contain: "Fit entire image",
  "fit-width": "Fit width",
  "fit-height": "Fit height",
  fill: "Fill with colour",
  manual: "Manual scale",
};

export function QuickActionsBar() {
  const selection = useEditor((s) => s.selection);
  const designs = useEditor((s) => s.doc.designs);
  const picked = designs.filter((d) => selection.includes(d.id));
  const inspectorOpen = useEditor((s) => s.inspectorOpen);
  const setInspectorOpen = useEditor((s) => s.setInspectorOpen);
  const openMockup = useEditor((s) => s.openMockup);
  const single = picked.length === 1 ? picked[0] : undefined;

  let content: React.ReactNode;
  if (picked.length === 0) content = <SheetTools />;
  else if (picked.length > 1) content = <MultiTools count={picked.length} designs={picked} />;
  else if (!picked[0].assetId) content = <SlotTools design={picked[0]} />;
  else content = <ImageTools design={picked[0]} />;

  return (
    <div className="pointer-events-none absolute top-8 right-0 left-0 z-20 flex justify-center px-3">
      <Toolbar
        aria-label="Quick actions"
        className="scroll-thin pointer-events-auto h-11 max-w-full overflow-x-auto rounded-xl bg-surface px-1.5 shadow-bar ring-1 ring-black/5 animate-up"
      >
        {content}
        {single && (single.productId || single.assetId) && (
          <>
            <ToolbarSeparator />
            <Tooltip label="See it on the product, in any colour">
              <ToolbarButton onClick={() => openMockup(single.id)}>
                <Shirt />
                <span className="hidden sm:inline">Preview</span>
              </ToolbarButton>
            </Tooltip>
          </>
        )}
        <ToolbarSeparator />
        <Tooltip label={inspectorOpen ? "Hide properties" : "All properties"}>
          <ToolbarButton active={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)} aria-label="Toggle properties panel">
            <PanelRight />
            <span className="hidden sm:inline">Edit</span>
          </ToolbarButton>
        </Tooltip>
      </Toolbar>
    </div>
  );
}

function SheetTools() {
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  const setDialog = useEditor((s) => s.setDialog);
  const autoArrange = useEditor((s) => s.autoArrange);
  const hasDesigns = useEditor((s) => s.doc.designs.length > 0);
  return (
    <>
      <ToolbarButton onClick={() => setDialog("sheet")}>
        <Scaling />
        {sheetLabel(page)}
        <ChevronDown className="size-3.5! text-ink-faint" />
      </ToolbarButton>
      <Tooltip label="Portrait">
        <ToolbarButton active={page.orientation === "portrait"} aria-label="Portrait" onClick={() => setPage({ orientation: "portrait" })}>
          <RectangleVertical />
        </ToolbarButton>
      </Tooltip>
      <Tooltip label="Landscape">
        <ToolbarButton active={page.orientation === "landscape"} aria-label="Landscape" onClick={() => setPage({ orientation: "landscape" })}>
          <RectangleHorizontal />
        </ToolbarButton>
      </Tooltip>
      <ToolbarSeparator />
      <Popover>
        <PopoverTrigger asChild>
          <ToolbarButton aria-label="Sheet background">
            <span
              className={cn("size-4 rounded-sm ring-1 ring-line-strong", page.background === null && "checker")}
              style={page.background ? { background: page.background } : undefined}
            />
            <span className="hidden md:inline">Background</span>
          </ToolbarButton>
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <p className="mb-2 text-[12px] font-semibold">Sheet background</p>
          <ColorChoices value={page.background} onChange={(background) => setPage({ background })} />
        </PopoverContent>
      </Popover>
      <Tooltip label="Grid">
        <ToolbarButton active={page.showGrid} aria-label="Show grid" onClick={() => setPage({ showGrid: !page.showGrid })}>
          <Grid3x3 />
        </ToolbarButton>
      </Tooltip>
      <Tooltip label="Snapping">
        <ToolbarButton active={page.snapToGuides} aria-label="Snapping" onClick={() => setPage({ snapToGuides: !page.snapToGuides })}>
          <Magnet />
        </ToolbarButton>
      </Tooltip>
      <ToolbarSeparator />
      <ToolbarButton
        disabled={!hasDesigns}
        onClick={() => {
          const r = autoArrange("all");
          if (r.unplaced > 0) toast.warning(`${r.unplaced} did not fit`, { description: r.suggestions[0] });
          else toast.success("Arranged without overlap", { description: `${r.placed} designs, sizes unchanged.` });
        }}
      >
        <LayoutGrid />
        <span className="hidden md:inline">Arrange all</span>
      </ToolbarButton>
    </>
  );
}

function SizePopover({ design }: { design: Design }) {
  const unit = useEditor((s) => s.unit);
  const dpi = useEditor((s) => s.doc.page.dpi);
  const resizeDesign = useEditor((s) => s.resizeDesign);
  const updateDesign = useEditor((s) => s.updateDesign);
  const u = unit === "px" ? "mm" : unit;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton className="tnum">
          <Scaling />
          {+design.width.toFixed(1)} × {+design.height.toFixed(1)} {u === "mm" ? "mm" : ""}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent>
        <p className="mb-2 text-[12px] font-semibold">Print size</p>
        <div className="flex items-center gap-1.5">
          <NumberField label="W" valueMm={design.width} unit={unit} dpi={dpi} min={1} max={6000} onCommit={(width) => resizeDesign(design.id, { width })} />
          <NumberField label="H" valueMm={design.height} unit={unit} dpi={dpi} min={1} max={6000} onCommit={(height) => resizeDesign(design.id, { height })} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                updateDesign(design.id, {
                  width: p.width,
                  height: p.height,
                  lockAspect: false,
                  fitMode: design.fitMode === "manual" || design.fitMode.startsWith("fit-") ? "contain" : design.fitMode,
                  x: design.x + design.width / 2 - p.width / 2,
                  y: design.y + design.height / 2 - p.height / 2,
                })
              }
              className="tnum h-6 rounded-md bg-subtle px-1.5 text-[11px] font-medium text-ink-muted hover:bg-subtle-2 hover:text-ink"
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-ink-muted">The whole image is fitted inside; nothing is cropped.</p>
      </PopoverContent>
    </Popover>
  );
}

function PositionPopover({ label = "Position" }: { label?: string }) {
  const alignSelection = useEditor((s) => s.alignSelection);
  const centerSelection = useEditor((s) => s.centerSelection);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton>
          <Move />
          <span className="hidden md:inline">{label}</span>
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="mb-2 text-[12px] font-semibold">Align to printable area</p>
        <div className="grid grid-cols-3 gap-1">
          {ALIGN_ITEMS.map((a) => (
            <button
              key={a.target}
              type="button"
              onClick={() => alignSelection(a.target, "printable")}
              className="flex h-9 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium hover:bg-subtle [&_svg]:size-4 [&_svg]:text-ink-muted"
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
        <Button className="mt-2 w-full" size="sm" onClick={centerSelection}>
          <Crosshair />
          Centre on sheet
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function FlipButtons() {
  const flipDesigns = useEditor((s) => s.flipDesigns);
  return (
    <>
      <Tooltip label="Flip horizontal" shortcut="Shift H">
        <ToolbarButton aria-label="Flip horizontal" onClick={() => flipDesigns("x")}>
          <FlipHorizontal2 />
        </ToolbarButton>
      </Tooltip>
      <Tooltip label="Flip vertical" shortcut="Shift V">
        <ToolbarButton aria-label="Flip vertical" onClick={() => flipDesigns("y")}>
          <FlipVertical2 />
        </ToolbarButton>
      </Tooltip>
    </>
  );
}

function ImageTools({ design }: { design: Design }) {
  const asset = useEditor((s) => (design.assetId ? s.assets[design.assetId] : undefined));
  const setFitMode = useEditor((s) => s.setFitMode);
  const input = useRef<HTMLInputElement>(null);
  if (!asset) return null;
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const rect = computeImageRect(design, croppedSourceSize(natural, design.crop));
  const q = resolutionReport(natural, design.crop, rect);
  const tone = q.level === "high" ? "bg-ok-soft text-ok" : q.level === "acceptable" ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger";

  return (
    <>
      <ToolbarButton onClick={() => input.current?.click()}>
        <ImageUp />
        <span className="hidden md:inline">Replace</span>
      </ToolbarButton>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void replaceDesignImage(design.id, f);
          e.target.value = "";
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton>
            {design.fitMode === "stretch" ? "Stretched" : FIT_LABELS[design.fitMode]}
            <ChevronDown className="size-3.5! text-ink-faint" />
          </ToolbarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {(Object.keys(FIT_LABELS) as (keyof typeof FIT_LABELS)[]).map((m) => (
            <DropdownMenuItem key={m} onSelect={() => setFitMode(design.id, m)} className={cn(design.fitMode === m && "font-semibold text-accent")}>
              {FIT_LABELS[m]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <SizePopover design={design} />
      <ToolbarSeparator />
      <FlipButtons />
      <PositionPopover />
      <ToolbarSeparator />
      <Tooltip label={`${Math.round(q.effectiveDpi)} DPI at this size. 300 or more prints sharp.`}>
        <span className={cn("tnum mx-1 shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold", tone)}>
          {Math.round(q.effectiveDpi)} DPI
        </span>
      </Tooltip>
    </>
  );
}

function SlotTools({ design }: { design: Design }) {
  const assets = useEditor((s) => s.assets);
  const fillSlot = useEditor((s) => s.fillSlot);
  const input = useRef<HTMLInputElement>(null);
  const product = findProduct(design.productId);
  const list = Object.values(assets);
  return (
    <>
      <ToolbarButton className="bg-accent text-white hover:bg-accent-hover" onClick={() => input.current?.click()}>
        <ImagePlus />
        Add image
      </ToolbarButton>
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
      {list.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <ToolbarButton>
              From uploads
              <ChevronDown className="size-3.5! text-ink-faint" />
            </ToolbarButton>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <p className="mb-2 text-[12px] font-semibold">Fill with an uploaded image</p>
            <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
              {list.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => fillSlot(design.id, a.id)}
                  className="checker flex aspect-square items-center justify-center overflow-hidden rounded-md ring-1 ring-line hover:ring-2 hover:ring-accent"
                  title={a.name}
                >
                  <img src={a.objectUrl} alt={a.name} className="max-h-full max-w-full object-contain" />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      <SizePopover design={design} />
      <PositionPopover />
      {product && (
        <>
          <ToolbarSeparator />
          <span className="mx-1 shrink-0 text-[12px] whitespace-nowrap text-ink-muted">
            {product.name}, {product.detail}
            {design.bleed > 0 ? `, includes ${design.bleed} mm bleed` : product.wrap ? ", includes seam overlap" : ""}
          </span>
        </>
      )}
    </>
  );
}

function MultiTools({ count, designs }: { count: number; designs: Design[] }) {
  const alignSelection = useEditor((s) => s.alignSelection);
  const distributeSelection = useEditor((s) => s.distributeSelection);
  const autoArrange = useEditor((s) => s.autoArrange);
  const groupSelection = useEditor((s) => s.groupSelection);
  const ungroupSelection = useEditor((s) => s.ungroupSelection);
  const grouped = designs.every((d) => d.groupId && d.groupId === designs[0].groupId);
  return (
    <>
      <span className="mx-2 shrink-0 text-[12.5px] font-semibold">{count} selected</span>
      <ToolbarSeparator />
      <Popover>
        <PopoverTrigger asChild>
          <ToolbarButton>
            <AlignHorizontalSpaceAround />
            Align
            <ChevronDown className="size-3.5! text-ink-faint" />
          </ToolbarButton>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <p className="mb-2 text-[12px] font-semibold">Align to each other</p>
          <div className="grid grid-cols-3 gap-1">
            {ALIGN_ITEMS.map((a) => (
              <button
                key={a.target}
                type="button"
                onClick={() => alignSelection(a.target, "selection")}
                className="flex h-9 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium hover:bg-subtle [&_svg]:size-4 [&_svg]:text-ink-muted"
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-3 mb-2 text-[12px] font-semibold">Distribute evenly</p>
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" disabled={count < 3} onClick={() => distributeSelection("x")}>
              <AlignHorizontalSpaceAround /> Horizontally
            </Button>
            <Button size="sm" disabled={count < 3} onClick={() => distributeSelection("y")}>
              <AlignVerticalSpaceAround /> Vertically
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <PositionPopover label="On sheet" />
      <ToolbarButton
        onClick={() => {
          const r = autoArrange("selection");
          if (r.unplaced > 0) toast.warning(`${r.unplaced} did not fit`, { description: r.suggestions[0] });
        }}
      >
        <LayoutGrid />
        <span className="hidden md:inline">Arrange</span>
      </ToolbarButton>
      {grouped ? (
        <ToolbarButton onClick={ungroupSelection}>
          <Ungroup />
          <span className="hidden md:inline">Ungroup</span>
        </ToolbarButton>
      ) : (
        <ToolbarButton onClick={groupSelection}>
          <Group />
          <span className="hidden md:inline">Group</span>
        </ToolbarButton>
      )}
      <FlipButtons />
    </>
  );
}
