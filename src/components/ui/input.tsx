import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-line bg-surface px-2 text-[13px] text-ink tnum outline-none transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
