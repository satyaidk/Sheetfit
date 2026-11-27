import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { displayShortcut } from "@/lib/commands/shortcuts";

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
          className="z-50 flex max-w-72 items-center gap-2 rounded-md bg-inverse px-2 py-1 text-caption font-medium text-on-inverse shadow-pop animate-fade"
        >
          {label}
          {shortcut && <kbd className="font-sans text-caption text-on-inverse/70">{displayShortcut(shortcut)}</kbd>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
