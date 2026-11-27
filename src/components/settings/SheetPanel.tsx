"use client";

/**
 * Sheet panel: process, output mirroring, sheet size and orientation, margins,
 * background, guides and units. Everything that applies to the whole sheet
 * rather than one design lives here.
 */

import { RectangleHorizontal, RectangleVertical, Maximize2, Ruler } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { ExportDpi, PrintProcess, Unit } from "@/types/editor";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { NumberField } from "./NumberField";
import { Field, Note, Section } from "./Section";
import { ColorChoices } from "./DimensionControls";
import { pageSize, sheetLabel, uniformMargins } from "@/lib/layout/sheet-layout";
import { SheetSelect } from "./SheetSelect";
import { changeSheet } from "@/lib/editor-actions";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { MirrorControl } from "./MirrorControl";
import { PROCESS_LABELS, PROCESS_ORDER } from "@/lib/catalogue/processes";

export { sheetLabel };

export function SheetPanel() {
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  const setProcess = useEditor((s) => s.setProcess);
  const setDialog = useEditor((s) => s.setDialog);
  const unit = useEditor((s) => s.unit);
  const setUnit = useEditor((s) => s.setUnit);
  const size = pageSize(page);
  const m = page.margins;
  const u = unit === "px" ? "mm" : unit;
  const fmt = (mm: number) => formatUnit(mm, u, page.dpi);

  return (
    <div>
      <Section title="Print process">
        <Segmented<PrintProcess>
          ariaLabel="Print process"
          value={page.process}
          onValueChange={setProcess}
          options={PROCESS_ORDER.map((value) => ({ value, label: PROCESS_LABELS[value] }))}
        />
        <div className="mt-3">
          <MirrorControl page={page} onChange={(mirrorMode) => setPage({ mirrorMode })} />
        </div>
        <p className="mt-2 text-caption text-ink-faint">Saved with this page. New pages and projects start on Auto.</p>
      </Section>

      <Section title="Spacing and cutting">
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-body">Gap between cut lines</span>
          <NumberField label="" className="w-28" valueMm={page.spacing} unit={unit} dpi={page.dpi} min={0} max={100} onCommit={(spacing) => setPage({ spacing })} />
        </div>
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-body">Gap between card front and back</span>
          <NumberField label="" className="w-28" valueMm={page.pairGap} unit={unit} dpi={page.dpi} min={0} max={100} onCommit={(pairGap) => setPage({ pairGap })} />
        </div>
        <p className="mb-2 text-caption text-ink-muted">
          Measured between cut paths, not image boxes. Auto Arrange and card pairs keep at least this much, more where bleeds would
          otherwise touch. Sizes never change.
        </p>
        <Field label="Print cut lines (thin proof line)" htmlFor="g-cut">
          <Switch id="g-cut" checked={page.guides.cutlines} onCheckedChange={(cutlines) => setPage({ guides: { ...page.guides, cutlines } })} />
        </Field>
        <Field label="Centre marks (front/back alignment)" htmlFor="g-centre">
          <Switch id="g-centre" checked={page.guides.centreMarks} onCheckedChange={(centreMarks) => setPage({ guides: { ...page.guides, centreMarks } })} />
        </Field>
        <Field label="Corner registration squares" htmlFor="g-reg">
          <Switch id="g-reg" checked={page.guides.registration} onCheckedChange={(registration) => setPage({ guides: { ...page.guides, registration } })} />
        </Field>
        {page.guides.registration && (
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-body">Square size</span>
            <NumberField label="" className="w-28" valueMm={page.guides.registrationSize} unit={unit} dpi={page.dpi} min={2} max={20} onCommit={(registrationSize) => setPage({ guides: { ...page.guides, registrationSize } })} />
          </div>
        )}
        {page.process === "sticker" && (
          <Field label="Cut around the whole sheet (kiss-cut sheet)" htmlFor="g-sheet">
            <Switch id="g-sheet" checked={page.sheetCut} onCheckedChange={(sheetCut) => setPage({ sheetCut })} />
          </Field>
        )}
        <Note icon={<Ruler />} className="mt-2">
          Generic marks only: cutting machines that read their own registration marks need them added in their own software. Your
          printer or cutter supplier&apos;s artwork specs take precedence over these settings.
        </Note>
      </Section>

      <Section
        title="Sheet size"
        aside={
          <Button size="sm" variant="ghost" onClick={() => setDialog("sheet")}>
            <Maximize2 />
            All sizes
          </Button>
        }
      >
        <div className="mb-2">
          <SheetSelect
            value={page.sheet}
            onChange={changeSheet}
            unit={unit}
            shownSize={size}
            customLabel={`Custom ${fmt(size.width)} × ${fmt(size.height)} ${u}`}
          />
        </div>
        <Segmented
          ariaLabel="Orientation"
          value={page.orientation}
          onValueChange={(orientation) => setPage({ orientation })}
          options={[
            { value: "portrait", label: <><RectangleVertical /> Portrait</> },
            { value: "landscape", label: <><RectangleHorizontal /> Landscape</> },
          ]}
        />
      </Section>

      <Section title="Margins">
        <div className="mb-2 flex flex-wrap gap-1">
          {[0, 3, 5, 10, 12.7].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPage({ margins: uniformMargins(v) })}
              className="tnum h-7 rounded-md bg-subtle px-2 text-caption font-medium text-ink-muted hover:bg-subtle-2 hover:text-ink"
            >
              {v === 0 ? "None" : v === 12.7 ? "½ in" : `${v} mm`}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="T" valueMm={m.top} unit={unit} dpi={page.dpi} min={0} max={100} onCommit={(top) => setPage({ margins: { ...m, top } })} />
          <NumberField label="B" valueMm={m.bottom} unit={unit} dpi={page.dpi} min={0} max={100} onCommit={(bottom) => setPage({ margins: { ...m, bottom } })} />
          <NumberField label="L" valueMm={m.left} unit={unit} dpi={page.dpi} min={0} max={100} onCommit={(left) => setPage({ margins: { ...m, left } })} />
          <NumberField label="R" valueMm={m.right} unit={unit} dpi={page.dpi} min={0} max={100} onCommit={(right) => setPage({ margins: { ...m, right } })} />
        </div>
        <p className="mt-2 text-caption text-ink-muted">
          Desktop printers lose the outer 3 to 5 mm. DTF gang sheets usually keep ½ in clear at the edges.
        </p>
        <Field label="Keep designs inside margins" htmlFor="constrain">
          <Switch id="constrain" checked={page.constrainToPrintable} onCheckedChange={(constrainToPrintable) => setPage({ constrainToPrintable })} />
        </Field>
      </Section>

      <Section title="Background">
        <ColorChoices value={page.background} onChange={(background) => setPage({ background })} />
        {page.background === null && (
          <p className="mt-2 text-caption text-ink-muted">Transparent. PNG keeps transparency, which DTF needs; JPEG uses white.</p>
        )}
      </Section>

      <Section title="Guides">
        <Field label="Snap to sheet and designs" htmlFor="snap-guides">
          <Switch id="snap-guides" checked={page.snapToGuides} onCheckedChange={(snapToGuides) => setPage({ snapToGuides })} />
        </Field>
        <Field label="Show grid" htmlFor="show-grid">
          <Switch id="show-grid" checked={page.showGrid} onCheckedChange={(showGrid) => setPage({ showGrid })} />
        </Field>
        <Field label="Snap to grid" htmlFor="snap-grid">
          <Switch id="snap-grid" checked={page.snapToGrid} onCheckedChange={(snapToGrid) => setPage({ snapToGrid })} />
        </Field>
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-body">Grid spacing</span>
          <NumberField label="" className="w-28" valueMm={page.gridSize} unit={unit} dpi={page.dpi} min={1} max={50} onCommit={(gridSize) => setPage({ gridSize })} />
        </div>
        <Field label="Crop marks" htmlFor="crop-marks">
          <Switch id="crop-marks" checked={page.cropMarks} onCheckedChange={(cropMarks) => setPage({ cropMarks })} />
        </Field>
        <p className="text-caption text-ink-muted">Hold Alt while dragging to place freely.</p>
      </Section>

      <Section title="Units and resolution" className="border-b-0">
        <Segmented<Unit>
          ariaLabel="Measurement unit"
          value={unit}
          onValueChange={setUnit}
          options={[
            { value: "mm", label: "mm" },
            { value: "cm", label: "cm" },
            { value: "in", label: "in" },
            { value: "px", label: "px" },
          ]}
        />
        <p className="mt-3 mb-1.5 text-caption font-medium text-ink-muted">Export resolution</p>
        <Segmented
          ariaLabel="Export DPI"
          value={String(page.dpi)}
          onValueChange={(v) => setPage({ dpi: Number(v) as ExportDpi })}
          options={[
            { value: "150", label: "150 DPI" },
            { value: "300", label: "300 DPI" },
            { value: "600", label: "600 DPI" },
          ]}
        />
      </Section>
    </div>
  );
}
