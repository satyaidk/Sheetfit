/**
 * Shared classes for every menu surface (dropdown, context menu, menu bar,
 * select), so all menus look and behave the same: raised surface, 16 px
 * shadow, neutral highlight, shortcuts right-aligned in caption size.
 */
export const menuContentClass =
  "z-50 min-w-48 rounded-lg bg-surface-raised p-1 text-ink shadow-pop ring-1 ring-line animate-pop";

export const menuItemClass =
  "relative flex h-(--control-h) cursor-default items-center gap-2 rounded-md px-2 text-body outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-subtle-2 data-[state=open]:bg-subtle-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-muted";

/** Items with a check or radio mark keep 28 px on the left for it. */
export const menuCheckItemClass = `${menuItemClass} pl-8`;

export const menuShortcutClass = "ml-auto pl-6 text-caption text-ink-faint";

export const menuLabelClass = "px-2 pt-2 pb-1 text-caption font-semibold text-ink-muted";

export const menuSeparatorClass = "my-1 h-px bg-line";
