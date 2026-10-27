import * as React from "react";
import { ContextMenu as Menu } from "radix-ui";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const ContextMenu = Menu.Root;
export const ContextMenuTrigger = Menu.Trigger;
export const ContextMenuSub = Menu.Sub;

const itemClass =
  "flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-subtle-2 [&_svg]:size-4 [&_svg]:text-ink-muted";

export function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        className={cn("z-50 min-w-56 rounded-lg bg-surface p-1 shadow-pop ring-1 ring-black/5 animate-pop", className)}
        {...props}
      />
    </Menu.Portal>
  );
}

export function ContextMenuItem({
  className,
  shortcut,
  danger,
  children,
  ...props
}: React.ComponentProps<typeof Menu.Item> & { shortcut?: string; danger?: boolean }) {
  return (
    <Menu.Item className={cn(itemClass, danger && "text-danger [&_svg]:text-danger", className)} {...props}>
      {children}
      {shortcut && <span className="ml-auto pl-6 text-[11px] text-ink-faint">{shortcut}</span>}
    </Menu.Item>
  );
}

export function ContextMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof Menu.SubTrigger>) {
  return (
    <Menu.SubTrigger className={cn(itemClass, "data-[state=open]:bg-subtle-2", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </Menu.SubTrigger>
  );
}

export function ContextMenuSubContent({ className, ...props }: React.ComponentProps<typeof Menu.SubContent>) {
  return (
    <Menu.Portal>
      <Menu.SubContent
        className={cn("z-50 min-w-48 rounded-lg bg-surface p-1 shadow-pop ring-1 ring-black/5 animate-pop", className)}
        {...props}
      />
    </Menu.Portal>
  );
}

export function ContextMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-line" />;
}
