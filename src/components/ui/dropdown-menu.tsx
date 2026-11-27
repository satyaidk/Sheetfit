import * as React from "react";
import { DropdownMenu as Menu } from "radix-ui";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  menuCheckItemClass,
  menuContentClass,
  menuItemClass,
  menuLabelClass,
  menuSeparatorClass,
  menuShortcutClass,
} from "./menu-styles";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuSub = Menu.Sub;
export const DropdownMenuRadioGroup = Menu.RadioGroup;

export function DropdownMenuContent({ className, ...props }: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content sideOffset={6} className={cn(menuContentClass, className)} {...props} />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
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

export function DropdownMenuCheckboxItem({
  className,
  shortcut,
  children,
  ...props
}: React.ComponentProps<typeof Menu.CheckboxItem> & { shortcut?: string }) {
  return (
    <Menu.CheckboxItem className={cn(menuCheckItemClass, className)} {...props}>
      <Menu.ItemIndicator className="absolute left-2 flex">
        <Check className="text-accent!" />
      </Menu.ItemIndicator>
      {children}
      {shortcut && <span className={menuShortcutClass}>{shortcut}</span>}
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(menuCheckItemClass, className)} {...props}>
      <Menu.ItemIndicator className="absolute left-2.5 flex">
        <Circle className="size-2! fill-current text-accent!" />
      </Menu.ItemIndicator>
      {children}
    </Menu.RadioItem>
  );
}

export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof Menu.SubTrigger>) {
  return (
    <Menu.SubTrigger className={cn(menuItemClass, className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </Menu.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof Menu.SubContent>) {
  return (
    <Menu.Portal>
      <Menu.SubContent sideOffset={4} className={cn(menuContentClass, className)} {...props} />
    </Menu.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn(menuLabelClass, className)} {...props} />;
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className={menuSeparatorClass} />;
}
