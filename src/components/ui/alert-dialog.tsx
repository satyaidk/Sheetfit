import * as React from "react";
import { AlertDialog as AlertPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export const AlertDialog = AlertPrimitive.Root;

/** Confirmation for actions that change the printed result, such as distortion. */
export function AlertDialogContent({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  tone = "primary",
  children,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  tone?: "primary" | "danger";
  children?: React.ReactNode;
}) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0d1a15]/55" />
      <AlertPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface p-5 shadow-2xl">
        <AlertPrimitive.Title className="font-condensed text-[19px] font-semibold tracking-tight">
          {title}
        </AlertPrimitive.Title>
        <AlertPrimitive.Description asChild>
          <div className="mt-2 text-[13px] leading-relaxed text-ink-muted">{description}</div>
        </AlertPrimitive.Description>
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <AlertPrimitive.Cancel className={buttonVariants({ variant: "default" })}>{cancelLabel}</AlertPrimitive.Cancel>
          <AlertPrimitive.Action
            className={cn(buttonVariants({ variant: tone === "danger" ? "danger" : "primary" }))}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertPrimitive.Action>
        </div>
      </AlertPrimitive.Content>
    </AlertPrimitive.Portal>
  );
}
