"use client";

/**
 * Asked before the current design is replaced (a new product, the sample, a
 * blank sheet, File → New): save it, discard it, or, for a product, add the
 * product to the current sheet instead. Designs for different products are
 * never merged onto one sheet unless the user chooses "Add to this sheet".
 */

import { useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { allPages, useEditor, type LeaveIntent } from "@/store/editor-store";
import { findProduct } from "@/lib/catalogue/products";
import { addProduct, proceedWith, saveCurrentProject } from "@/lib/editor-actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductArt } from "@/components/products/ProductArt";

function title(intent: LeaveIntent): string {
  if (intent.kind === "product") {
    const p = findProduct(intent.productId);
    return p ? `Start a new design for ${p.name.toLowerCase()}, ${p.detail.toLowerCase()}?` : "Start a new design?";
  }
  if (intent.kind === "sample") return "Open the sample project?";
  if (intent.kind === "blank") return "Start a blank sheet?";
  return "Start something new?";
}

export function LeaveDialog() {
  const intent = useEditor((s) => s.leaveIntent);
  const setIntent = useEditor((s) => s.setLeaveIntent);
  return (
    <Dialog open={intent !== null} onOpenChange={(o) => !o && setIntent(null)}>
      {intent && <LeaveBody intent={intent} />}
    </Dialog>
  );
}

function LeaveBody({ intent }: { intent: LeaveIntent }) {
  const project = useEditor((s) => s.project);
  const count = useEditor((s) => allPages(s).reduce((n, d) => n + d.designs.length, 0));
  const pageCount = useEditor((s) => s.pages.length);
  const setIntent = useEditor((s) => s.setLeaveIntent);
  const [saving, setSaving] = useState(false);
  const product = intent.kind === "product" ? findProduct(intent.productId) : undefined;
  const name = project.name.trim() || "Untitled sheet";
  const what = `${count} ${count === 1 ? "item" : "items"}${pageCount > 1 ? ` on ${pageCount} pages` : ""}`;

  const saveAndGo = async () => {
    setSaving(true);
    const ok = await saveCurrentProject();
    setSaving(false);
    if (ok) proceedWith(intent);
  };

  return (
    <DialogContent className="max-w-[620px]">
      <DialogHeader>
        <DialogTitle>{title(intent)}</DialogTitle>
        <DialogDescription>
          {project.dirty
            ? `“${name}” (${what}) has changes that are not saved. Save it to come back to it from Projects.`
            : `“${name}” (${what}) is saved in Projects; you can reopen it any time.`}
        </DialogDescription>
      </DialogHeader>
      {product && (
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-subtle">
            <ProductArt product={product} className="size-16" />
          </span>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            A new design opens on its own sheet with an empty {product.name.toLowerCase()} box at{" "}
            <span className="tnum font-medium text-ink">
              {+product.width.toFixed(1)} × {+product.height.toFixed(1)} mm
            </span>
            . To print it on the same sheet as your current design instead, choose Add to this sheet.
          </p>
        </div>
      )}
      <DialogFooter className="flex-wrap">
        <Button variant="ghost" onClick={() => setIntent(null)}>
          Cancel
        </Button>
        {product && (
          <Button
            onClick={() => {
              setIntent(null);
              addProduct(product.id);
            }}
          >
            <Plus />
            Add to this sheet
          </Button>
        )}
        {project.dirty ? (
          <>
            <Button variant="danger" onClick={() => proceedWith(intent)}>
              Discard and open
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => void saveAndGo()}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Save and open
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={() => proceedWith(intent)}>
            Open new design
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
