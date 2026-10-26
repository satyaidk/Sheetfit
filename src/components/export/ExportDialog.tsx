"use client";

/**
 * Export and print dialog.
 *
 * The preview is rendered from the same render plan the exporters use, so it
 * shows what the file will contain, not what the editor canvas shows. Checks
 * that could spoil a print (designs in the margins, low resolution, a canvas
 * too large for this browser) are listed before the user commits.
 */

import { useEffect, useMemo, useState } from "react";
/* eslint-disable @next/next/no-img-element -- preview is a generated data URL */
import { Download, FileImage, FileText, FolderArchive, Loader2, Printer, TriangleAlert, CircleCheck } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { ExportDpi } from "@/types/editor";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Note } from "@/components/settings/Section";
import { ColorChoices } from "@/components/settings/DimensionControls";
import { buildRenderPlan } from "@/lib/render/render-plan";
import {
  downloadBlob,
  estimatePixelSize,
  exportJpeg,
  exportPdf,
  exportPng,
  renderPreviewDataUrl,
  safeFilename,
} from "@/lib/export/export-raster";
import { browserCanvasAreaLimit, canvasSizeWithinLimits, CanvasTooLargeError } from "@/lib/export/rasterize";
import { printSheet } from "@/lib/export/print";
import { exportProjectFile } from "@/lib/editor-actions";
import { placementStatus } from "@/lib/layout/a4-layout";
import { computeImageRect, croppedSourceSize } from "@/lib/image/image-fit";
import { resolutionReport } from "@/lib/image/image-resolution";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Format = "pdf" | "png" | "jpeg" | "project";

const FORMATS: { value: Format; title: string; body: string; icon: React.ReactNode }[] = [
  { value: "pdf", title: "PDF", body: "Exact A4 page. Best for printing.", icon: <FileText /> },
  { value: "png", title: "PNG", body: "Lossless, keeps transparency.", icon: <FileImage /> },
  { value: "jpeg", title: "JPEG", body: "Smaller file, solid background.", icon: <FileImage /> },
  { value: "project", title: "Project", body: "Reopen and edit later.", icon: <FolderArchive /> },
];

