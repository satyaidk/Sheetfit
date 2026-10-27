import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  label,
  shortcut,
  side = "bottom",
  children,
}: {
  label: string;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 flex items-center gap-2 rounded-md bg-ink px-2 py-1 text-[12px] font-medium text-white shadow-lg animate-fade"
        >
          {label}
          {shortcut && <kbd className="font-sans text-[11px] text-white/60">{shortcut}</kbd>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
