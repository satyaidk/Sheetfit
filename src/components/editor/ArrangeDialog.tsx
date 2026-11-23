"use client";

/**
 * Auto Arrange dialog. Settings on the left, and a summary computed by the
 * same pure planner the action uses (`planArrange`), so the user sees how
 * many pages are needed and how full each one is before anything moves.
 * Apply is one undo step, including any pages it creates.
 */

import { useMemo } from "react";
import { LayoutGrid, TriangleAlert, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/store/editor-store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/settings/NumberField";
import { Field, Note } from "@/components/settings/Section";
import { planArrange, type ArrangeOptions } from "@/lib/layout/arrange";
import { uniformMargins } from "@/lib/layout/sheet-layout";

export function ArrangeDialog() {
  const open = useEditor((s) => s.dialog === "arrange");
  const setDialog = useEditor((s) => s.setDialog);
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const options = useEditor((s) => s.arrangeOptions);
  const setOptions = useEditor((s) => s.setArrangeOptions);
  const setPage = useEditor((s) => s.setPage);
  const unit = useEditor((s) => s.unit);

  const scope: ArrangeOptions["scope"] = options.scope === "selection" && selection.length > 0 ? "selection" : "all";
  const preview = useMemo(
    () => (open ? planArrange(doc.designs, doc.page, selection, { ...options, scope }) : null),
    [open, doc, selection, options, scope],
  );
  const r = preview?.report;
  const lockedCount = doc.designs.filter((d) => d.locked).length;
  const m = doc.page.margins;
  const uniform = m.top === m.right && m.right === m.bottom && m.bottom === m.left;

  const run = () => {
    const report = useEditor.getState().autoArrange(scope, options);
    setDialog(null);
    const pages = report.pagesAdded ? ` ${report.pagesAdded} new ${report.pagesAdded === 1 ? "page" : "pages"}.` : "";
    if (report.unplaced > 0) toast.warning(`${report.placed} arranged, ${report.unplaced} did not fit`, { description: report.suggestions[0] });
    else
      toast.success("Arranged without overlap", {
        description: `${report.placed} designs, sizes unchanged.${pages}${report.turned ? ` ${report.turned} turned 90°.` : ""} Undo restores every position.`,
        action: { label: "Undo", onClick: () => useEditor.getState().undo() },
      });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Auto Arrange</DialogTitle>
          <DialogDescription>
            Packs designs without overlap at their real size. Nothing is resized, cropped or stretched.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Arrange</p>
            <Segmented<ArrangeOptions["scope"]>
              ariaLabel="Designs to arrange"
              value={scope}
              onValueChange={(v) => setOptions({ scope: v })}
              options={[
                { value: "all", label: "All unlocked" },
                { value: "selection", label: `Selected (${selection.length})` },
              ]}
            />
            {lockedCount > 0 && (
              <p className="mt-1.5 text-[12px] text-ink-muted">{lockedCount} locked {lockedCount === 1 ? "design stays" : "designs stay"} put; others pack around them.</p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Layout</p>
            <Segmented<ArrangeOptions["strategy"]>
              ariaLabel="Packing strategy"
              value={options.strategy}
              onValueChange={(strategy) => setOptions({ strategy })}
              options={[
                { value: "compact", label: "Compact (least paper)" },
                { value: "rows", label: "Rows (reading order)" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-muted">
              Gap between cut lines
              <NumberField label="" valueMm={doc.page.spacing} unit={unit} dpi={doc.page.dpi} min={0} max={100} onCommit={(spacing) => setPage({ spacing })} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-muted">
              Sheet margins{uniform ? "" : " (mixed)"}
              <NumberField label="" valueMm={m.top} unit={unit} dpi={doc.page.dpi} min={0} max={100} onCommit={(v) => setPage({ margins: uniformMargins(v) })} />
            </label>
          </div>
          <div>
            <Field label="Turn designs 90° when it saves space" htmlFor="arr-rotate">
              <Switch id="arr-rotate" checked={options.rotate} onCheckedChange={(rotate) => setOptions({ rotate })} />
            </Field>
            <p className="text-[11.5px] text-ink-muted">Card pairs, groups and designs marked &ldquo;never turn&rdquo; are never turned.</p>
            <Field label="Add pages for the rest" htmlFor="arr-pages">
              <Switch id="arr-pages" checked={options.extraPages} onCheckedChange={(extraPages) => setOptions({ extraPages })} />
            </Field>
          </div>
          {r && (
            <div data-testid="arrange-summary">
              {r.unplaced.length === 0 ? (
                <Note tone="ok" icon={<CircleCheck />}>
                  {r.pagesAdded === 0
                    ? `All ${r.placed} fit on this page, ${Math.round(r.utilisation[0] * 100)} % of the printable area used.`
                    : `Needs ${r.pagesAdded} more ${r.pagesAdded === 1 ? "page" : "pages"} (same sheet). Use: ${r.utilisation.map((u) => `${Math.round(u * 100)} %`).join(", ")}.`}
                </Note>
              ) : (
                <Note tone="warn" icon={<TriangleAlert />}>
                  {r.placed} fit. {r.unplaced.length} would stay where they are
                  {r.tooLarge.length > 0 ? `, ${r.tooLarge.length} of them larger than the printable area` : ""}.
                  {!options.extraPages && r.tooLarge.length < r.unplaced.length ? " Turn on “Add pages for the rest” to place them." : ""}
                </Note>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" onClick={run} disabled={!r || r.placed === 0}>
            <LayoutGrid />
            Arrange
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
