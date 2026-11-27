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
import { ChevronLeft, ChevronRight, Download, FileImage, FileText, FlipHorizontal2, FolderArchive, Loader2, Printer, Scissors, Sticker, TriangleAlert, CircleCheck } from "lucide-react";
import { allPages, useEditor } from "@/store/editor-store";
import type { ExportDpi } from "@/types/editor";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Note } from "@/components/settings/Section";
import { ColorChoices } from "@/components/settings/DimensionControls";
import { buildRenderPlan, cropPlan, printedBounds, type PlanOutput } from "@/lib/render/render-plan";
import {
  downloadBlob,
  estimatePixelSize,
  exportJpeg,
  exportPdf,
  exportPng,
  exportSvg,
  renderPreviewDataUrl,
  safeFilename,
} from "@/lib/export/export-raster";
import { MirrorControl } from "@/components/settings/MirrorControl";
import { resolveMirror } from "@/lib/render/mirror";
import { Switch } from "@/components/ui/switch";
import { browserCanvasAreaLimit, canvasSizeWithinLimits, CanvasTooLargeError } from "@/lib/export/rasterize";
import { printSheet } from "@/lib/export/print";
import { runPreflight } from "@/lib/export/preflight";
import { pageSize } from "@/lib/layout/sheet-layout";
import { sheetLabel } from "@/components/settings/SheetPanel";
import { exportProjectFile } from "@/lib/editor-actions";
import { CRICUT_PRINT_AREA, CUT_METHOD_INFO } from "@/lib/cut/cut-method";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Format = "pdf" | "png" | "jpeg" | "svg" | "cutter" | "project";

