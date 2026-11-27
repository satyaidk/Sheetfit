import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-line-control transition-colors duration-(--duration-fast) data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50 before:absolute before:-inset-x-1 before:-inset-y-1.5 before:content-['']",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white shadow-card transition-transform duration-(--duration-fast) data-[state=checked]:translate-x-[17px] data-[state=checked]:bg-on-accent" />
    </SwitchPrimitive.Root>
  );
}
