"use client";

/**
 * Product preview: see a design on the product, in any blank colour.
 *
 * - `LivePreviewDock` (its own file) keeps the product visible on the canvas;
 *   `ProductSection` gives the properties panel the blank colours.
 * - `MockupDialog` is the large view: blank colours, turning a mug or tumbler
 *   around, the print area outline, other product boxes on the page, and a
 *   PNG download to send to a customer.
 *
 * The blank colour is stored on the design (`productColor`) so it is saved
 * with the project, but it is never printed.
 */

import { useRef, useState } from "react";
import { Box, Check, Download, Eye, Image as ImageIcon, Pause, Play, RotateCw, Shuffle, TriangleAlert } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { Design, PrintProcess } from "@/types/editor";
import { findProduct, slotSize, type ProductPreset } from "@/lib/catalogue/products";
import { colorsFor, resolveColor, type ProductColor } from "@/lib/catalogue/colors";
import { randomSeed, sampleSet, svgDataUrl } from "@/lib/catalogue/sample-designs";
import { sampleUrl } from "./sample-url";
import { applySampleDesign } from "@/lib/editor-actions";
import { downloadBlob, safeFilename } from "@/lib/export/export-raster";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, focusDialogItself } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Note } from "@/components/settings/Section";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ProductMockup } from "./ProductMockup";
import { designImageUrl } from "./design-image";
import { Product3D } from "./Product3D";

/** Products offered when previewing a plain image that is not a product box. */
const PREVIEW_PRODUCTS = ["tee-full-front", "hoodie-front", "mug-11oz", "tumbler-20oz", "tote", "coaster-square", "cap-front", "mousepad-rect"];
const DEFAULT_PREVIEW_PRODUCT = "tee-full-front";

export function blendFor(process: PrintProcess): "multiply" | "normal" {
  // Sublimation dye is transparent and takes on the blank colour; DTF is opaque.
  return process === "sublimation" ? "multiply" : "normal";
}

