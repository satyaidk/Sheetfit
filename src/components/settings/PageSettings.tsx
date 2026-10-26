"use client";

/** Page, background and guide settings for the A4 sheet. */

import { RectangleHorizontal, RectangleVertical } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { ExportDpi, Unit } from "@/types/editor";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "./NumberField";
import { Field, Note, Section } from "./Section";
import { ColorChoices } from "./DimensionControls";
import { uniformMargins } from "@/lib/layout/a4-layout";

export function PageSettings() {
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  const unit = useEditor((s) => s.unit);
  const setUnit = useEditor((s) => s.setUnit);
  const m = page.margins;

  return (
    <div>
      <Section title="Paper">
        <p className="tnum mb-2 text-[13px]">
          A4, {page.orientation === "portrait" ? "210 × 297 mm" : "297 × 210 mm"}
        </p>
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
          {[0, 3, 5, 10].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPage({ margins: uniformMargins(v) })}
              className="tnum h-6 rounded-[4px] border border-line bg-surface px-2 text-[11px] font-medium text-ink-muted hover:border-line-strong hover:text-ink"
            >
              {v === 0 ? "None" : `${v} mm`}
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
          Most desktop printers cannot print the outer 3 to 5 mm. Sublimation printers with borderless mode can use 0.
        </p>
        <Field label="Keep designs inside margins" htmlFor="constrain">
          <Switch id="constrain" checked={page.constrainToPrintable} onCheckedChange={(constrainToPrintable) => setPage({ constrainToPrintable })} />
        </Field>
      </Section>

      <Section title="Units and resolution">
        <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Measurement unit</p>
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
        <p className="mt-2 text-[12px] text-ink-muted">
          Pixel values use this resolution. 300 DPI suits sublimation and most print shops.
        </p>
      </Section>
    </div>
  );
}

export function BackgroundSettings() {
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  return (
    <Section title="Sheet background">
      <ColorChoices value={page.background} onChange={(background) => setPage({ background })} />
      {page.background === null ? (
        <Note className="mt-3">
          Transparent. PNG exports keep the transparency. PDF and print show the paper colour; JPEG uses white.
        </Note>
      ) : (
        <p className="mt-3 text-[12px] text-ink-muted">
          Printed across the whole sheet, including margins. For sublimation transfers, white or transparent is usual.
        </p>
      )}
    </Section>
  );
}

export function GuideSettings() {
  const page = useEditor((s) => s.doc.page);
  const setPage = useEditor((s) => s.setPage);
  const unit = useEditor((s) => s.unit);
  return (
    <div>
      <Section title="Snapping">
        <Field label="Snap to page, margins and designs" htmlFor="snap-guides">
          <Switch id="snap-guides" checked={page.snapToGuides} onCheckedChange={(snapToGuides) => setPage({ snapToGuides })} />
        </Field>
        <p className="text-[12px] text-ink-muted">Hold Alt while dragging to place freely.</p>
      </Section>
      <Section title="Grid">
        <Field label="Show grid" htmlFor="show-grid">
          <Switch id="show-grid" checked={page.showGrid} onCheckedChange={(showGrid) => setPage({ showGrid })} />
        </Field>
        <Field label="Snap to grid" htmlFor="snap-grid">
          <Switch id="snap-grid" checked={page.snapToGrid} onCheckedChange={(snapToGrid) => setPage({ snapToGrid })} />
        </Field>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-[13px]">Grid spacing</span>
          <NumberField label="" className="w-28" valueMm={page.gridSize} unit={unit} dpi={page.dpi} min={1} max={50} onCommit={(gridSize) => setPage({ gridSize })} />
        </div>
      </Section>
      <Section title="Print marks">
        <Field label="Crop marks at every design" htmlFor="crop-marks">
          <Switch id="crop-marks" checked={page.cropMarks} onCheckedChange={(cropMarks) => setPage({ cropMarks })} />
        </Field>
        <p className="text-[12px] text-ink-muted">
          Thin corner marks, 1.5 mm outside each design, for cutting by hand or on a trimmer. Shown on the canvas and
          included in every export.
        </p>
      </Section>
    </div>
  );
}
