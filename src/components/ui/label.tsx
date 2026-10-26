import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("text-[12px] font-medium text-ink-muted select-none", className)}
      {...props}
    />
  );
}
