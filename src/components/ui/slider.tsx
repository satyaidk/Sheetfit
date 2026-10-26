import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const thumbs = props.value ?? props.defaultValue ?? [0];
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-5 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-line">
        <SliderPrimitive.Range className="absolute h-full bg-cyan" />
      </SliderPrimitive.Track>
      {thumbs.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={props["aria-label"]}
          className="block size-3.5 rounded-full border-2 border-cyan bg-white shadow-sm"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
