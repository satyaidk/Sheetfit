"use client";

/**
 * Export and print dialog.
 *
 * The preview is rendered from the same render plan the exporters use, so it
 * shows what the file will contain, not what the editor canvas shows. Checks
 * that could spoil a print (designs in the margins, low resolution, a canvas
 * too large for this browser) are listed before the user commits.
 *
 * Projects with several pages export all pages (one PDF with a page per
 * sheet, one PNG/JPEG file per page, or one print job) or just the current
 * page. Every page keeps its own sheet size.
 */

import { useEffect, useMemo, useState } from "react";
/* eslint-disable @next/next/no-img-element -- preview is a generated data URL */
import { ChevronLeft, ChevronRight, Download, FileImage, FileText, FlipHorizontal2, FolderArchive, Loader2, Printer, TriangleAlert, CircleCheck } from "lucide-react";
import { allPages, useEditor } from "@/store/editor-store";
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
import { runPreflight } from "@/lib/export/preflight";
import { pageSize } from "@/lib/layout/sheet-layout";
import { sheetLabel } from "@/components/settings/SheetPanel";
import { exportProjectFile } from "@/lib/editor-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Format = "pdf" | "png" | "jpeg" | "project";

const FORMATS: { value: Format; title: string; body: string; icon: React.ReactNode }[] = [
  { value: "pdf", title: "PDF", body: "Exact sheet size. Best for printing.", icon: <FileText /> },
  { value: "png", title: "PNG", body: "Lossless, keeps transparency.", icon: <FileImage /> },
  { value: "jpeg", title: "JPEG", body: "Smaller file, solid background.", icon: <FileImage /> },
  { value: "project", title: "Project", body: "Reopen and edit later.", icon: <FolderArchive /> },
];