export function ColorSwatches({
  colors,
  value,
  onChange,
  size = "md",
}: {
  colors: ProductColor[];
  value: ProductColor;
  onChange: (c: ProductColor) => void;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label="Product colour" className="flex flex-wrap gap-1.5">
      {colors.map((c) => {
        const active = c.id === value.id;
        return (
          <Tooltip key={c.id} label={c.name}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={c.name}
              onClick={() => onChange(c)}
              className={cn(
                "flex items-center justify-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-110",
                size === "sm" ? "size-6" : "size-7",
                active && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
              )}
              style={{ background: c.hex }}
            >
              {active && <Check className={cn("size-3.5", c.dark ? "text-white" : "text-ink")} />}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Product shown for a design: its own preset, or a T-shirt for plain images. */
function previewProduct(design: Design, fallbackId = DEFAULT_PREVIEW_PRODUCT): ProductPreset {
  return findProduct(design.productId) ?? findProduct(fallbackId)!;
}

function useDesignImage(design: Design | undefined, maxSide = 640): string | null {
  const asset = useEditor((s) => (design?.assetId ? s.assets[design.assetId] : undefined));
  if (!design || !asset) return null;
  return designImageUrl(design, asset, maxSide);
}

function DarkSublimationNote({ color, process }: { color: ProductColor; process: PrintProcess }) {
  if (process !== "sublimation" || !color.dark) return null;
  return (
    <Note tone="warn" icon={<TriangleAlert />}>
      Sublimation ink is transparent and barely shows on {color.name.toLowerCase()} blanks. Use white or light polyester, or
      switch this sheet to DTF for dark garments.
    </Note>
  );
}

/**
 * Inspector section for a product box: blank colour and a button for the
 * large preview. The picture itself is in the live preview docked on the
 * canvas, so it stays visible while designing.
 */
export function ProductSection({ design }: { design: Design }) {
  const process = useEditor((s) => s.doc.page.process);
  const updateDesign = useEditor((s) => s.updateDesign);
  const openMockup = useEditor((s) => s.openMockup);
  const setPreviewDock = useEditor((s) => s.setPreviewDock);
  const product = previewProduct(design);
  const color = resolveColor(product, design.productColor);
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-ink-muted">
          Blank colour <span className="text-ink">{color.name}</span>
        </p>
        <div aria-label="Blank colour" role="group">
          <ColorSwatches size="sm" colors={colorsFor(product)} value={color} onChange={(c) => updateDesign(design.id, { productColor: c.hex })} />
        </div>
      </div>
      <DarkSublimationNote color={color} process={process} />
      <div className="flex gap-1.5">
        <Button className="flex-1" onClick={() => openMockup(design.id)}>
          <Eye />
          Large preview
        </Button>
        <Button variant="ghost" onClick={() => setPreviewDock(true)}>
          Show on canvas
        </Button>
      </div>
    </div>
  );
}

/** "Try a design" strip for empty product boxes. */
export function SampleStrip({ design }: { design: Design }) {
  const [seed, setSeed] = useState(randomSeed);
  const product = findProduct(design.productId);
  const kind = product && (product.group === "apparel" || product.art === "cap" || product.art === "tote") ? "emblem" : "any";
  const aspect = design.width / design.height;
  const samples = sampleSet(seed, 4, kind);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[12px] font-medium text-ink-muted">Try a sample design</p>
        <button
          type="button"
          onClick={() => setSeed(randomSeed())}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] font-medium text-accent hover:bg-accent-soft"
        >
          <Shuffle className="size-3.5" /> Shuffle
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {samples.map((s) => (
          <Tooltip key={s.id} label={`Use “${s.name}”`}>
            <button
              type="button"
              onClick={() => void applySampleDesign(s, design.id)}
              className="checker aspect-square overflow-hidden rounded-md ring-1 ring-line transition hover:ring-2 hover:ring-accent"
              aria-label={`Use sample design ${s.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL */}
              <img src={sampleUrl(s, aspect)} alt="" className="size-full object-contain" />
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

export function MockupDialog() {
  const open = useEditor((s) => s.dialog === "mockup");
  const setDialog = useEditor((s) => s.setDialog);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      {open && <MockupBody />}
    </Dialog>
  );
}

function MockupBody() {
  const designs = useEditor((s) => s.doc.designs);
  const process = useEditor((s) => s.doc.page.process);
  const mockupId = useEditor((s) => s.mockupDesignId);
  const updateDesign = useEditor((s) => s.updateDesign);
  const setDialog = useEditor((s) => s.setDialog);
  const productBoxes = designs.filter((d) => d.productId);
  const design = designs.find((d) => d.id === mockupId) ?? productBoxes[0] ?? designs.find((d) => d.assetId);
  const [fallbackProduct, setFallbackProduct] = useState(DEFAULT_PREVIEW_PRODUCT);
  const [localColor, setLocalColor] = useState<string | null>(null);
  const [showArea, setShowArea] = useState(false);
  const [turn, setTurn] = useState(0);
  const [view, setView] = useState<"3d" | "flat">("3d");
  const [spin, setSpin] = useState(false);
  const capture = useRef<(() => Promise<Blob | null>) | null>(null);
  const image = useDesignImage(design, 1200);

  if (!design) {
    return (
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Product preview</DialogTitle>
          <DialogDescription>Add a product from Products, or an image, to preview it on a product.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="primary" onClick={() => setDialog(null)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  const isProductBox = !!design.productId;
  const product = previewProduct(design, fallbackProduct);
  const color = resolveColor(product, isProductBox ? design.productColor : localColor);
  const setColor = (c: ProductColor) => (isProductBox ? updateDesign(design.id, { productColor: c.hex }) : setLocalColor(c.hex));
  const size = slotSize(product);

  const download = async () => {
    if (view === "3d") {
      const blob = await capture.current?.();
      if (blob) downloadBlob(blob, `${safeFilename(design.name)}-${color.id}-3d.png`);
      return;
    }
    const svg = document.getElementById("mockup-svg")?.querySelector("svg");
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.src = svgDataUrl(markup);
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1600;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f5f6f8";
    ctx.fillRect(0, 0, 1600, 1600);
    ctx.drawImage(img, 0, 0, 1600, 1600);
    canvas.toBlob((b) => b && downloadBlob(b, `${safeFilename(design.name)}-${color.id}-mockup.png`), "image/png");
  };

  return (
    // Focusing the first swatch on open would pop its tooltip over the preview.
    <DialogContent className="max-w-[960px]" onOpenAutoFocus={focusDialogItself}>
      <DialogHeader>
        <DialogTitle>{product.name} preview</DialogTitle>
        <DialogDescription>
          {product.detail}, print area {+product.width.toFixed(1)} × {+product.height.toFixed(1)} mm
          {product.wrap ? " around the product" : ""}. Preview only; colours on screen are approximate.
        </DialogDescription>
      </DialogHeader>
      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_320px]">
        <div className="relative flex h-[min(560px,60vh)] min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_50%_40%,var(--surface),var(--subtle-2))]">
          <div className="absolute top-3 left-3 z-10 rounded-lg bg-surface/95 shadow-sm">
            <Segmented<"3d" | "flat">
              ariaLabel="Preview type"
              value={view}
              onValueChange={setView}
              options={[
                { value: "3d", label: <><Box /> 3D model</> },
                { value: "flat", label: <><ImageIcon /> Flat</> },
              ]}
            />
          </div>
          {view === "3d" ? (
            <Product3D product={product} color={color.hex} designUrl={image} process={process} autoRotate={spin} captureRef={capture} onInteract={() => setSpin(false)} />
          ) : (
          <div id="mockup-svg" className="aspect-square w-full max-w-[min(520px,60vh)] p-4">
            <ProductMockup
              product={product}
              color={color.hex}
              design={image}
              blend={blendFor(process)}
              showArea={showArea || !image}
              turn={turn}
              className="size-full drop-shadow-[0_12px_24px_rgb(16_24_40/0.14)]"
              title={`${product.name} in ${color.name}`}
            />
          </div>
          )}
          {!image && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3 py-1 text-[12px] font-medium shadow">
              Add an image to the box to see it on the product
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 border-l border-line p-5">
          {!isProductBox && (
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Show on</p>
              <div className="grid grid-cols-4 gap-1.5">
                {PREVIEW_PRODUCTS.map((id) => {
                  const p = findProduct(id)!;
                  return (
                    <Tooltip key={id} label={`${p.name}, ${p.detail}`}>
                      <button
                        type="button"
                        aria-pressed={fallbackProduct === id}
                        onClick={() => {
                          setFallbackProduct(id);
                          setTurn(0);
                        }}
                        className={cn(
                          "aspect-square rounded-md bg-subtle p-1 transition-colors",
                          fallbackProduct === id ? "ring-2 ring-accent" : "hover:bg-subtle-2",
                        )}
                      >
                        <ProductMockup product={p} className="size-full" />
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-muted">
              Blank colour <span className="text-ink">{color.name}</span>
            </p>
            <ColorSwatches colors={colorsFor(product)} value={color} onChange={setColor} />
            <div className="mt-2">
              <DarkSublimationNote color={color} process={process} />
            </div>
          </div>

          {view === "3d" && (
            <label className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-1.5">
                {spin ? <Pause className="size-3.5 text-ink-muted" /> : <Play className="size-3.5 text-ink-muted" />} Turn automatically
              </span>
              <Switch checked={spin} onCheckedChange={setSpin} aria-label="Turn automatically" />
            </label>
          )}

          {view === "flat" && product.wrap && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-ink-muted">
                <span className="flex items-center gap-1">
                  <RotateCw className="size-3.5" /> Turn the {product.name.toLowerCase().includes("mug") ? "mug" : "product"}
                </span>
                <span className="tnum text-ink">{Math.round(turn * 360)}°</span>
              </div>
              <Slider aria-label="Turn product" min={0} max={359} step={1} value={[Math.round(turn * 360)]} onValueChange={([v]) => setTurn(v / 360)} />
            </div>
          )}

          {view === "flat" && (
            <label className="flex items-center justify-between gap-3 text-[13px]">
              Show print area
              <Switch checked={showArea} onCheckedChange={setShowArea} aria-label="Show print area" />
            </label>
          )}

          {!isProductBox && (
            <p className="text-[12px] leading-relaxed text-ink-muted">
              This image is not in a product box, so it is shown scaled to the {product.detail.toLowerCase()} area. Add a
              product from Products to print it at that exact size.
            </p>
          )}
          {isProductBox && (
            <p className="tnum text-[12px] text-ink-muted">
              Box on the sheet: {+size.width.toFixed(1)} × {+size.height.toFixed(1)} mm
              {product.wrap ? " including 6 mm seam overlap" : product.bleed ? ` including ${product.bleed} mm bleed` : ""}.
            </p>
          )}

          {productBoxes.length > 1 && (
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Other products on this page</p>
              <div className="grid grid-cols-4 gap-1.5">
                {productBoxes.map((d) => (
                  <OtherProduct key={d.id} design={d} active={d.id === design.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" disabled={!image && view === "flat"} onClick={() => void download()}>
          <Download />
          {view === "3d" ? "Save 3D image" : "Download preview PNG"}
        </Button>
        <Button variant="primary" onClick={() => setDialog(null)}>
          Done
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function OtherProduct({ design, active }: { design: Design; active: boolean }) {
  const product = previewProduct(design);
  const image = useDesignImage(design, 240);
  return (
    <Tooltip label={design.name}>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => useEditor.setState({ mockupDesignId: design.id })}
        className={cn("aspect-square rounded-md bg-subtle p-0.5", active ? "ring-2 ring-accent" : "hover:bg-subtle-2")}
      >
        <ProductMockup product={product} color={resolveColor(product, design.productColor).hex} design={image} className="size-full" />
      </button>
    </Tooltip>
  );
}
