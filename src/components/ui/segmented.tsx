import * as React from "react";
import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

/** Single-choice segmented control built on Radix ToggleGroup. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(v) => v && onValueChange(v as T)}
      className={cn("flex h-8 rounded-md border border-line bg-subtle-2 p-0.5", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          title={o.title}
          aria-label={o.title}
          className="flex flex-1 items-center justify-center gap-1 rounded-[4px] px-2 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-[0_0_0_1px_var(--line)] [&_svg]:size-3.5"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
