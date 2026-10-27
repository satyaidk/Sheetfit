"use client";

/**
 * "Sheet size" dialog: the sheet dropdown, a custom size in any unit,
 * orientation, a live preview of the proportions, and a warning that names
 * how many designs would end up outside the new sheet before anything changes.
 */

import { useState } from "react";
import { RectangleHorizontal, RectangleVertical, TriangleAlert } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { Orientation, PageSettings } from "@/types/editor";
import { findSheet } from "@/lib/catalogue/sheets";
import { SheetSelect } from "./SheetSelect";
import { placementStatus, pageSize } from "@/lib/layout/sheet-layout";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { NumberField } from "./NumberField";
import { Note } from "./Section";

export function SheetDialog() {
  const open = useEditor((s) => s.dialog === "sheet");
  const setDialog = useEditor((s) => s.setDialog);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      {open && <SheetDialogBody />}
    </Dialog>
  );
}

function SheetDialogBody() {
  const page = useEditor((s) => s.doc.page);
  const designs = useEditor((s) => s.doc.designs);
  const unit = useEditor((s) => s.unit);
  const setSheet = useEditor((s) => s.setSheet);
  const setDialog = useEditor((s) => s.setDialog);
  const [sheet, setSheetId] = useState(page.sheet);
  const [orientation, setOrientation] = useState<Orientation>(page.orientation);
  const base = pageSize({ ...page, orientation: "portrait" });
  const [custom, setCustom] = useState(page.customSize ?? { width: base.width, height: base.height });

  const draft: PageSettings = { ...page, sheet, orientation, customSize: sheet === "custom" ? custom : null };
  const size = pageSize(draft);
  const outside = designs.filter((d) => placementStatus(d, draft).exceedsPage).length;
  const u = unit === "px" ? "mm" : unit;
  const fmt = (mm: number) => formatUnit(mm, u, page.dpi);

  return (
    <DialogContent className="max-w-[640px]">
      <DialogHeader>
        <DialogTitle>Sheet size</DialogTitle>
        <DialogDescription>Choose the paper or film you print on. Designs keep their size and position.</DialogDescription>
      </DialogHeader>
      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-ink-muted">Sheet</p>
            <SheetSelect value={sheet} onChange={setSheetId} unit={unit} customLabel="Custom size" />
            {sheet !== "custom" && <p className="mt-1.5 text-[12px] text-ink-muted">{findSheet(sheet)?.usedFor}</p>}
          </div>
          <div>
            {sheet === "custom" && (
              <div className="flex items-center gap-1.5">
                <span className="sr-only">Custom size</span>
                <NumberField label="W" valueMm={custom.width} unit={unit} dpi={page.dpi} min={20} max={1500} onCommit={(width) => setCustom({ ...custom, width })} />
                <span className="text-ink-faint">×</span>
                <NumberField label="H" valueMm={custom.height} unit={unit} dpi={page.dpi} min={20} max={6100} onCommit={(height) => setCustom({ ...custom, height })} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Segmented<Orientation>
            ariaLabel="Orientation"
            value={orientation}
            onValueChange={setOrientation}
            options={[
              { value: "portrait", label: <RectangleVertical />, title: "Portrait" },
              { value: "landscape", label: <RectangleHorizontal />, title: "Landscape" },
            ]}
          />
          <div className="flex h-48 items-center justify-center rounded-md bg-canvas p-3">
            <div
              className="bg-white shadow-[0_1px_3px_rgb(0_0_0/0.15)]"
              style={{
                aspectRatio: `${size.width} / ${size.height}`,
                width: size.width >= size.height ? "100%" : "auto",
                height: size.height > size.width ? "100%" : "auto",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />
          </div>
          <p className="tnum text-center text-[12px] text-ink-muted">
            {fmt(size.width)} × {fmt(size.height)} {u}
          </p>
          {outside > 0 && (
            <Note tone="warn" icon={<TriangleAlert />}>
              {outside} {outside === 1 ? "design falls" : "designs fall"} partly off this sheet. Nothing is resized.
            </Note>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => setDialog(null)}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            setSheet(sheet, sheet === "custom" ? custom : null, orientation);
            setDialog(null);
          }}
        >
          Use this sheet
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
