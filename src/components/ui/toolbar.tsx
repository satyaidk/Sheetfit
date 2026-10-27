import * as React from "react";
import { Toolbar as ToolbarPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * WAI-ARIA toolbar (one Tab stop, arrow keys between controls) used for the
 * quick-actions bar and the floating selection pill.
 */
export function Toolbar({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
  return <ToolbarPrimitive.Root className={cn("flex items-center gap-0.5", className)} {...props} />;
}

export function ToolbarButton({
  className,
  active,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Button> & { active?: boolean }) {
  return (
    <ToolbarPrimitive.Button
      className={cn(
        "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-[13px] font-medium whitespace-nowrap text-ink transition-colors hover:bg-subtle-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
        active && "bg-accent-soft text-accent hover:bg-accent-soft",
        className,
      )}
      {...props}
    />
  );
}

export function ToolbarSeparator({ className }: { className?: string }) {
  return <ToolbarPrimitive.Separator className={cn("mx-1 h-5 w-px shrink-0 bg-line", className)} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-subtle px-1 font-sans text-[11px] font-medium text-ink-muted">
      {children}
    </kbd>
  );
}