const FORMATS: { value: Format; title: string; body: string; icon: React.ReactNode }[] = [
  { value: "cutter", title: "Cutter PNG", body: "Transparent, white borders, for Cricut or Silhouette.", icon: <Sticker /> },
  { value: "pdf", title: "PDF", body: "Exact sheet size. Best for printing.", icon: <FileText /> },
  { value: "png", title: "PNG", body: "Lossless, keeps transparency.", icon: <FileImage /> },
  { value: "jpeg", title: "JPEG", body: "Smaller file, solid background.", icon: <FileImage /> },
  { value: "svg", title: "Cut file (SVG)", body: "Vector cut lines in mm for cutting software.", icon: <Scissors /> },
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
  const [output, setOutput] = useState<PlanOutput>("print");
  const [svgArtwork, setSvgArtwork] = useState(false);

  // Open on the format the page's cut method needs (a cutter PNG, a cut file, or print-ready PDF).
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const sticker = doc.page.process === "sticker";
  const machine = sticker && (doc.page.cutMethod === "cricut" || doc.page.cutMethod === "silhouette");
  const openKey = open ? `${dialog}:${doc.page.process}:${doc.page.cutMethod}` : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open && mode === "export") setFormat(machine ? "cutter" : sticker && doc.page.cutMethod === "file" ? "svg" : "pdf");
  }
  const [printDpi, setPrintDpi] = useState<300 | 600>(300);

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
  // A cut file always carries every cut line; a cutter PNG is artwork only (the
  // machine adds its own marks) on a transparent sheet; other formats follow the chosen contents.
  const cutterPng = mode === "export" && format === "cutter";
  const planOutput: PlanOutput = mode === "export" && format === "svg" ? "proof" : cutterPng ? "artwork" : output;
  const plans = useMemo(
    () =>
      docs.map((d) => {
        const plan = buildRenderPlan(d, assets, { output: planOutput });
        if (!cutterPng) return plan;
        // Only the stickers, on transparency: cutting software takes the image size as the print size.
        const flat = { ...plan, background: null, mirror: false };
        const bounds = printedBounds(d, 1);
        return bounds ? cropPlan(flat, bounds) : flat;
      }),
    [docs, assets, planOutput, cutterPng],
  );
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
        await printSheet(plans, assetMap, printDpi);
      } else if (format === "cutter") {
        for (let i = 0; i < plans.length; i++) {
          downloadBlob(await exportPng(plans[i], assetMap, 300), `${name}${suffix(i)}-cut-ready-300dpi.png`);
        }
        toast.success("Cutter PNG exported", { description: `${pixels.width} × ${pixels.height} px at 300 DPI, transparent around the white sticker borders.` });
      } else if (format === "project") {
        await exportProjectFile(name);
      } else if (format === "svg") {
        for (let i = 0; i < plans.length; i++) {
          downloadBlob(await exportSvg(plans[i], assetMap, { artwork: svgArtwork, title: projectName }), `${name}${suffix(i)}-cut.svg`);
        }
        toast.success("Cut file exported", { description: `${plans.length > 1 ? `${plans.length} SVG files` : "SVG"} in millimetres${svgArtwork ? ", with artwork" : ", cut lines only"}` });
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

  const isRaster = mode === "export" && (format === "png" || format === "jpeg" || format === "cutter");
  // Cricut's Print Then Cut limit for this paper (A4 or US Letter), checked against the image size in either direction.
  const limit = shownDoc.page.cutMethod === "cricut" && (shownDoc.page.sheet === "a4" || shownDoc.page.sheet === "letter") ? CRICUT_PRINT_AREA[shownDoc.page.sheet] : null;
  const tooBig =
    !!limit &&
    cutterPng &&
    !(
      (plan.page.width <= limit.width + 0.01 && plan.page.height <= limit.height + 0.01) ||
      (plan.page.width <= limit.height + 0.01 && plan.page.height <= limit.width + 0.01)
    );
  const shownFormats = FORMATS.filter((f) => f.value !== "cutter" || shownDoc.page.process === "sticker");

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
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface px-1 py-1 text-caption font-medium shadow-card">
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
            {format !== "project" && (
              <span
                data-testid="export-mirror-badge"
                className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-caption font-semibold shadow-card"
              >
                <FlipHorizontal2 className={cn("size-3.5", resolveMirror(shownDoc.page) ? "text-accent" : "text-ink-faint")} />
                {resolveMirror(shownDoc.page)
                  ? "Mirrored. Turn mirroring off in the printer driver."
                  : "Not mirrored."}
              </span>
            )}
            {preview ? (
              <img
                src={preview}
                alt="Preview of the exported sheet"
                className={cn(
                  "max-h-[56vh] w-auto rounded-[2px] shadow-[0_2px_6px_rgb(16_24_40/0.12),0_12px_32px_rgb(16_24_40/0.16)]",
                  shownDoc.page.background === null && (mode === "print" || format !== "png") ? "bg-paper" : "checker",
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
                <p className="mb-1.5 text-caption font-medium text-ink-muted">Pages</p>
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
            {format !== "project" && (
              <div className="rounded-lg bg-subtle p-3">
                <MirrorControl
                  page={shownDoc.page}
                  compact
                  onChange={(mirrorMode) => useEditor.getState().setPagesAt(scopeIndices, { mirrorMode })}
                />
                <p className="mt-1.5 text-caption leading-snug text-ink-muted">
                  {docs.length > 1 ? "Applies to every page in this export. " : ""}
                  Sheetfit mirrors once, in the file itself. If Sheetfit mirrors, keep the printer driver&apos;s mirror off; if not, set the
                  driver for the result you need. Sheetfit cannot read or change the driver.
                </p>
              </div>
            )}
            {format !== "project" && format !== "svg" && !cutterPng && (
              <div>
                <p className="mb-1.5 text-caption font-medium text-ink-muted">Contents</p>
                <Segmented<PlanOutput>
                  ariaLabel="Output contents"
                  value={output}
                  onValueChange={setOutput}
                  options={[
                    { value: "print", label: "Print" },
                    { value: "artwork", label: "Artwork only" },
                    { value: "proof", label: "With cut lines" },
                  ]}
                />
                <p className="mt-1.5 text-caption leading-snug text-ink-muted">
                  {output === "artwork"
                    ? "Designs only: no marks or cut lines, for cutters and RIPs that add their own."
                    : output === "proof"
                      ? "Every cut path drawn as a thin line (magenta kiss, cyan die), for proofs and hand trimming."
                      : "Designs plus the marks switched on in Sheet settings."}
                </p>
              </div>
            )}
            {mode === "export" ? (
              <>
                <div role="radiogroup" aria-label="File format" className="grid grid-cols-2 gap-1.5">
                  {shownFormats.map((f) => (
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
                      <span className={cn("flex items-center gap-1 text-body font-semibold", format === f.value && "text-accent")}>
                        {f.icon}
                        {f.title}
                      </span>
                      <span className="text-caption leading-snug text-ink-muted">{f.body}</span>
                    </button>
                  ))}
                </div>

                {format === "cutter" ? (
                  <CutterSteps
                    method={shownDoc.page.cutMethod === "silhouette" ? "silhouette" : "cricut"}
                    widthIn={plan.page.width / 25.4}
                    heightIn={plan.page.height / 25.4}
                    pixels={pixels}
                    tooBig={tooBig}
                    limit={limit?.label ?? null}
                  />
                ) : format === "svg" ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-caption leading-relaxed text-ink-muted">
                      One SVG per page at its exact size (1 unit = 1 mm). Groups: CUTLINE (one closed path per design, data-cut kiss or
                      die), SHEET_CUT, REGISTRATION{svgArtwork ? ", ARTWORK" : ""}. Mirrored exactly like the print. Import it into
                      your cutting software; Sheetfit does not control cutters directly.
                    </p>
                    <label className="flex items-center justify-between gap-3 text-body">
                      Include the artwork
                      <Switch checked={svgArtwork} onCheckedChange={setSvgArtwork} aria-label="Include the artwork in the SVG" />
                    </label>
                  </div>
                ) : format === "project" ? (
                  <p className="text-caption leading-relaxed text-ink-muted">
                    A .sheetfit file with the page settings, every design and the original image files. Open it from
                    Projects on any computer to continue editing.
                  </p>
                ) : format === "pdf" ? (
                  <p className="text-caption leading-relaxed text-ink-muted">
                    {docs.length > 1
                      ? `One PDF with ${docs.length} pages, each at its own exact sheet size.`
                      : `Page is exactly ${sheetText}.`}{" "}
                    Designs are placed as vectors at their exact millimetre positions; PNG and JPEG sources are embedded
                    without recompression, at full resolution.
                  </p>
                ) : (
                  <div>
                    {shownDoc.page.process === "dtf" && format === "png" && (
                      <p className="mb-2 text-caption text-ink-muted">
                        DTF printers expect a transparent PNG at 300 DPI.{" "}
                        {shownDoc.page.background !== null && <span className="text-warn">Set the sheet background to transparent first.</span>}
                      </p>
                    )}
                    <p className="mb-1.5 text-caption font-medium text-ink-muted">Resolution</p>
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
                    <p className="tnum mt-1.5 text-caption text-ink-muted">
                      {pixels.width} × {pixels.height} px, DPI written into the file.
                      {plans.length > 1 && ` One file per page (${plans.length}).`}
                    </p>
                  </div>
                )}

                {format === "jpeg" && (
                  <>
                    {shownDoc.page.background === null && (
                      <div>
                        <p className="mb-1.5 text-caption font-medium text-ink-muted">Background (JPEG has no transparency)</p>
                        <ColorChoices value={jpegBg} onChange={(v) => setJpegBg(v ?? "#ffffff")} allowTransparent={false} />
                      </div>
                    )}
                    <div>
                      <div className="mb-1.5 flex justify-between text-caption font-medium text-ink-muted">
                        <span>Quality</span>
                        <span className="tnum text-ink">{quality}</span>
                      </div>
                      <Slider aria-label="JPEG quality" min={60} max={100} step={1} value={[quality]} onValueChange={([q]) => setQuality(q)} />
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="export-name" className="mb-1.5 block text-caption font-medium text-ink-muted">
                    File name
                  </label>
                  <Input id="export-name" placeholder={safeFilename(projectName)} value={filename} onChange={(e) => setFilename(e.target.value)} />
                </div>
              </>
            ) : (
              <PrintInstructions
                dpi={printDpi}
                onDpi={setPrintDpi}
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
              <p className="text-caption font-semibold">Pre-print check</p>
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
              {issues.length > 6 && <p className="text-caption text-ink-muted">and {issues.length - 6} more.</p>}
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
                : format === "cutter"
                  ? `Export PNG for ${CUT_METHOD_INFO[shownDoc.page.cutMethod === "silhouette" ? "silhouette" : "cricut"].label}`
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

/** What to do with the cutter PNG in Design Space or Silhouette Studio. */
function CutterSteps({
  method,
  widthIn,
  heightIn,
  pixels,
  tooBig,
  limit,
}: {
  method: "cricut" | "silhouette";
  widthIn: number;
  heightIn: number;
  pixels: { width: number; height: number };
  tooBig: boolean;
  limit: string | null;
}) {
  const size = `${+widthIn.toFixed(2)} × ${+heightIn.toFixed(2)} in`;
  const steps =
    method === "cricut"
      ? [
          "In Design Space, upload the PNG and choose Print Then Cut image.",
          `Set its size to exactly ${size} (W × H) before you continue.`,
          "Design Space adds its registration marks and cuts around each sticker's white border.",
          "Print from Design Space at actual size; do not print this PNG from another program.",
        ]
      : [
          `In Silhouette Studio, open the PNG and set it to exactly ${size}.`,
          "Trace it (outer edge), or use Designer Edition with the SVG cut file.",
          "Turn on registration marks; Studio places them in three corners.",
          "Match Page Setup to your printer's paper size, then print and cut.",
        ];
  return (
    <div className="flex flex-col gap-2">
      <p className="tnum text-caption leading-relaxed text-ink-muted">
        The stickers only, on transparency: {size}, {pixels.width} × {pixels.height} px at 300 DPI. White sticker borders stay; no line is
        printed.
      </p>
      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2 text-caption leading-snug">
            <span className="tnum flex size-5 shrink-0 items-center justify-center rounded-full bg-inverse text-caption font-semibold text-on-inverse">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {limit && tooBig && (
        <Note tone="warn" icon={<TriangleAlert />}>
          At {size} the stickers are larger than Cricut&apos;s {limit} Print Then Cut limit for this paper. In Cut, choose &ldquo;Use it as the
          printable area&rdquo;, then fill or arrange again.
        </Note>
      )}
    </div>
  );
}

function PrintInstructions({
  orientation,
  paper,
  mixed,
  dpi,
  onDpi,
}: {
  orientation: "portrait" | "landscape";
  paper: string;
  mixed: boolean;
  dpi: 300 | 600;
  onDpi: (dpi: 300 | 600) => void;
}) {
  const steps = [
    mixed ? `Pages use ${paper}. Print each size on matching paper, or print one page at a time.` : `Choose ${paper} as the paper size.`,
    mixed ? "Let the browser pick the orientation per page." : `Choose ${orientation} orientation.`,
    "Set scale to 100% or Actual size. Turn off Fit to page or Shrink to fit.",
    "Set margins to None or Minimum if the dialog offers it.",
    "Turn off headers and footers.",
  ];
  return (
    <div>
      <p className="mb-1.5 text-caption font-medium text-ink-muted">Print quality</p>
      <Segmented<string>
        ariaLabel="Print resolution"
        value={String(dpi)}
        onValueChange={(v) => onDpi(v === "600" ? 600 : 300)}
        options={[
          { value: "300", label: "Standard, 300 DPI" },
          { value: "600", label: "High, 600 DPI" },
        ]}
      />
      <p className="mt-1.5 mb-4 text-caption leading-snug text-ink-muted">
        600 DPI keeps small text and thin cutting lines sharp; it takes longer to prepare. It cannot add detail an image does not have.
      </p>
      <p className="mb-2 text-body font-semibold">In the print dialog</p>
      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2 text-body leading-snug">
            <span className="tnum flex size-5 shrink-0 items-center justify-center rounded-full bg-inverse text-caption font-semibold text-on-inverse">
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
