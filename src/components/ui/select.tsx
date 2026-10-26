import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => onValueChange(v as T)}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1 rounded-md border border-line bg-surface px-2 text-[13px] text-ink outline-none hover:border-line-strong focus:border-cyan",
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-3.5 text-ink-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-line bg-surface p-1 shadow-xl"
        >
          <SelectPrimitive.Viewport>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="relative flex h-7 cursor-default items-center rounded-[4px] pr-2 pl-7 text-[13px] outline-none select-none data-[highlighted]:bg-cyan-wash"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2">
                  <Check className="size-3.5 text-cyan" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
