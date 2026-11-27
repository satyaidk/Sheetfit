"use client";

/**
 * Lanyard and keychain straps.
 *
 * "On transfer sheets" (the default) is the home workflow: strips exactly one
 * ribbon wide (12, 16 or 20 mm, or typed) and one strap long are printed on
 * A4 sublimation paper and pressed onto white satin ribbon. The dialog shows
 * how many fit on the sheet as the numbers change, a preview of one strap
 * with the artwork, and lays out the whole sheet in one click.
 *
 * "Along a ribbon roll" keeps the v0.9 layout for printers that print on the
 * ribbon roll itself (every size typed by the user, saved profiles).
 */

/* eslint-disable @next/next/no-img-element -- local object URLs */
import { useMemo, useRef, useState } from "react";
import { ImageUp, Ribbon, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { makeDesign, useEditor } from "@/store/editor-store";
import type { LoadedAsset } from "@/types/image";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Field, Note } from "./Section";
import { NumberField } from "./NumberField";
import { SheetSelect } from "./SheetSelect";
import {
  STRIP_USES,
  loadStripProfiles,
  planStrip,
  saveStripProfiles,
  validateStrip,
  type StripProfile,
  type StripUse,
} from "@/lib/layout/strip-layout";
import { RIBBON_WIDTHS, loadStrapSpec, strapArtPlacements, strapDesign, validateStrap, type StrapSpec } from "@/lib/layout/strap";
import { planFill } from "@/lib/layout/fill";
import { pageSize } from "@/lib/layout/sheet-layout";
import { ACCEPT_ATTR, loadAssetFromFile, ImageLoadError } from "@/lib/image/image-loader";
import { createStripLayout, layoutStraps } from "@/lib/editor-actions";
import { cn } from "@/lib/utils";

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

type Tab = "sheets" | "roll";

