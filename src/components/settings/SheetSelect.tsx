"use client";

/**
 * Sheet size dropdown, used in the header, the Sheet panel and the start
 * dialog. Sheets are grouped (paper, DTF gang sheets and rolls), each with its
 * size and what it is typically used for, plus "Custom size…". A small shape
 * next to each name shows the sheet's proportions at a glance.
 */

import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown, Ruler } from "lucide-react";
import { SHEETS, findSheet } from "@/lib/catalogue/sheets";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import type { Unit } from "@/types/editor";
import { cn } from "@/lib/utils";

function SheetShape({ width, height, className }: { width: number; height: number; className?: string }) {
  const k = 14 / Math.max(width, height);
  return (
    <span className={cn("flex size-4 shrink-0 items-center justify-center", className)} aria-hidden>
      <span className="block rounded-[1.5px] border border-current" style={{ width: Math.max(4, width * k), height: Math.max(4, height * k) }} />
    </span>
  );
}

export function SheetSelect({
  value,
  onChange,
  unit = "mm",
  allowCustom = true,
  customLabel,
  variant = "field",
  className,
  ariaLabel = "Sheet size",
  include,
  shownSize,
}: {
  value: string;
  onChange: (sheetId: string) => void;
  unit?: Unit;
  allowCustom?: boolean;
  /** Trigger text for a custom sheet, e.g. "Custom 320 × 480 mm". */
  customLabel?: string;
  /** `field` is a bordered input; `ghost` is a header button. */
  variant?: "field" | "ghost";
  className?: string;
  ariaLabel?: string;
  /** Limit the list to these sheet ids. */
  include?: string[];
  /** Size shown on the button (the page in its orientation); defaults to the sheet's portrait size. */
  shownSize?: { width: number; height: number };
}) {
  const u = unit === "px" ? "mm" : unit;
  const fmt = (mm: number) => formatUnit(mm, u, 300);
  const sheets = include ? SHEETS.filter((s) => include.includes(s.id)) : SHEETS;
  const groups = [
    { title: "Paper", items: sheets.filter((s) => s.kind === "paper") },
    { title: "DTF gang sheets and rolls", items: sheets.filter((s) => s.kind === "roll") },
  ].filter((g) => g.items.length > 0);
  const current = findSheet(value);
  const display = shownSize ?? current;

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "group flex min-w-0 items-center gap-2 rounded-md text-left text-[13px] text-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
          variant === "field"
            ? "h-10 w-full border border-line bg-surface px-3 hover:border-line-strong data-[state=open]:border-accent"
            : "h-9 px-2.5 hover:bg-subtle-2 data-[state=open]:bg-subtle-2",
          className,
        )}
      >
        {current && display ? <SheetShape width={display.width} height={display.height} className="text-ink-muted" /> : <Ruler className="size-4 text-ink-muted" />}
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{current ? current.name : (customLabel ?? "Custom size")}</span>
          {current && display && (
            <span className="tnum ml-1.5 text-ink-muted">
              {fmt(display.width)} × {fmt(display.height)} {u}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink-faint transition-transform group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="scroll-thin z-50 max-h-[min(70vh,var(--radix-select-content-available-height))] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-xl bg-surface p-1.5 shadow-pop ring-1 ring-black/5 animate-pop"
        >
          <SelectPrimitive.Viewport>
            {groups.map((g, gi) => (
              <SelectPrimitive.Group key={g.title}>
                {gi > 0 && <SelectPrimitive.Separator className="mx-2 my-1.5 h-px bg-line" />}
                <SelectPrimitive.Label className="px-2.5 pt-1.5 pb-1 text-[12px] font-semibold text-ink-muted">{g.title}</SelectPrimitive.Label>
                {g.items.map((s) => (
                  <SelectPrimitive.Item
                    key={s.id}
                    value={s.id}
                    className="relative flex cursor-default items-center gap-2.5 rounded-lg py-2 pr-8 pl-2.5 outline-none select-none data-[highlighted]:bg-accent-soft data-[state=checked]:bg-accent-soft/60"
                  >
                    <SheetShape width={s.width} height={s.height} className="text-ink-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <SelectPrimitive.ItemText>
                          <span className="text-[13px] font-medium text-ink">{s.name}</span>
                        </SelectPrimitive.ItemText>
                        <span className="tnum shrink-0 text-[11.5px] text-ink-muted">
                          {fmt(s.width)} × {fmt(s.height)} {u}
                        </span>
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-faint">{s.usedFor}</span>
                    </span>
                    <SelectPrimitive.ItemIndicator className="absolute right-2.5">
                      <Check className="size-4 text-accent" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Group>
            ))}
            {allowCustom && (
              <>
                <SelectPrimitive.Separator className="mx-2 my-1.5 h-px bg-line" />
                <SelectPrimitive.Item
                  value="custom"
                  className="relative flex cursor-default items-center gap-2.5 rounded-lg py-2 pr-8 pl-2.5 outline-none select-none data-[highlighted]:bg-accent-soft"
                >
                  <Ruler className="size-4 text-ink-muted" />
                  <SelectPrimitive.ItemText>
                    <span className="text-[13px] font-medium text-ink">Custom size…</span>
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2.5">
                    <Check className="size-4 text-accent" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              </>
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
