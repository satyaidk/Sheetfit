"use client";

/**
 * Lanyard ribbon roll layout: repeat strap segments along white polyester
 * sublimation ribbon, for ID-card lanyard straps or keychain wristlet straps.
 * Every size is typed by the user (no supplier width was verifiable), can be
 * saved as a named custom profile in this browser, and is labelled as
 * user-entered wherever it is shown.
 */

import { useState } from "react";
import { Ribbon, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/store/editor-store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Field, Note } from "./Section";
import {
  STRIP_USES,
  loadStripProfiles,
  planStrip,
  saveStripProfiles,
  validateStrip,
  type StripProfile,
  type StripUse,
} from "@/lib/layout/strip-layout";
import { createStripLayout } from "@/lib/editor-actions";

type Draft = Partial<Record<"rollWidth" | "printableWidth" | "segmentLength" | "repeatGap" | "endZone" | "leadIn", string>>;

const FIELDS: { key: keyof Draft; label: string; hint: string }[] = [
  { key: "rollWidth", label: "Ribbon width (mm)", hint: "From your supplier" },
  { key: "printableWidth", label: "Printable width (mm)", hint: "Across the ribbon" },
  { key: "segmentLength", label: "Strap cut length (mm)", hint: "Including fold or overlap" },
  { key: "repeatGap", label: "Gap between straps (mm)", hint: "0 = one shared cut" },
  { key: "endZone", label: "Keep clear at each end (mm)", hint: "Hooks, crimps, folds" },
  { key: "leadIn", label: "Lead-in at each end (mm)", hint: "Blank roll before/after" },
];

const num = (v: string | undefined, fallback?: number) => {
  const n = v === undefined || v.trim() === "" ? NaN : Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

function readStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function StripDialog() {
  const open = useEditor((s) => s.dialog === "strip");
  const setDialog = useEditor((s) => s.setDialog);
  const [use, setUse] = useState<StripUse>("id-lanyard");
  const [draft, setDraft] = useState<Draft>({ repeatGap: "0", endZone: "0", leadIn: "0" });
  const [count, setCount] = useState("10");
  const [section, setSection] = useState("");
  const [cutGuides, setCutGuides] = useState(true);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<StripProfile[]>(() => loadStripProfiles(readStorage()));

  const profile: Partial<StripProfile> = {
    rollWidth: num(draft.rollWidth),
    printableWidth: num(draft.printableWidth),
    segmentLength: num(draft.segmentLength),
    repeatGap: num(draft.repeatGap, 0),
    endZone: num(draft.endZone, 0),
    leadIn: num(draft.leadIn, 0),
  };
  const n = Math.round(num(count, 0)!);
  const sectionLength = num(section) ?? Infinity;
  const problems = validateStrip(profile, n, sectionLength);
  const full = problems.length === 0 ? ({ ...profile, name: name || STRIP_USES[use].label, origin: "user" } as StripProfile) : null;
  const sections = full ? planStrip(full, n, sectionLength) : [];
  const totalLength = full ? 2 * full.leadIn + n * full.segmentLength + (n - 1) * full.repeatGap : 0;

  const load = (p: StripProfile) => {
    setName(p.name);
    setDraft({
      rollWidth: String(p.rollWidth),
      printableWidth: String(p.printableWidth),
      segmentLength: String(p.segmentLength),
      repeatGap: String(p.repeatGap),
      endZone: String(p.endZone),
      leadIn: String(p.leadIn),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Lanyard ribbon roll layout</DialogTitle>
          <DialogDescription>
            White polyester sublimation ribbon is roll stock: print straps along it, then cut them. Enter your ribbon&apos;s real sizes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <Segmented<StripUse>
            ariaLabel="Finished use"
            value={use}
            onValueChange={setUse}
            options={(Object.keys(STRIP_USES) as StripUse[]).map((value) => ({ value, label: STRIP_USES[value].label }))}
          />
          <p className="-mt-2 text-[12px] text-ink-muted">{STRIP_USES[use].hint}</p>
          {saved.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {saved.map((p) => (
                <button key={p.name} type="button" onClick={() => load(p)} className="h-7 rounded-md bg-subtle px-2 text-[12px] font-medium hover:bg-subtle-2">
                  {p.name} <span className="text-ink-faint">(custom)</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-[12px] font-medium text-ink-muted">
                {f.label}
                <Input
                  inputMode="decimal"
                  aria-label={f.label}
                  value={draft[f.key] ?? ""}
                  placeholder={f.hint}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  aria-invalid={problems.some((p) => p.field === f.key)}
                />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-muted">
              Number of straps
              <Input inputMode="numeric" aria-label="Number of straps" value={count} onChange={(e) => setCount(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-muted">
              Longest section per page (mm)
              <Input inputMode="decimal" aria-label="Longest section per page" value={section} placeholder="Blank = one page" onChange={(e) => setSection(e.target.value)} />
            </label>
          </div>
          <Field label="Print cut guides between straps" htmlFor="strip-guides">
            <Switch id="strip-guides" checked={cutGuides} onCheckedChange={setCutGuides} />
          </Field>
          {problems.length > 0 ? (
            <Note tone="warn" icon={<TriangleAlert />}>
              {problems[0].message}
            </Note>
          ) : (
            <Note tone="ok" icon={<Ribbon />}>
              {n} straps, {+totalLength.toFixed(1)} mm of ribbon, on {sections.length} {sections.length === 1 ? "page" : "pages"}. Sizes are
              user-entered (custom, not supplier-verified).
            </Note>
          )}
          <div className="flex gap-1.5">
            <Input aria-label="Profile name" placeholder="Profile name, e.g. My 20 mm ribbon" value={name} onChange={(e) => setName(e.target.value)} />
            <Button
              disabled={!full || !name.trim()}
              onClick={() => {
                const list = [...saved.filter((p) => p.name !== name.trim()), { ...full!, name: name.trim() }];
                if (saveStripProfiles(readStorage(), list)) {
                  setSaved(list);
                  toast.success("Profile saved in this browser");
                } else toast.error("This browser would not save the profile.");
              }}
            >
              <Save />
              Save
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!full}
            onClick={() => {
              createStripLayout(full!, use, n, sectionLength, cutGuides);
              setDialog(null);
            }}
          >
            <Ribbon />
            Lay out straps
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
