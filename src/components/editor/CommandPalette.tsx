"use client";

/**
 * Command palette (Ctrl+K / Cmd+K): one search box for every action, product
 * template and sheet size, the pattern of VS Code, GitHub and Microsoft 365's
 * search. Keyboard first: type, move with the arrow keys, Enter runs, Escape
 * closes. Built as the WAI-ARIA combobox-with-listbox pattern, with the
 * number of results announced to screen readers.
 *
 * Commands come from `lib/commands/editor-commands.ts`, the same registry the
 * menu bar uses, so names, shortcuts and enabled states always match.
 */

import { useId, useMemo, useRef, useState } from "react";
import { Check, CornerDownLeft, Search } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEditor } from "@/store/editor-store";
import { usePreferences } from "@/store/preferences-store";
import { commandState, editorCommands, paletteCommands, type Command } from "@/lib/commands/editor-commands";
import { rankItems } from "@/lib/commands/fuzzy";
import { displayShortcut } from "@/lib/commands/shortcuts";
import { PRODUCTS } from "@/lib/catalogue/products";
import { SHEETS } from "@/lib/catalogue/sheets";
import { cn } from "@/lib/utils";

const RECENT_KEY = "sheetfit:recent-commands";
const RECENT_MAX = 5;
const RESULT_MAX = 60;

function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function rememberRecent(id: string) {
  try {
    const next = [id, ...loadRecent().filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Not remembered in a private window; the palette still works.
  }
}

/** Groups shown, in this order, when nothing has been typed yet. */
const BROWSE_GROUPS = ["File", "Edit", "View", "Sheet", "Arrange", "Pages", "Panels", "Help"] as const;

interface Row {
  command: Command;
  ranges: [number, number][];
  /** Section heading shown above this row (browse mode). */
  heading?: string;
}

export function CommandPalette() {
  const open = useEditor((s) => s.dialog === "commands");
  const setDialog = useEditor((s) => s.setDialog);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => setDialog(o ? "commands" : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim animate-fade" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 flex max-h-[min(560px,76vh)] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-lg bg-surface-raised text-ink shadow-dialog ring-1 ring-line outline-none animate-pop"
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          {open && <PaletteBody onDone={() => setDialog(null)} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PaletteBody({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  // Subscribe so enabled and checked states follow the editor while the palette is open.
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const theme = usePreferences((s) => s.theme);
  const density = usePreferences((s) => s.density);
  const [recent] = useState(loadRecent);

  const rows = useMemo<Row[]>(() => {
    void doc;
    void selection;
    void theme;
    void density;
    const state = commandState();
    if (query.trim()) {
      return rankItems(query, paletteCommands(state))
        .slice(0, RESULT_MAX)
        .map((r) => ({ command: r.item, ranges: r.ranges }));
    }
    const actions = editorCommands(state).filter((c) => c.enabled);
    const out: Row[] = [];
    const recentRows = recent.map((id) => actions.find((c) => c.id === id)).filter((c): c is Command => !!c);
    recentRows.forEach((command, i) => out.push({ command, ranges: [], heading: i === 0 ? "Recent" : undefined }));
    for (const g of BROWSE_GROUPS) {
      actions
        .filter((c) => c.group === g && !recentRows.includes(c))
        .forEach((command, i) => out.push({ command, ranges: [], heading: i === 0 ? g : undefined }));
    }
    return out;
  }, [query, recent, doc, selection, theme, density]);

  const current = Math.min(active, Math.max(0, rows.length - 1));
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const move = (to: number) => {
    if (rows.length === 0) return;
    const next = (to + rows.length) % rows.length;
    setActive(next);
    listRef.current?.querySelector(`#${CSS.escape(optionId(next))}`)?.scrollIntoView({ block: "nearest" });
  };

  const run = (row: Row | undefined) => {
    if (!row || !row.command.enabled) return;
    rememberRecent(row.command.id);
    onDone();
    row.command.run();
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={`${baseId}-list`}
          aria-activedescendant={rows.length ? optionId(current) : undefined}
          aria-autocomplete="list"
          aria-label="Search commands, product templates and sheet sizes"
          placeholder="Search actions, products and sheet sizes"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            listRef.current?.scrollTo({ top: 0 });
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              move(current + 1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              move(current - 1);
            } else if (e.key === "PageDown") {
              e.preventDefault();
              move(Math.min(rows.length - 1, current + 8));
            } else if (e.key === "PageUp") {
              e.preventDefault();
              move(Math.max(0, current - 8));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(rows[current]);
            }
          }}
          className="h-12 min-w-0 flex-1 bg-transparent text-subtitle text-ink outline-none placeholder:text-ink-faint"
        />
        <kbd className="hidden rounded border border-line-strong px-1.5 text-caption text-ink-muted sm:inline">Esc</kbd>
      </div>

      <div ref={listRef} id={`${baseId}-list`} role="listbox" aria-label="Commands" className="scroll-thin min-h-0 flex-1 overflow-y-auto p-1.5">
        {rows.length === 0 && (
          <p className="px-3 py-8 text-center text-body text-ink-muted">
            Nothing matches “{query.trim()}”. Try a product (“mug”), a sheet (“A3”) or an action (“fill”).
          </p>
        )}
        {rows.map((row, i) => (
          <div key={row.command.id} role="presentation">
            {row.heading && (
              <div role="presentation" className="px-2.5 pt-3 pb-1 text-caption font-semibold text-ink-muted first:pt-1">
                {row.heading}
              </div>
            )}
            <div
              id={optionId(i)}
              role="option"
              aria-selected={i === current}
              aria-disabled={!row.command.enabled || undefined}
              onPointerMove={() => i !== current && setActive(i)}
              onClick={() => run(row)}
              className={cn(
                "flex min-h-(--control-h-lg) cursor-default items-center gap-3 rounded-md px-2.5 py-1.5",
                i === current && "bg-subtle-2",
                row.command.danger && "text-danger",
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center text-accent" aria-hidden>
                {row.command.checked && <Check className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">
                  <Highlighted text={row.command.title} ranges={row.ranges} />
                </span>
                {row.command.hint && <span className="block truncate text-caption text-ink-muted">{row.command.hint}</span>}
              </span>
              {query.trim() && <span className="shrink-0 text-caption text-ink-muted">{row.command.group}</span>}
              {row.command.shortcut && (
                <kbd className="shrink-0 rounded border border-line-strong bg-subtle px-1.5 font-sans text-caption text-ink-muted">
                  {displayShortcut(row.command.shortcut)}
                </kbd>
              )}
              {i === current && <CornerDownLeft className="size-3.5 shrink-0 text-ink-muted" aria-hidden />}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-caption text-ink-muted">
        <span aria-live="polite">
          {query.trim() ? `${rows.length} ${rows.length === 1 ? "result" : "results"}` : `Type to search ${PRODUCTS.length} product templates and ${SHEETS.length} sheet sizes`}
        </span>
        <span className="hidden items-center gap-3 sm:flex">
          <span>↑↓ to move</span>
          <span>Enter to run</span>
        </span>
      </div>
    </>
  );
}

function Highlighted({ text, ranges }: { text: string; ranges: [number, number][] }) {
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([a, b], i) => {
    if (a > at) parts.push(text.slice(at, a));
    parts.push(
      <mark key={i} className="rounded-[2px] bg-transparent font-semibold text-accent">
        {text.slice(a, b)}
      </mark>,
    );
    at = b;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
