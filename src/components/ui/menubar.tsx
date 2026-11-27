import * as React from "react";
import { Menubar as Bar } from "radix-ui";
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

/**
 * Application menu bar (WAI-ARIA menubar: one Tab stop, Left/Right between
 * menus, Down to open, type-ahead inside), the File / Edit / View pattern of
 * desktop and web office apps. Built on Radix Menubar.
 */
export function Menubar({ className, ...props }: React.ComponentProps<typeof Bar.Root>) {
  return <Bar.Root className={cn("flex items-center gap-0.5", className)} {...props} />;
}

export const MenubarMenu = Bar.Menu;
export const MenubarSub = Bar.Sub;
export const MenubarRadioGroup = Bar.RadioGroup;

export function MenubarTrigger({ className, ...props }: React.ComponentProps<typeof Bar.Trigger>) {
  return (
    <Bar.Trigger
      className={cn(
        "flex h-7 cursor-default items-center rounded-md px-2 text-body text-ink outline-none select-none hover:bg-subtle-2 focus-visible:bg-subtle-2 data-[state=open]:bg-subtle-2",
        className,
      )}
      {...props}
    />
  );
}

export function MenubarContent({ className, ...props }: React.ComponentProps<typeof Bar.Content>) {
  return (
    <Bar.Portal>
      <Bar.Content align="start" sideOffset={6} className={cn(menuContentClass, "min-w-60", className)} {...props} />
    </Bar.Portal>
  );
}

export function MenubarItem({
  className,
  shortcut,
  danger,
  children,
  ...props
}: React.ComponentProps<typeof Bar.Item> & { shortcut?: string; danger?: boolean }) {
  return (
    <Bar.Item className={cn(menuItemClass, danger && "text-danger [&_svg]:text-danger", className)} {...props}>
      {children}
      {shortcut && <span className={menuShortcutClass}>{shortcut}</span>}
    </Bar.Item>
  );
}

export function MenubarCheckboxItem({
  className,
  shortcut,
  children,
  ...props
}: React.ComponentProps<typeof Bar.CheckboxItem> & { shortcut?: string }) {
  return (
    <Bar.CheckboxItem className={cn(menuCheckItemClass, className)} {...props}>
      <Bar.ItemIndicator className="absolute left-2 flex">
        <Check className="text-accent!" />
      </Bar.ItemIndicator>
      {children}
      {shortcut && <span className={menuShortcutClass}>{shortcut}</span>}
    </Bar.CheckboxItem>
  );
}

export function MenubarRadioItem({ className, children, ...props }: React.ComponentProps<typeof Bar.RadioItem>) {
  return (
    <Bar.RadioItem className={cn(menuCheckItemClass, className)} {...props}>
      <Bar.ItemIndicator className="absolute left-2.5 flex">
        <Circle className="size-2! fill-current text-accent!" />
      </Bar.ItemIndicator>
      {children}
    </Bar.RadioItem>
  );
}

export function MenubarSubTrigger({ className, children, ...props }: React.ComponentProps<typeof Bar.SubTrigger>) {
  return (
    <Bar.SubTrigger className={cn(menuItemClass, className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </Bar.SubTrigger>
  );
}

export function MenubarSubContent({ className, ...props }: React.ComponentProps<typeof Bar.SubContent>) {
  return (
    <Bar.Portal>
      <Bar.SubContent sideOffset={4} className={cn(menuContentClass, className)} {...props} />
    </Bar.Portal>
  );
}

export function MenubarLabel({ className, ...props }: React.ComponentProps<typeof Bar.Label>) {
  return <Bar.Label className={cn(menuLabelClass, className)} {...props} />;
}

export function MenubarSeparator() {
  return <Bar.Separator className={menuSeparatorClass} />;
}
