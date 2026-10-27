import * as React from "react";
import { cn } from "@/lib/utils";

/** A titled group of controls in a side panel. */
export function Section({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-line px-4 py-3.5", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold tracking-[0.01em] text-ink">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Inline status message; tone encodes severity, never decoration. */
export function Note({
  tone = "info",
  icon,
  children,
  className,
}: {
  tone?: "info" | "ok" | "warn" | "error";
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-subtle-2 text-ink-muted",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    error: "bg-danger-soft text-danger",
  } as const;
  return (
    <div className={cn("flex gap-2 rounded-md px-2.5 py-2 text-[12px] leading-snug [&_svg]:mt-px [&_svg]:size-3.5 [&_svg]:shrink-0", tones[tone], className)}>
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <label htmlFor={htmlFor} className="text-[13px] text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