export function StripDialog() {
  const open = useEditor((s) => s.dialog === "strip");
  const setDialog = useEditor((s) => s.setDialog);
  const [tab, setTab] = useState<Tab>("sheets");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent className="max-w-[860px]">
        <DialogHeader>
          <DialogTitle>Lanyard and keychain straps</DialogTitle>
          <DialogDescription>
            White polyester sublimation ribbon: print strips one ribbon wide, lay the ribbon on them and press. Mirrored automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-3">
          <Segmented<Tab>
            ariaLabel="Where you print"
            value={tab}
            onValueChange={setTab}
            options={[
              { value: "sheets", label: "On transfer sheets (A4)" },
              { value: "roll", label: "Along a ribbon roll" },
            ]}
          />
        </div>
        {open && (tab === "sheets" ? <SheetStraps onDone={() => setDialog(null)} /> : <RollStraps onDone={() => setDialog(null)} />)}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- sheets --------------------------------- */

function SheetStraps({ onDone }: { onDone: () => void }) {
  const page = useEditor((s) => s.doc.page);
  const assets = useEditor((s) => s.assets);
  const remembered = useMemo(() => loadStrapSpec(readStorage()), []);
  const [width, setWidth] = useState<number>(remembered.width && remembered.width > 0 ? remembered.width : 16);
  const [length, setLength] = useState<number | null>(remembered.length && remembered.length > 0 ? remembered.length : null);
  const [mode, setMode] = useState<StrapSpec["mode"]>(remembered.mode ?? "repeat");
  const [along, setAlong] = useState(remembered.along ?? true);
  const [fold, setFold] = useState(remembered.fold ?? true);
  const [endZone, setEndZone] = useState(remembered.endZone ?? 0);
  const [gap, setGap] = useState(3);
  const [sheet, setSheet] = useState(page.sheet === "custom" ? "a4" : page.sheet);
  const [countMode, setCountMode] = useState<"fill" | "exact">("fill");
  const [exact, setExact] = useState(20);
  const [art, setArt] = useState<LoadedAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const spec: StrapSpec = { width, length: length ?? 0, mode, along, fold, endZone };
  const problems = validateStrap(spec);
  const ok = problems.length === 0;
  const target = { ...page, sheet, customSize: null, spacing: gap, process: "sublimation" as const };
  const plan = useMemo(() => {
    if (!ok) return null;
    const d = makeDesign({ ...strapDesign(spec), id: "preview" });
    return planFill(d, target, [d], { rotate: true, emptyPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- spec fields are listed
  }, [ok, width, length, gap, sheet, page.margins.top, page.margins.left, page.margins.right, page.margins.bottom, page.orientation]);
  const fits = plan?.slots.length ?? 0;
  const uploads = Object.values(assets).filter((a) => !/, strap \d/.test(a.name));

  const pick = async (file: File) => {
    try {
      setArt(await loadAssetFromFile(file));
    } catch (error) {
      toast.error(error instanceof ImageLoadError ? error.message : `${file.name} could not be opened.`);
    }
  };

  return (
    <>
      <div className="scroll-thin grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 md:grid-cols-[1fr_240px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section>
            <p className="mb-1.5 text-body font-semibold">Ribbon width</p>
            <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Ribbon width">
              {RIBBON_WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={width === w}
                  onClick={() => setWidth(w)}
                  className={cn(
                    "h-9 rounded-lg px-3.5 text-body font-semibold ring-1 transition-colors",
                    width === w ? "bg-accent text-on-accent ring-accent" : "ring-line hover:bg-subtle",
                  )}
                >
                  {w} mm
                </button>
              ))}
              <NumberField label="Other" valueMm={width} min={3} max={100} onCommit={setWidth} className="w-32" />
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-body font-semibold">Strap length (cut length)</p>
            <div className="flex items-center gap-2">
              <label className="flex h-9 w-40 items-center rounded-md border border-line bg-surface pl-2 text-body focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
                <input
                  inputMode="decimal"
                  aria-label="Strap length in millimetres"
                  placeholder="e.g. your strap"
                  className="tnum h-full w-full min-w-0 bg-transparent px-1 outline-none focus-visible:outline-none"
                  defaultValue={length ?? ""}
                  onChange={(e) => {
                    const v = num(e.target.value);
                    setLength(v && v > 0 ? v : null);
                  }}
                />
                <span className="shrink-0 pr-2 text-caption text-ink-faint">mm</span>
              </label>
              <p className="text-caption leading-snug text-ink-muted">Measure a finished strap: both sides of the loop plus what goes into the clamp.</p>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-body font-semibold">
              Artwork <span className="font-normal text-ink-faint">optional, you can add it later</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" onClick={() => input.current?.click()}>
                <ImageUp />
                {art ? "Change image" : "Upload image"}
              </Button>
              <input
                ref={input}
                type="file"
                accept={ACCEPT_ATTR}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pick(f);
                  e.target.value = "";
                }}
              />
              {uploads.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setArt(a)}
                  title={a.name}
                  aria-label={`Use ${a.name}`}
                  className={cn("checker flex size-9 items-center justify-center overflow-hidden rounded-md ring-1", art?.id === a.id ? "ring-2 ring-accent" : "ring-line hover:ring-accent")}
                >
                  <img src={a.objectUrl} alt="" className="max-h-full max-w-full object-contain" />
                </button>
              ))}
              {art && <span className="truncate text-caption text-ink-muted">{art.name}</span>}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-body font-semibold">On the strap</p>
              <Segmented<StrapSpec["mode"]>
                ariaLabel="Artwork on the strap"
                value={mode}
                onValueChange={setMode}
                options={[
                  { value: "once", label: "Once" },
                  { value: "repeat", label: "Repeat" },
                  { value: "fill", label: "Fill (crop)" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Field label="Run along the strap" htmlFor="strap-along">
                <Switch id="strap-along" checked={along} onCheckedChange={setAlong} />
              </Field>
              <Field label="Both faces (folded at the middle)" htmlFor="strap-fold">
                <Switch id="strap-fold" checked={fold} onCheckedChange={setFold} />
              </Field>
            </div>
          </section>
          {fold && (
            <p className="-mt-2 text-caption leading-snug text-ink-muted">
              The second half is printed turned 180°, so both faces read upright when the strap is folded through a ring.
            </p>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-body font-semibold">Keep the ends clear</p>
              <NumberField label="Each end" valueMm={endZone} min={0} max={100} onCommit={setEndZone} />
              <p className="mt-1 text-caption text-ink-muted">No artwork where the clamp or crimp goes.</p>
            </div>
            <div>
              <p className="mb-1.5 text-body font-semibold">Gap between strips</p>
              <NumberField label="Gap" valueMm={gap} min={0} max={50} onCommit={setGap} />
              <p className="mt-1 text-caption text-ink-muted">Room to cut the transfer paper apart.</p>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-body font-semibold">Sheet</p>
              <SheetSelect value={sheet} onChange={setSheet} allowCustom={false} include={["a4", "letter", "legal", "a3", "a3plus"]} ariaLabel="Sheet" />
            </div>
            <div>
              <p className="mb-1.5 text-body font-semibold">How many</p>
              <Segmented<"fill" | "exact">
                ariaLabel="How many straps"
                value={countMode}
                onValueChange={setCountMode}
                options={[
                  { value: "fill", label: ok ? `Fill sheet (${fits})` : "Fill sheet" },
                  { value: "exact", label: "Exactly" },
                ]}
              />
              {countMode === "exact" && (
                <div className="mt-1.5">
                  <NumberField label="Straps" raw valueMm={exact} min={1} max={1000} onCommit={(v) => setExact(Math.round(v))} />
                </div>
              )}
            </div>
          </section>

          {!ok ? (
            <Note tone="warn" icon={<TriangleAlert />}>
              {problems[0].message}
            </Note>
          ) : fits === 0 ? (
            <Note tone="error" icon={<TriangleAlert />}>
              A {+width.toFixed(1)} × {length} mm strap does not fit this sheet. Pick a larger sheet or a shorter strap.
            </Note>
          ) : (
            <Note tone="ok" icon={<Ribbon />}>
              {fits} straps fit on {sheet === "a4" ? "A4" : sheet.toUpperCase()}
              {countMode === "exact" && exact > fits ? `; ${exact} straps need ${Math.ceil(exact / fits)} sheets` : ""}. Width and length are your own
              values; nothing is resized.
            </Note>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          <SheetPreview page={target} slots={plan?.slots ?? []} width={width} length={length ?? 0} />
          {ok && <StrapPreview spec={spec} art={art} />}
        </aside>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!ok || fits === 0 || busy}
          onClick={async () => {
            setBusy(true);
            const r = await layoutStraps(spec, { count: countMode === "fill" ? "fill" : exact, sheet, gap, art });
            setBusy(false);
            if (r) onDone();
          }}
        >
          <Ribbon />
          {countMode === "fill" ? `Lay out ${fits} straps` : `Lay out ${exact} straps`}
        </Button>
      </DialogFooter>
    </>
  );
}

/** The sheet with every strap position (turned ones drawn turned). */
function SheetPreview({ page, slots, width, length }: { page: Parameters<typeof pageSize>[0]; slots: { x: number; y: number; rotation: number }[]; width: number; length: number }) {
  const size = pageSize(page);
  return (
    <figure className="rounded-xl bg-subtle p-3">
      <svg viewBox={`0 0 ${size.width} ${size.height}`} className="mx-auto max-h-[260px] w-full" role="img" aria-label={`${slots.length} straps on the sheet`}>
        <rect width={size.width} height={size.height} fill="#fff" stroke="#d0d5dd" strokeWidth={0.8} />
        {slots.map((s, i) => {
          const cx = s.x + width / 2;
          const cy = s.y + length / 2;
          return (
            <rect
              key={i}
              x={s.x}
              y={s.y}
              width={width}
              height={length}
              rx={0.6}
              fill="#e6f2f3"
              stroke="#077d89"
              strokeWidth={0.6}
              transform={s.rotation ? `rotate(${s.rotation} ${cx} ${cy})` : undefined}
            />
          );
        })}
      </svg>
      <figcaption className="mt-1.5 text-center text-caption text-ink-muted">
        {slots.length} {slots.length === 1 ? "strap" : "straps"} per sheet
      </figcaption>
    </figure>
  );
}

/** One strap, upright, with the artwork placed as it will print (before the sheet mirror). */
function StrapPreview({ spec, art }: { spec: StrapSpec; art: LoadedAsset | null }) {
  const placements = art ? strapArtPlacements(spec, art.naturalWidth / art.naturalHeight) : strapArtPlacements(spec, 2);
  const scale = Math.min(1, 220 / spec.length);
  return (
    <figure className="flex items-center gap-3 rounded-xl bg-subtle p-3">
      <svg
        viewBox={`-1 -1 ${spec.width + 2} ${spec.length + 2}`}
        width={(spec.width + 2) * scale * 3}
        height={(spec.length + 2) * scale * 3}
        className="max-h-[230px] shrink-0"
        role="img"
        aria-label="One strap with the artwork"
      >
        <rect width={spec.width} height={spec.length} fill="#fff" stroke="#98a2b3" strokeWidth={0.4} />
        {spec.endZone > 0 && (
          <>
            <rect width={spec.width} height={spec.endZone} fill="#f2f4f7" />
            <rect y={spec.length - spec.endZone} width={spec.width} height={spec.endZone} fill="#f2f4f7" />
          </>
        )}
        {spec.fold && <line x1={0} x2={spec.width} y1={spec.length / 2} y2={spec.length / 2} stroke="#ec2f8f" strokeWidth={0.4} strokeDasharray="1.5 1" />}
        {placements.map((p, i) => {
          const cx = p.rect.x + p.rect.width / 2;
          const cy = p.rect.y + p.rect.height / 2;
          const sideways = p.rotation % 180 !== 0;
          const w = sideways ? p.rect.height : p.rect.width;
          const h = sideways ? p.rect.width : p.rect.height;
          return art ? (
            <image
              key={i}
              href={art.objectUrl}
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              preserveAspectRatio={p.cover ? "xMidYMid slice" : "xMidYMid meet"}
              transform={`rotate(${p.rotation} ${cx} ${cy})`}
            />
          ) : (
            <rect key={i} x={p.rect.x} y={p.rect.y} width={p.rect.width} height={p.rect.height} fill="#cfe6e8" />
          );
        })}
      </svg>
      <figcaption className="text-caption leading-snug text-ink-muted">
        One strap, {+spec.width.toFixed(1)} × {+spec.length.toFixed(1)} mm{spec.fold ? ". Pink line: the fold" : ""}
        {spec.endZone > 0 ? ". Grey: clamp zones" : ""}. The sheet prints mirrored for sublimation.
      </figcaption>
    </figure>
  );
}

/* ---------------------------------- roll ---------------------------------- */

function RollStraps({ onDone }: { onDone: () => void }) {
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
    <>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
        <p className="text-caption text-ink-muted">
          For printers that print on the ribbon roll itself: each page is a length of ribbon. Every size is yours (custom, not supplier-verified).
        </p>
        <Segmented<StripUse>
          ariaLabel="Finished use"
          value={use}
          onValueChange={setUse}
          options={(Object.keys(STRIP_USES) as StripUse[]).map((value) => ({ value, label: STRIP_USES[value].label }))}
        />
        <p className="-mt-2 text-caption text-ink-muted">{STRIP_USES[use].hint}</p>
        {saved.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {saved.map((p) => (
              <button key={p.name} type="button" onClick={() => load(p)} className="h-7 rounded-md bg-subtle px-2 text-caption font-medium hover:bg-subtle-2">
                {p.name} <span className="text-ink-faint">(custom)</span>
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
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
          <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
            Number of straps
            <Input inputMode="numeric" aria-label="Number of straps" value={count} onChange={(e) => setCount(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
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
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!full}
          onClick={() => {
            createStripLayout(full!, use, n, sectionLength, cutGuides);
            onDone();
          }}
        >
          <Ribbon />
          Lay out straps
        </Button>
      </DialogFooter>
    </>
  );
}
