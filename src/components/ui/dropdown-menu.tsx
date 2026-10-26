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
        className={cn("z-50 min-w-48 rounded-md border border-line bg-surface p-1 shadow-xl", className)}
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
        "flex h-8 cursor-default items-center gap-2 rounded-[4px] px-2 text-[13px] outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-cyan-wash [&_svg]:size-4 [&_svg]:text-ink-muted",
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
