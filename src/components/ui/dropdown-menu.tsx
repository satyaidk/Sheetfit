import * as React from "react";
import { DropdownMenu as Menu } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, ...props }: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={6}
        className={cn("z-50 min-w-48 rounded-lg bg-surface p-1 shadow-pop ring-1 ring-black/5 animate-pop", className)}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  shortcut,
  children,
  ...props
}: React.ComponentProps<typeof Menu.Item> & { shortcut?: string }) {
  return (
    <Menu.Item
      className={cn(
        "flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-accent-soft [&_svg]:size-4 [&_svg]:text-ink-muted",
        className,
      )}
      {...props}
    >
      {children}
      {shortcut && <span className="ml-auto pl-4 text-[11px] text-ink-faint">{shortcut}</span>}
    </Menu.Item>
  );
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-line" />;
}
