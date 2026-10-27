"use client";

/**
 * "What are you printing?" start dialog.
 *
 * Research (NN/g) favours a path into the work over a product tour: one
 * screen that sets the process, the sheet and optionally a first product
 * template, then gets out of the way. Shown on first visit and from
 * File → New sheet.
 */

import { useState } from "react";
import { Check, Droplets, Layers3, Sparkles } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { PrintProcess } from "@/types/editor";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { findProduct } from "@/lib/catalogue/products";
import { ProductArt } from "@/components/products/ProductArt";
import { openProductDesign } from "@/lib/editor-actions";
import { SheetSelect } from "@/components/settings/SheetSelect";
import { loadSampleSheet } from "@/lib/sample";
import { cn } from "@/lib/utils";

export const ONBOARDED_KEY = "sheetfit:onboarded";

const PROCESSES: { value: PrintProcess; title: string; body: string; icon: React.ReactNode }[] = [
  { value: "sublimation", title: "Sublimation", body: "Mugs, tumblers, coasters, polyester shirts. Prints mirrored on transfer paper.", icon: <Droplets /> },
  { value: "dtf", title: "DTF transfers", body: "Shirts, hoodies, caps, totes. Film printed as seen, often on gang sheets.", icon: <Layers3 /> },
];

const SHEET_CHOICES: Record<PrintProcess, string[]> = {
  sublimation: ["a4", "letter", "legal", "a3", "a3plus", "roll-13x19"],
  dtf: ["a4", "a3", "a3plus", "dtf-22x12", "dtf-22x24", "dtf-22x36", "dtf-22x60", "dtf-22x120"],
};

const STARTERS: Record<PrintProcess, string[]> = {
  sublimation: ["mug-11oz", "tumbler-20oz", "coaster-square", "mousepad-rect", "tee-left-chest", "keychain-round"],
  dtf: ["tee-left-chest", "tee-full-front", "tee-full-back", "hoodie-front", "cap-front", "tote"],
};

export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    /* storage unavailable: the dialog may show again, which is harmless */
  }
}

export function StartDialog() {
  const open = useEditor((s) => s.dialog === "start");
  const setDialog = useEditor((s) => s.setDialog);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          markOnboarded();
          setDialog(null);
        }
      }}
    >
      {open && <StartBody />}
    </Dialog>
  );
}

function StartBody() {
  const currentProcess = useEditor((s) => s.doc.page.process);
  const hasWork = useEditor((s) => s.doc.designs.length > 0);
  const [process, setProcess] = useState<PrintProcess>(currentProcess);
  const [sheet, setSheet] = useState(currentProcess === "dtf" ? "dtf-22x24" : "a4");
  const [product, setProduct] = useState<string | null>(null);

  const start = () => {
    const s = useEditor.getState();
    markOnboarded();
    s.setDialog(null);
    if (product) {
      openProductDesign(product, { process, sheet });
      return;
    }
    s.newProject();
    s.setProcess(process);
    s.setSheet(sheet);
    useEditor.setState((x) => ({ past: [], future: [], project: { ...x.project, dirty: false } }));
  };

  return (
    <DialogContent className="max-w-[760px]">
      <DialogHeader>
        <DialogTitle>What are you printing?</DialogTitle>
        <DialogDescription>Sets the sheet, mirroring and product templates. You can change all of it later.</DialogDescription>
      </DialogHeader>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Print process">
          {PROCESSES.map((p) => {
            const active = process === p.value;
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setProcess(p.value);
                  setSheet(p.value === "dtf" ? "dtf-22x24" : "a4");
                  setProduct(null);
                }}
                className={cn(
                  "flex gap-3 rounded-lg p-3.5 text-left ring-1 transition-colors",
                  active ? "bg-accent-soft ring-2 ring-accent" : "ring-line hover:bg-subtle",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", active ? "bg-accent text-white" : "bg-subtle text-ink-muted")}>
                  {p.icon}
                </span>
                <span>
                  <span className="block text-[14px] font-semibold">{p.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted">{p.body}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold">Sheet</p>
          <div className="max-w-[360px]">
            <SheetSelect value={sheet} onChange={setSheet} allowCustom={false} include={SHEET_CHOICES[process]} ariaLabel="Sheet" />
          </div>
          <p className="mt-1.5 text-[12px] text-ink-muted">With a product chosen, a bigger sheet is picked automatically if the product needs it.</p>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold">
            Start with a product <span className="font-normal text-ink-faint">optional</span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STARTERS[process].map((id) => {
              const p = findProduct(id)!;
              const active = product === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProduct(active ? null : id)}
                  aria-pressed={active}
                  className={cn("relative rounded-lg p-1.5 text-left transition-colors", active ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-subtle")}
                >
                  <span className="flex aspect-square items-center justify-center rounded-md bg-subtle">
                    <ProductArt product={p} className="size-[80%]" />
                  </span>
                  <span className="mt-1 block truncate text-[11.5px] font-semibold">{p.name}</span>
                  <span className="block truncate text-[11px] text-ink-muted">{p.detail}</span>
                  {active && (
                    <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-accent text-white">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {hasWork && <p className="text-[12px] text-warn">Starting replaces the current sheet. Save it first if you need it.</p>}
      </div>
      <DialogFooter className="justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            markOnboarded();
            useEditor.getState().setDialog(null);
            void loadSampleSheet();
          }}
        >
          <Sparkles />
          Explore the sample sheet
        </Button>
        <Button variant="primary" size="lg" onClick={start}>
          Start designing
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
