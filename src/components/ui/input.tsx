import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text field. The bottom edge uses `--line-control` (3:1 against the surface,
 * WCAG 1.4.11), the other edges stay quiet; focus turns the edge accent and
 * doubles it (the Fluent 2 field pattern).
 */
export const fieldClass =
  "rounded-md border border-line-strong border-b-line-control bg-surface text-body text-ink outline-none transition-colors hover:border-line-control focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(fieldClass, "h-(--control-h) w-full min-w-0 px-2 tnum placeholder:text-ink-faint", className)}
      {...props}
    />
  );
}
