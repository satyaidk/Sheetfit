import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Buttons. Heights come from the density tokens (`--control-h*`), colours from
 * semantic roles, so one class list works in light, dark, comfortable and
 * compact. One primary button per view (Download in the header, the confirm
 * button in a dialog).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-body font-medium transition-[background-color,border-color,color,opacity] duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent shadow-card hover:bg-accent-hover",
        default: "border border-line-strong bg-surface text-ink hover:bg-subtle active:bg-subtle-2",
        subtle: "bg-subtle-2 text-ink hover:bg-line",
        ghost: "text-ink hover:bg-subtle-2 active:bg-line",
        danger: "border border-line-strong bg-surface text-danger hover:bg-danger-soft",
        dark: "bg-inverse text-on-inverse hover:opacity-90",
      },
      size: {
        sm: "h-(--control-h-sm) px-2",
        md: "h-(--control-h) px-3",
        lg: "h-(--control-h-lg) px-4",
        icon: "size-(--control-h)",
        "icon-sm": "size-(--control-h-sm)",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
