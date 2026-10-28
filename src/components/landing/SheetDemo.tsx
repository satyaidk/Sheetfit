"use client";

/**
 * A miniature of the editor's sheet, for the home page.
 *
 * Three real example sheets (see `lib/landing/sheet-demos.ts`). Visitors drag
 * a transfer, or select it and nudge it with the arrow keys, and see what the
 * editor would show: snapping to the sheet centre, margins and other transfers
 * (`snapRect`), live gaps in millimetres (`measureGaps`), overlaps, and how
 * much of the sheet is used (`sheetUtilisation`). It never touches the real
 * editor or its store; "Open in the editor" links to the template instead.
 *
 * On touch screens a transfer must be selected before it can be dragged, so a
 * finger on the sheet still scrolls the page.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, Shuffle } from "lucide-react";
import { DEMO_SHEETS, mm, type DemoItem, type DemoSheet } from "@/lib/landing/sheet-demos";
import { snapRect, type SnapGuide } from "@/lib/layout/alignment";
import { measureGaps, sheetUtilisation } from "@/lib/layout/measure";
import { SNAP_SCREEN_PX } from "@/lib/layout/drag";
import { rectsOverlap } from "@/lib/layout/sheet-layout";
import { productHref } from "@/lib/editor-link";
import { cn } from "@/lib/utils";
import { demoArt } from "./demo-art";

type Positions = Record<string, { x: number; y: number }>;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const r1 = (v: number) => String(+v.toFixed(1));

function clampInto(item: DemoItem, x: number, y: number, s: DemoSheet) {
  const a = s.printable;
  return {
    x: Math.min(Math.max(x, a.x), a.x + a.width - item.width),
    y: Math.min(Math.max(y, a.y), a.y + a.height - item.height),
  };
}

function snapLines(s: DemoSheet, others: DemoItem[]) {
  const a = s.printable;
  const vertical = [s.width / 2, a.x, a.x + a.width];
  const horizontal = [s.height / 2, a.y, a.y + a.height];
  for (const o of others) {
    vertical.push(o.x, o.x + o.width / 2, o.x + o.width);
    horizontal.push(o.y, o.y + o.height / 2, o.y + o.height);
  }
  return { vertical, horizontal };
}

export function SheetDemo() {
  const [sheetId, setSheetId] = useState(DEMO_SHEETS[0].id);
  const [moved, setMoved] = useState<Record<string, Positions>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [shuffle, setShuffle] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; px: number; py: number; x: number; y: number; scale: number } | null>(null);

  const sheet = DEMO_SHEETS.find((s) => s.id === sheetId)!;
  const positions = moved[sheet.id] ?? {};
  const items = sheet.items.map((i) => ({ ...i, ...positions[i.id] }));
  const current = items.find((i) => i.id === selected) ?? null;
  const others = current ? items.filter((i) => i !== current) : [];
  const gaps = current ? measureGaps(current, others, sheet.printable) : [];
  const overlapping = new Set(items.filter((i) => items.some((o) => o !== i && rectsOverlap(i, o))).map((i) => i.id));
  const used = sheetUtilisation(items, sheet.printable);
  const W = sheet.width;
  const H = sheet.height;

  function place(id: string, x: number, y: number) {
    setMoved((m) => ({ ...m, [sheet.id]: { ...m[sheet.id], [id]: { x, y } } }));
  }

  function chooseSheet(id: string) {
    setSheetId(id);
    setSelected(null);
    setGuides([]);
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>, item: DemoItem) {
    // Touch: the first tap selects; dragging needs a selected transfer, so the page can still scroll.
    if (e.pointerType === "touch" && selected !== item.id) return;
    const box = sheetRef.current!.getBoundingClientRect();
    drag.current = { id: item.id, px: e.clientX, py: e.clientY, x: item.x, y: item.y, scale: box.width / W };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(item.id);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>, item: DemoItem) {
    const d = drag.current;
    if (!d || d.id !== item.id) return;
    const raw = { x: d.x + (e.clientX - d.px) / d.scale, y: d.y + (e.clientY - d.py) / d.scale };
    const lines = snapLines(sheet, items.filter((i) => i.id !== item.id));
    const snap = e.altKey
      ? { dx: 0, dy: 0, guides: [] }
      : snapRect({ ...raw, width: item.width, height: item.height }, lines.vertical, lines.horizontal, SNAP_SCREEN_PX / d.scale);
    const next = clampInto(item, raw.x + snap.dx, raw.y + snap.dy, sheet);
    setGuides(snap.guides.filter((g) => (g.orientation === "vertical" ? next.x === raw.x + snap.dx : next.y === raw.y + snap.dy)));
    place(item.id, next.x, next.y);
  }

  function onPointerUp() {
    drag.current = null;
    setGuides([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, item: DemoItem) {
    const step = e.shiftKey ? 10 : 1;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault();
    setSelected(item.id);
    const next = clampInto(item, item.x + delta[0], item.y + delta[1], sheet);
    place(item.id, next.x, next.y);
  }

  return (
    <div className="grid overflow-hidden rounded-[18px] border border-hairline bg-paper-deep lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="radiogroup" aria-label="Example sheet" className="flex flex-wrap gap-1.5">
            {DEMO_SHEETS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === sheet.id}
                onClick={() => chooseSheet(s.id)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors",
                  s.id === sheet.id ? "bg-graphite text-paper" : "bg-paper text-graphite ring-1 ring-hairline hover:bg-white",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setShuffle((n) => n + 1)} className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-[13px] font-semibold ring-1 ring-hairline hover:bg-white">
              <Shuffle className="size-3.5" /> New artwork
            </button>
            <button
              type="button"
              onClick={() => {
                setMoved((m) => ({ ...m, [sheet.id]: {} }));
                setSelected(null);
              }}
              className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-[13px] font-semibold ring-1 ring-hairline hover:bg-white"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          </div>
        </div>

        <div className="mt-8 mb-4 flex justify-center">
          <div
            ref={sheetRef}
            className="relative bg-white shadow-[0_1px_2px_rgb(34_35_31/0.08),0_30px_50px_-28px_rgb(34_35_31/0.5)] ring-1 ring-graphite/10"
            style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, ${Math.round((520 * W) / H)}px)` }}
            onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            <span className="tnum absolute -top-6 left-0 text-[12px] font-semibold text-graphite-soft">
              {sheet.sheetName}, {mm(W, H)}
            </span>
            <div
              aria-hidden
              className="pointer-events-none absolute border border-dashed border-graphite/25"
              style={{ left: pct(sheet.printable.x, W), top: pct(sheet.printable.y, H), width: pct(sheet.printable.width, W), height: pct(sheet.printable.height, H) }}
            />
            {items.map((item) => {
              const isSel = item.id === selected;
              const over = overlapping.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`${item.label}, ${mm(item.width, item.height)}, at ${r1(item.x)} by ${r1(item.y)} mm${over ? ", overlapping" : ""}`}
                  aria-pressed={isSel}
                  onPointerDown={(e) => onPointerDown(e, item)}
                  onPointerMove={(e) => onPointerMove(e, item)}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onClick={() => setSelected(item.id)}
                  onKeyDown={(e) => onKeyDown(e, item)}
                  className={cn(
                    "absolute cursor-grab outline-offset-2 active:cursor-grabbing",
                    item.shape === "circle" && "rounded-full",
                    isSel ? "z-10 ring-2 ring-graphite" : "hover:ring-2 hover:ring-graphite/40",
                    over && "ring-2 ring-coral",
                  )}
                  style={{
                    left: pct(item.x, W),
                    top: pct(item.y, H),
                    width: pct(item.width, W),
                    height: pct(item.height, H),
                    touchAction: isSel ? "none" : "manipulation",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL */}
                  <img src={demoArt(item, shuffle)} alt="" draggable={false} className={cn("pointer-events-none size-full object-cover", item.shape === "circle" && "rounded-full")} />
                </button>
              );
            })}

            {guides.map((g) => (
              <span
                key={`${g.orientation}-${g.position}`}
                aria-hidden
                className={cn("pointer-events-none absolute bg-guide", g.orientation === "vertical" ? "top-0 bottom-0 w-px" : "right-0 left-0 h-px")}
                style={g.orientation === "vertical" ? { left: pct(g.position, W) } : { top: pct(g.position, H) }}
              />
            ))}
            {gaps.map((g) => {
              const along = g.axis === "x";
              return (
                <span
                  key={`${g.axis}-${g.from}`}
                  aria-hidden
                  className="pointer-events-none absolute z-20"
                  style={
                    along
                      ? { left: pct(g.from, W), width: pct(g.value, W), top: pct(g.at, H) }
                      : { top: pct(g.from, H), height: pct(g.value, H), left: pct(g.at, W) }
                  }
                >
                  <span className={cn("absolute bg-guide", along ? "inset-x-0 top-0 h-px" : "inset-y-0 left-0 w-px")} />
                  <span className="tnum absolute top-1/2 left-1/2 -translate-1/2 rounded bg-guide px-1 text-[10px] leading-[16px] font-bold whitespace-nowrap text-white">
                    {r1(g.value)} mm
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <aside aria-label="Sheet details" className="flex flex-col gap-5 border-t border-hairline bg-paper p-5 text-[14px] lg:border-t-0 lg:border-l">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-graphite-soft">Sheet</dt>
          <dd className="tnum text-right font-semibold">{sheet.sheetName}</dd>
          <dt className="text-graphite-soft">Process</dt>
          <dd className="text-right font-semibold">{sheet.process === "dtf" ? "DTF, printed as seen" : "Sublimation, mirrored on export"}</dd>
          <dt className="text-graphite-soft">Transfers</dt>
          <dd className="tnum text-right font-semibold">{items.length}</dd>
          <dt className="text-graphite-soft">Gap when packed</dt>
          <dd className="tnum text-right font-semibold">{+sheet.gap.toFixed(2)} mm</dd>
        </dl>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-graphite-soft">Sheet used</span>
            <span className="tnum text-[22px] font-bold" aria-live="polite">
              {Math.round(used * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone">
            <div className="h-full rounded-full bg-lime transition-[width] duration-300" style={{ width: `${used * 100}%` }} />
          </div>
        </div>
        <div className="rounded-[12px] bg-paper-deep p-4" aria-live="polite">
          {current ? (
            <>
              <p className="font-semibold">{current.label}</p>
              <p className="tnum mt-1 text-graphite-soft">
                {mm(current.width, current.height)}, at {r1(current.x)}, {r1(current.y)} mm
              </p>
              {overlapping.has(current.id) && <p className="mt-2 font-semibold text-graphite">Overlaps another transfer; the editor flags this too.</p>}
              <Link
                href={productHref(current.productId, sheet.process)}
                className="mt-3 inline-flex rounded-full bg-graphite px-4 py-2 text-[13.5px] font-semibold text-paper hover:bg-graphite/88"
              >
                Open this template in the editor
              </Link>
            </>
          ) : (
            <p className="text-graphite-soft">Select a transfer to see its size, position and gaps. Drag it, or use the arrow keys (Shift moves 10 mm).</p>
          )}
        </div>
        <p className="mt-auto text-[13px] leading-relaxed text-graphite-soft">
          Laid out by the editor&apos;s own packing, snapping and measuring code, with its default 5 mm margins.
        </p>
      </aside>
    </div>
  );
}