export function ExportDialog() {
  const dialog = useEditor((s) => s.dialog);
  const setDialog = useEditor((s) => s.setDialog);
  const doc = useEditor((s) => s.doc);
  const pageEntries = useEditor((s) => s.pages);
  const activePage = useEditor((s) => s.activePage);
  const assets = useEditor((s) => s.assets);
  const projectName = useEditor((s) => s.project.name);
  const open = dialog === "export" || dialog === "print";
  const mode = dialog === "print" ? "print" : "export";

  const [format, setFormat] = useState<Format>("pdf");
  const [dpi, setDpi] = useState<ExportDpi>(doc.page.dpi);
  const [jpegBg, setJpegBg] = useState<string>("#ffffff");
  const [quality, setQuality] = useState(92);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "page">("all");
  const [shown, setShown] = useState(0);

  const pageCount = pageEntries.length;
  // Indices of the pages this export covers, in project order.
  const scopeIndices = useMemo(
    () => (scope === "all" && pageCount > 1 ? pageEntries.map((_, i) => i) : [activePage]),
    [scope, pageCount, pageEntries, activePage],
  );
  const docs = useMemo(() => {
    const all = allPages({ pages: pageEntries, activePage, doc });
    return scopeIndices.map((i) => all[i]);
  }, [pageEntries, activePage, doc, scopeIndices]);
  const plans = useMemo(() => docs.map((d) => buildRenderPlan(d, assets)), [docs, assets]);
  const assetMap = useMemo(() => new Map(Object.entries(assets)), [assets]);
  const shownIndex = Math.min(shown, plans.length - 1);
  const plan = plans[shownIndex];
  const shownDoc = docs[shownIndex];

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

  const pixelSizes = plans.map((p) => estimatePixelSize(p, dpi));
  const pixels = pixelSizes[shownIndex];
  const rasterFits = pixelSizes.every((px) => canvasSizeWithinLimits(px, browserCanvasAreaLimit()));
  const issues = useMemo(
    () =>
      docs.flatMap((d, i) =>
        runPreflight(d, assets).map((issue) => ({
          ...issue,
          page: scopeIndices[i],
          message: docs.length > 1 ? `Page ${scopeIndices[i] + 1}: ${issue.message}` : issue.message,
        })),
      ),
    [docs, assets, scopeIndices],
  );
  const designCount = docs.reduce((n, d) => n + d.designs.length, 0);
  const outsideCount = issues.filter((i) => i.kind === "outside-page" || i.kind === "outside-printable").length;
  const sheetTextFor = (page: typeof doc.page) => {
    const size = pageSize(page);
    return `${sheetLabel(page)} ${page.orientation}, ${+size.width.toFixed(1)} × ${+size.height.toFixed(1)} mm`;
  };
  const sheetText = sheetTextFor(shownDoc.page);
  const pagesText = docs.length > 1 ? `${docs.length} pages` : sheetText;
  const name = filename.trim() || safeFilename(projectName);


  const run = async () => {
    setBusy(true);
    // Yield so the button can show its busy state before heavy rendering.
    await new Promise((r) => setTimeout(r, 30));
    try {
      const suffix = (i: number) => (plans.length > 1 ? `-page${scopeIndices[i] + 1}` : "");
      if (mode === "print") {
        await printSheet(plans, assetMap, dpi);
      } else if (format === "project") {
        await exportProjectFile(name);
      } else if (format === "pdf") {
        downloadBlob(await exportPdf(plans, assetMap, projectName), `${name}.pdf`);
        toast.success("PDF exported", { description: `${pagesText}, ${outsideLabel(outsideCount)}` });
      } else {
        for (let i = 0; i < plans.length; i++) {
          const blob =
            format === "png"
              ? await exportPng(plans[i], assetMap, dpi)
              : await exportJpeg(plans[i], assetMap, dpi, jpegBg, quality / 100);
          downloadBlob(blob, `${name}${suffix(i)}-${dpi}dpi.${format === "png" ? "png" : "jpg"}`);
        }
        const what = plans.length > 1 ? `${plans.length} files` : `${pixels.width} × ${pixels.height} px`;
        toast.success(`${format.toUpperCase()} exported`, { description: `${what} at ${dpi} DPI` });
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
          <DialogTitle>{mode === "print" ? "Print" : "Download"}</DialogTitle>
          <DialogDescription>
            {pagesText}.{" "}
            {mode === "print" ? "Prints at actual size." : "The preview shows exactly what the file contains."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_340px]">
          <div className="canvas-surface relative flex items-center justify-center p-6 pb-14">
            {plans.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface px-1 py-1 text-[12px] font-medium shadow">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={shownIndex === 0}
                  onClick={() => setShown(shownIndex - 1)}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-subtle disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="tnum px-1">
                  Page {scopeIndices[shownIndex] + 1} · {sheetLabel(shownDoc.page)}
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={shownIndex === plans.length - 1}
                  onClick={() => setShown(shownIndex + 1)}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-subtle disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
            {shownDoc.page.mirrorOutput && (
              <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold shadow">
                <FlipHorizontal2 className="size-3.5 text-accent" />
                Mirrored for transfer. Do not mirror again in the printer driver.
              </span>
            )}
            {preview ? (
              <img
                src={preview}
                alt="Preview of the exported sheet"
                className={cn(
                  "max-h-[56vh] w-auto rounded-[2px] shadow-[0_2px_6px_rgb(16_24_40/0.12),0_12px_32px_rgb(16_24_40/0.16)]",
                  shownDoc.page.background === null && (mode === "print" || format !== "png") ? "bg-white" : "checker",
                )}
                style={format === "jpeg" && mode === "export" && shownDoc.page.background === null ? { background: jpegBg } : undefined}
              />
            ) : (
              <Loader2 className="size-6 animate-spin text-ink-faint" />
            )}
          </div>

          <div className="flex flex-col gap-4 border-l border-line p-5">
            {pageCount > 1 && format !== "project" && (
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Pages</p>
                <Segmented
                  ariaLabel="Pages to export"
                  value={scope}
                  onValueChange={(v) => {
                    setScope(v);
                    setShown(0);
                  }}
                  options={[
                    { value: "all", label: `All ${pageCount} pages` },
                    { value: "page", label: `Page ${activePage + 1} only` },
                  ]}
                />
              </div>
            )}
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
                        "flex flex-col items-start gap-1 rounded-lg p-2.5 text-left ring-1 transition-colors [&_svg]:size-4",
                        format === f.value ? "bg-accent-soft ring-2 ring-accent" : "ring-line hover:bg-subtle",
                      )}
                    >
                      <span className={cn("flex items-center gap-1 text-[13px] font-semibold", format === f.value && "text-accent")}>
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
                    {docs.length > 1
                      ? `One PDF with ${docs.length} pages, each at its own exact sheet size.`
                      : `Page is exactly ${sheetText}.`}{" "}
                    Designs are placed as vectors at their exact millimetre positions; PNG and JPEG sources are embedded
                    without recompression, at full resolution.
                  </p>
                ) : (
                  <div>
                    {shownDoc.page.process === "dtf" && format === "png" && (
                      <p className="mb-2 text-[12px] text-ink-muted">
                        DTF printers expect a transparent PNG at 300 DPI.{" "}
                        {shownDoc.page.background !== null && <span className="text-warn">Set the sheet background to transparent first.</span>}
                      </p>
                    )}
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
                      {plans.length > 1 && ` One file per page (${plans.length}).`}
                    </p>
                  </div>
                )}

                {format === "jpeg" && (
                  <>
                    {shownDoc.page.background === null && (
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
              <PrintInstructions
                orientation={shownDoc.page.orientation}
                paper={[...new Set(docs.map((d) => sheetLabel(d.page)))].join(" and ")}
                mixed={new Set(docs.map((d) => sheetLabel(d.page) + d.page.orientation)).size > 1}
              />
            )}

            <div className="flex flex-col gap-2">
              {isRaster && !rasterFits && (
                <Note tone="error" icon={<TriangleAlert />}>
                  {pixels.width} × {pixels.height} px is more than this browser can render. Choose a lower DPI or use PDF.
                </Note>
              )}
              <p className="text-[12px] font-semibold">Pre-print check</p>
              {issues.length === 0 && designCount > 0 && (
                <Note tone="ok" icon={<CircleCheck />}>
                  No overlaps, nothing outside the margins, every image at good resolution.
                </Note>
              )}
              {issues.slice(0, 6).map((issue, i) => (
                <button
                  key={i}
                  type="button"
                  className="text-left"
                  onClick={() => {
                    useEditor.getState().switchPage(issue.page);
                    useEditor.getState().select(issue.designIds);
                    setDialog(null);
                  }}
                  title="Show on the sheet"
                >
                  <Note tone={issue.severity === "error" ? "error" : "warn"} icon={<TriangleAlert />} className="hover:brightness-[0.97]">
                    {issue.message}
                  </Note>
                </button>
              ))}
              {issues.length > 6 && <p className="text-[12px] text-ink-muted">and {issues.length - 6} more.</p>}
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
            disabled={busy || designCount === 0 || (isRaster && !rasterFits)}
            onClick={() => void run()}
          >
            {busy ? <Loader2 className="animate-spin" /> : mode === "print" ? <Printer /> : <Download />}
            {mode === "print"
              ? docs.length > 1
                ? `Print ${docs.length} pages`
                : "Print"
              : format === "project"
                ? "Export project file"
                : `Export ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function outsideLabel(n: number) {
  return n === 0 ? "all designs inside the printable area" : `${n} outside the printable area`;
}

function PrintInstructions({ orientation, paper, mixed }: { orientation: "portrait" | "landscape"; paper: string; mixed: boolean }) {
  const steps = [
    mixed ? `Pages use ${paper}. Print each size on matching paper, or print one page at a time.` : `Choose ${paper} as the paper size.`,
    mixed ? "Let the browser pick the orientation per page." : `Choose ${orientation} orientation.`,
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
