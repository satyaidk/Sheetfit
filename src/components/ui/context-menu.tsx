import * as React from "react";
import { ContextMenu as Menu } from "radix-ui";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuContentClass, menuItemClass, menuSeparatorClass, menuShortcutClass } from "./menu-styles";

export const ContextMenu = Menu.Root;
export const ContextMenuTrigger = Menu.Trigger;
export const ContextMenuSub = Menu.Sub;

export function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content className={cn(menuContentClass, "min-w-56", className)} {...props} />
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
    <Menu.Item className={cn(menuItemClass, danger && "text-danger [&_svg]:text-danger", className)} {...props}>
      {children}
      {shortcut && <span className={menuShortcutClass}>{shortcut}</span>}
    </Menu.Item>
  );
}

export function ContextMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof Menu.SubTrigger>) {
  return (
    <Menu.SubTrigger className={cn(menuItemClass, className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </Menu.SubTrigger>
  );
}

export function ContextMenuSubContent({ className, ...props }: React.ComponentProps<typeof Menu.SubContent>) {
  return (
    <Menu.Portal>
      <Menu.SubContent className={cn(menuContentClass, className)} {...props} />
    </Menu.Portal>
  );
}

export function ContextMenuSeparator() {
  return <Menu.Separator className={menuSeparatorClass} />;
}