export function ExportDialog() {
  const dialog = useEditor((s) => s.dialog);
  const setDialog = useEditor((s) => s.setDialog);
  const doc = useEditor((s) => s.doc);
  const assets = useEditor((s) => s.assets);
  const projectName = useEditor((s) => s.project.name);
  const open = dialog !== null;
  const mode = dialog ?? "export";

  const [format, setFormat] = useState<Format>("pdf");
  const [dpi, setDpi] = useState<ExportDpi>(doc.page.dpi);
  const [jpegBg, setJpegBg] = useState<string>("#ffffff");
  const [quality, setQuality] = useState(92);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const plan = useMemo(() => buildRenderPlan(doc, assets), [doc, assets]);
  const assetMap = useMemo(() => new Map(Object.entries(assets)), [assets]);

  // Render the preview when the dialog opens (and when the sheet changes).
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      try {
        setPreview(renderPreviewDataUrl(plan, assetMap, 900));
      } catch {
        setPreview(null);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [open, plan, assetMap]);

  const pixels = estimatePixelSize(plan, dpi);
  const rasterFits = canvasSizeWithinLimits(pixels, browserCanvasAreaLimit());
  const outside = doc.designs.filter((d) => placementStatus(d, doc.page).exceedsPrintable);
  const lowRes = doc.designs.filter((d) => {
    const a = assets[d.assetId];
    if (!a) return false;
    const natural = { width: a.naturalWidth, height: a.naturalHeight };
    const r = computeImageRect(d, croppedSourceSize(natural, d.crop));
    return resolutionReport(natural, d.crop, r).level === "low";
  });
  const name = filename.trim() || safeFilename(projectName);

  const run = async () => {
    setBusy(true);
    // Yield so the button can show its busy state before heavy rendering.
    await new Promise((r) => setTimeout(r, 30));
    try {
      if (mode === "print") {
        await printSheet(plan, assetMap, doc.page.orientation, dpi);
      } else if (format === "project") {
        await exportProjectFile(name);
      } else if (format === "pdf") {
        downloadBlob(await exportPdf(plan, assetMap, projectName), `${name}.pdf`);
        toast.success("PDF exported", { description: `A4 ${doc.page.orientation}, ${outsideLabel(outside.length)}` });
      } else if (format === "png") {
        downloadBlob(await exportPng(plan, assetMap, dpi), `${name}-${dpi}dpi.png`);
        toast.success("PNG exported", { description: `${pixels.width} × ${pixels.height} px at ${dpi} DPI` });
      } else {
        downloadBlob(await exportJpeg(plan, assetMap, dpi, jpegBg, quality / 100), `${name}-${dpi}dpi.jpg`);
        toast.success("JPEG exported", { description: `${pixels.width} × ${pixels.height} px at ${dpi} DPI` });
      }
      if (mode === "export") setDialog(null);
    } catch (error) {
      toast.error(
        error instanceof CanvasTooLargeError
          ? error.message
          : `Export failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const isRaster = mode === "export" && (format === "png" || format === "jpeg");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent className="max-w-[880px]">
        <DialogHeader>
          <DialogTitle>{mode === "print" ? "Print sheet" : "Export sheet"}</DialogTitle>
          <DialogDescription>
            A4 {doc.page.orientation}, {doc.page.orientation === "portrait" ? "210 × 297" : "297 × 210"} mm.{" "}
            {mode === "print" ? "Prints at actual size." : "The preview shows exactly what the file contains."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_340px]">
          <div className="mat-surface flex items-center justify-center p-6">
            {preview ? (
              <img
                src={preview}
                alt="Preview of the exported A4 sheet"
                className={cn(
                  "max-h-[56vh] w-auto shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
                  doc.page.background === null && (mode === "print" || format !== "png")
                    ? "bg-white"
                    : "bg-[conic-gradient(#e6e8e4_25%,#fff_0_50%,#e6e8e4_0_75%,#fff_0)] bg-[length:12px_12px]",
                )}
                style={format === "jpeg" && mode === "export" && doc.page.background === null ? { background: jpegBg } : undefined}
              />
            ) : (
              <Loader2 className="size-6 animate-spin text-white/70" />
            )}
          </div>

          <div className="flex flex-col gap-4 border-l border-line p-5">
            {mode === "export" ? (
              <>
                <div role="radiogroup" aria-label="File format" className="grid grid-cols-2 gap-1.5">
                  {FORMATS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      role="radio"
                      aria-checked={format === f.value}
                      onClick={() => setFormat(f.value)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-md border p-2 text-left [&_svg]:size-4",
                        format === f.value ? "border-cyan bg-cyan-wash" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className={cn("flex items-center gap-1 text-[13px] font-semibold", format === f.value && "text-cyan")}>
                        {f.icon}
                        {f.title}
                      </span>
                      <span className="text-[11px] leading-snug text-ink-muted">{f.body}</span>
                    </button>
                  ))}
                </div>

                {format === "project" ? (
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    A .sheetfit file with the page settings, every design and the original image files. Open it from
                    Projects on any computer to continue editing.
                  </p>
                ) : format === "pdf" ? (
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    Page is exactly 595.28 × 841.89 pt. Designs are placed as vectors at their exact millimetre
                    positions; PNG and JPEG sources are embedded without recompression, at full resolution.
                  </p>
                ) : (
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Resolution</p>
                    <Segmented
                      ariaLabel="Export DPI"
                      value={String(dpi)}
                      onValueChange={(v) => setDpi(Number(v) as ExportDpi)}
                      options={[
                        { value: "150", label: "150" },
                        { value: "300", label: "300" },
                        { value: "600", label: "600" },
                      ]}
                    />
                    <p className="tnum mt-1.5 text-[12px] text-ink-muted">
                      {pixels.width} × {pixels.height} px, DPI written into the file.
                    </p>
                  </div>
                )}

                {format === "jpeg" && (
                  <>
                    {doc.page.background === null && (
                      <div>
                        <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Background (JPEG has no transparency)</p>
                        <ColorChoices value={jpegBg} onChange={(v) => setJpegBg(v ?? "#ffffff")} allowTransparent={false} />
                      </div>
                    )}
                    <div>
                      <div className="mb-1.5 flex justify-between text-[12px] font-medium text-ink-muted">
                        <span>Quality</span>
                        <span className="tnum text-ink">{quality}</span>
                      </div>
                      <Slider aria-label="JPEG quality" min={60} max={100} step={1} value={[quality]} onValueChange={([q]) => setQuality(q)} />
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="export-name" className="mb-1.5 block text-[12px] font-medium text-ink-muted">
                    File name
                  </label>
                  <Input id="export-name" placeholder={safeFilename(projectName)} value={filename} onChange={(e) => setFilename(e.target.value)} />
                </div>
              </>
            ) : (
              <PrintInstructions orientation={doc.page.orientation} />
            )}

            <div className="flex flex-col gap-2">
              {isRaster && !rasterFits && (
                <Note tone="error" icon={<TriangleAlert />}>
                  {pixels.width} × {pixels.height} px is more than this browser can render. Choose a lower DPI or use PDF.
                </Note>
              )}
              {outside.length > 0 && (
                <Note tone="error" icon={<TriangleAlert />}>
                  {outside.length} {outside.length === 1 ? "design extends" : "designs extend"} past the printable area and
                  may be cut off by the printer.
                </Note>
              )}
              {lowRes.length > 0 && (
                <Note tone="warn" icon={<TriangleAlert />}>
                  Low resolution: {lowRes.map((d) => d.name).join(", ")}. These may print pixelated.
                </Note>
              )}
              {outside.length === 0 && lowRes.length === 0 && doc.designs.length > 0 && (
                <Note tone="ok" icon={<CircleCheck />}>
                  All designs are inside the printable area at good resolution.
                </Note>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          {mode === "export" ? (
            <Button variant="ghost" onClick={() => setDialog("print")}>
              <Printer />
              Print instead
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setDialog("export")}>
              <Download />
              Export a file instead
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            disabled={busy || doc.designs.length === 0 || (isRaster && !rasterFits)}
            onClick={() => void run()}
          >
            {busy ? <Loader2 className="animate-spin" /> : mode === "print" ? <Printer /> : <Download />}
            {mode === "print" ? "Print" : format === "project" ? "Export project file" : `Export ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function outsideLabel(n: number) {
  return n === 0 ? "all designs inside the printable area" : `${n} outside the printable area`;
}

function PrintInstructions({ orientation }: { orientation: "portrait" | "landscape" }) {
  const steps = [
    "Choose A4 as the paper size.",
    `Choose ${orientation} orientation.`,
    "Set scale to 100% or Actual size. Turn off Fit to page or Shrink to fit.",
    "Set margins to None or Minimum if the dialog offers it.",
    "Turn off headers and footers.",
  ];
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold">In the print dialog</p>
      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2 text-[13px] leading-snug">
            <span className="tnum flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <Note tone="warn" icon={<TriangleAlert />} className="mt-3">
        Fit to page scaling changes every size on the sheet. For exact millimetres, PDF export printed at 100% is the most
        reliable route.
      </Note>
    </div>
  );
}
