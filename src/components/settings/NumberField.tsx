"use client";

/**
 * A measurement input. The document value is always millimetres; the field
 * shows and accepts the user's chosen unit and converts on commit (Enter or
 * blur). Arrow keys step by one display unit, Shift by ten.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Unit } from "@/types/editor";
import { formatUnit, fromMm, toMm } from "@/lib/layout/coordinate-conversion";

export function NumberField({
  label,
  valueMm,
  onCommit,
  unit,
  dpi,
  min,
  max,
  disabled,
  suffix,
  raw = false,
  className,
  id,
}: {
  label: string;
  /** Millimetres, or a plain number when `raw` is set (degrees, counts). */
  valueMm: number;
  onCommit: (mm: number) => void;
  unit?: Unit;
  dpi?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  suffix?: string;
  raw?: boolean;
  className?: string;
  id?: string;
}) {
  const u = unit ?? "mm";
  const d = dpi ?? 300;
  const display = raw ? String(Number(valueMm.toFixed(2))) : formatUnit(valueMm, u, d);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (text: string) => {
    setDraft(null);
    const parsed = Number(text.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    let mm = raw ? parsed : toMm(parsed, u, d);
    if (min !== undefined) mm = Math.max(min, mm);
    if (max !== undefined) mm = Math.min(max, mm);
    if (Math.abs(mm - valueMm) > 1e-9) onCommit(mm);
  };

  const step = (dir: 1 | -1, big: boolean) => {
    const current = raw ? valueMm : fromMm(valueMm, u, d);
    const unitStep = raw ? 1 : u === "in" ? 0.1 : u === "cm" ? 0.1 : 1;
    const next = current + dir * unitStep * (big ? 10 : 1);
    commit(String(next));
  };

  return (
    <label
      className={cn(
        "flex h-8 min-w-0 items-center rounded-md border border-line bg-surface pl-2 text-[13px] transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 hover:border-line-strong",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <span className="w-4 shrink-0 text-[11px] font-semibold text-ink-faint">{label}</span>
      <input
        id={id}
        inputMode="decimal"
        aria-label={label}
        disabled={disabled}
        className="tnum h-full w-full min-w-0 bg-transparent px-1 text-ink outline-none"
        value={draft ?? display}
        onFocus={(e) => {
          setDraft(display);
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            step(e.key === "ArrowUp" ? 1 : -1, e.shiftKey);
            setDraft(null);
          }
        }}
      />
      <span className="shrink-0 pr-2 text-[11px] text-ink-faint">{suffix ?? (raw ? "" : u)}</span>
    </label>
  );
}
