/**
 * Keyboard shortcut labels. Shortcuts are written once, Windows-style
 * ("Ctrl Shift Z"), and shown the platform's way: "⌘⇧Z" on macOS, as
 * everyone on a Mac expects from native apps, and "Ctrl+Shift+Z" elsewhere.
 * `ariaShortcut` produces the `aria-keyshortcuts` value screen readers read.
 */

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const platform = data?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad/i.test(platform);
}

const MAC_SYMBOLS: Record<string, string> = { ctrl: "⌘", shift: "⇧", alt: "⌥", enter: "↩", delete: "⌫", esc: "Esc" };

/** "Ctrl Shift Z" -> "⌘⇧Z" (macOS) or "Ctrl+Shift+Z". */
export function displayShortcut(shortcut: string, mac = isMacPlatform()): string {
  const keys = shortcut.trim().split(/\s+/);
  if (!mac) return keys.join("+");
  return keys.map((k) => MAC_SYMBOLS[k.toLowerCase()] ?? k).join("");
}

const ARIA_KEYS: Record<string, string> = { ctrl: "Control", shift: "Shift", alt: "Alt", esc: "Escape", del: "Delete" };

/** "Ctrl Shift Z" -> "Control+Shift+Z" ("Meta" for Ctrl on macOS). */
export function ariaShortcut(shortcut: string, mac = isMacPlatform()): string {
  return shortcut
    .trim()
    .split(/\s+/)
    .map((k) => {
      const lower = k.toLowerCase();
      if (lower === "ctrl") return mac ? "Meta" : "Control";
      return ARIA_KEYS[lower] ?? k;
    })
    .join("+");
}
