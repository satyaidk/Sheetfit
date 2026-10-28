"use client";

/**
 * Catalogue 3D viewer: look at any product in 3D before designing for it.
 *
 * Opened from a product card. Shows the product with a sample design (or
 * bare), in any blank colour and either process the product supports, with
 * auto-rotate, reset and an image download; from here the user can start a
 * design for the product or add it to the current sheet.
 */

import { useRef, useState } from "react";
import { Download, Pause, Play, Plus, RotateCcw, Shuffle } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { PrintProcess } from "@/types/editor";
import { findProduct, minSheetFor, slotSize } from "@/lib/catalogue/products";
import { colorsFor, resolveColor, type ProductColor } from "@/lib/catalogue/colors";
import { randomSeed, renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";
import { addProduct, requestProduct } from "@/lib/editor-actions";
import { downloadBlob, safeFilename } from "@/lib/export/export-raster";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, focusDialogItself } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { Note } from "@/components/settings/Section";
import { ColorSwatches } from "./MockupPreview";
import { Product3D } from "./Product3D";

const inches = (mm: number) => +(mm / 25.4).toFixed(2);

export function Product3DDialog() {
  const open = useEditor((s) => s.dialog === "viewer3d");
  const productId = useEditor((s) => s.viewer3dProductId);
  const setDialog = useEditor((s) => s.setDialog);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      {open && productId && <Viewer3DBody key={productId} productId={productId} />}
    </Dialog>
  );
}

function Viewer3DBody({ productId }: { productId: string }) {
  const product = findProduct(productId)!;
  const setDialog = useEditor((s) => s.setDialog);
  const pageProcess = useEditor((s) => s.doc.page.process);
  const [color, setColor] = useState<ProductColor>(resolveColor(product, null));
  const [process, setProcess] = useState<PrintProcess>(product.processes.includes(pageProcess) ? pageProcess : product.processes[0]);
  const [seed, setSeed] = useState(randomSeed);
  const [withDesign, setWithDesign] = useState(true);
  const [spin, setSpin] = useState(true);
  const [viewKey, setViewKey] = useState(0);
  const capture = useRef<(() => Promise<Blob | null>) | null>(null);
  const slot = slotSize(product);
  const garment = product.group === "apparel" || product.art === "cap" || product.art === "tote";
  const design = withDesign ? svgDataUrl(renderSampleSvg(sampleDesign(seed, garment ? "emblem" : "any"), slot.width / slot.height)) : null;
  const sheet = minSheetFor(product);

  const save = async () => {
    const blob = await capture.current?.();
    if (blob) downloadBlob(blob, `${safeFilename(`${product.name} ${product.detail}`)}-${color.id}-3d.png`);
  };

  return (
    <DialogContent className="max-w-[1040px]" onOpenAutoFocus={focusDialogItself}>
      <DialogHeader>
        <DialogTitle>
          {product.name}, {product.detail.toLowerCase()} in 3D
        </DialogTitle>
        <DialogDescription>
          Print area {+product.width.toFixed(1)} × {+product.height.toFixed(1)} mm ({inches(product.width)} × {inches(product.height)} in)
          {product.wrap ? " around the product" : ""}. Drag to turn it; colours on screen are approximate.
        </DialogDescription>
      </DialogHeader>
      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_300px]">
        <div className="relative h-[min(560px,58vh)] min-h-[320px]">
          <Product3D key={viewKey} product={product} color={color.hex} designUrl={design} process={process} autoRotate={spin} captureRef={capture} onInteract={() => setSpin(false)} />
          <div className="absolute top-3 right-3 flex gap-1.5">
            <Tooltip label={spin ? "Stop turning" : "Turn automatically"}>
              <Button size="icon" className="bg-surface/95" aria-label={spin ? "Stop turning" : "Turn automatically"} onClick={() => setSpin(!spin)}>
                {spin ? <Pause /> : <Play />}
              </Button>
            </Tooltip>
            <Tooltip label="Reset view">
              <Button size="icon" className="bg-surface/95" aria-label="Reset view" onClick={() => setViewKey((k) => k + 1)}>
                <RotateCcw />
              </Button>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-l border-line p-5">
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-muted">
              Blank colour <span className="text-ink">{color.name}</span>
            </p>
            <ColorSwatches colors={colorsFor(product)} value={color} onChange={setColor} />
          </div>
          {product.processes.length > 1 && (
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Print process</p>
              <Segmented<PrintProcess>
                ariaLabel="Print process for the preview"
                value={process}
                onValueChange={setProcess}
                options={[
                  { value: "dtf", label: "DTF" },
                  { value: "sublimation", label: "Sublimation" },
                ]}
              />
            </div>
          )}
          {process === "sublimation" && color.dark && (
            <Note tone="warn">Sublimation dye is see-through, so it fades into dark blanks. DTF prints opaque.</Note>
          )}
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2.5 text-[13px]">
              <Switch checked={withDesign} onCheckedChange={setWithDesign} aria-label="Show a sample design" />
              Sample design
            </label>
            <Button size="sm" variant="ghost" disabled={!withDesign} onClick={() => setSeed(randomSeed())}>
              <Shuffle />
              Shuffle
            </Button>
          </div>
          <dl className="tnum grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-subtle p-3 text-[12.5px]">
            <dt className="text-ink-muted">Print area</dt>
            <dd className="text-right">
              {+product.width.toFixed(1)} × {+product.height.toFixed(1)} mm
            </dd>
            <dt className="text-ink-muted">Box on the sheet</dt>
            <dd className="text-right">
              {+slot.width.toFixed(1)} × {+slot.height.toFixed(1)} mm
            </dd>
            <dt className="text-ink-muted">Smallest sheet</dt>
            <dd className="text-right">{sheet ? sheet.name : "A roll"}</dd>
            <dt className="text-ink-muted">Process</dt>
            <dd className="text-right">{product.processes.map((p) => (p === "dtf" ? "DTF" : "Sublimation")).join(" or ")}</dd>
          </dl>
          {product.note && <p className="text-[12px] leading-relaxed text-ink-muted">{product.note}</p>}
        </div>
      </div>
      <DialogFooter className="justify-between">
        <Button variant="ghost" onClick={() => void save()}>
          <Download />
          Save image
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setDialog(null);
              addProduct(product.id);
            }}
          >
            <Plus />
            Add to this sheet
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setDialog(null);
              requestProduct(product.id);
            }}
          >
            Design this product
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
