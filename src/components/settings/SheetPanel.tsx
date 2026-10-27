"use client";

/**
 * Sheet panel: process, output mirroring, sheet size and orientation, margins,
 * background, guides and units. Everything that applies to the whole sheet
 * rather than one design lives here.
 */

import { FlipHorizontal2, RectangleHorizontal, RectangleVertical, Maximize2 } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { ExportDpi, PrintProcess, Unit } from "@/types/editor";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { NumberField } from "./NumberField";
import { Field, Note, Section } from "./Section";
import { ColorChoices } from "./DimensionControls";
import { pageSize, sheetLabel, uniformMargins } from "@/lib/layout/sheet-layout";
import { SHEETS } from "@/lib/catalogue/sheets";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { cn } from "@/lib/utils";

const QUICK_SHEETS = ["a4", "letter", "legal", "a3", "a3plus", "dtf-22x24"];

export { sheetLabel };

export function SheetPanel() {
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  const setProcess = useEditor((s) => s.setProcess);
  const setSheet = useEditor((s) => s.setSheet);
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
          options={[
            { value: "sublimation", label: "Sublimation" },
            { value: "dtf", label: "DTF" },
          ]}
        />
        <Field label="Mirror output" htmlFor="mirror">
          <Switch id="mirror" checked={page.mirrorOutput} onCheckedChange={(mirrorOutput) => setPage({ mirrorOutput })} />
        </Field>
        <Note icon={<FlipHorizontal2 />}>
          {page.mirrorOutput
            ? "Exports and prints are flipped for transfer. Do not mirror again in the printer driver."
            : page.process === "dtf"
              ? "DTF film prints as seen. Leave mirroring off."
              : "Output is not mirrored. Sublimation paper usually needs mirroring."}
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
        <p className="tnum mb-2 text-[13px]">
          <span className="font-semibold">{sheetLabel(page)}</span>{" "}
          <span className="text-ink-muted">
            {fmt(size.width)} × {fmt(size.height)} {u}
          </span>
        </p>
        <div className="mb-2 grid grid-cols-3 gap-1">
          {QUICK_SHEETS.map((id) => {
            const sheet = SHEETS.find((x) => x.id === id)!;
            const active = page.sheet === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSheet(id)}
                className={cn(
                  "h-8 rounded-md text-[12px] font-medium transition-colors",
                  active ? "bg-accent-soft text-accent ring-1 ring-accent" : "bg-subtle text-ink hover:bg-subtle-2",
                )}
              >
                {sheet.short}
              </button>
            );
          })}
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
              className="tnum h-7 rounded-md bg-subtle px-2 text-[11.5px] font-medium text-ink-muted hover:bg-subtle-2 hover:text-ink"
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
        <p className="mt-2 text-[12px] text-ink-muted">
          Desktop printers lose the outer 3 to 5 mm. DTF gang sheets usually keep ½ in clear at the edges.
        </p>
        <Field label="Keep designs inside margins" htmlFor="constrain">
          <Switch id="constrain" checked={page.constrainToPrintable} onCheckedChange={(constrainToPrintable) => setPage({ constrainToPrintable })} />
        </Field>
      </Section>

      <Section title="Background">
        <ColorChoices value={page.background} onChange={(background) => setPage({ background })} />
        {page.background === null && (
          <p className="mt-2 text-[12px] text-ink-muted">Transparent. PNG keeps transparency, which DTF needs; JPEG uses white.</p>
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
          <span className="text-[13px]">Grid spacing</span>
          <NumberField label="" className="w-28" valueMm={page.gridSize} unit={unit} dpi={page.dpi} min={1} max={50} onCommit={(gridSize) => setPage({ gridSize })} />
        </div>
        <Field label="Crop marks" htmlFor="crop-marks">
          <Switch id="crop-marks" checked={page.cropMarks} onCheckedChange={(cropMarks) => setPage({ cropMarks })} />
        </Field>
        <p className="text-[12px] text-ink-muted">Hold Alt while dragging to place freely.</p>
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
        <p className="mt-3 mb-1.5 text-[12px] font-medium text-ink-muted">Export resolution</p>
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
