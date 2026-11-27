"use client";

/**
 * Editor shell (see ADR 0021 and ADR 0023).
 *
 * Desktop: the header (title, menu bar, search, page settings, Download); the
 * icon rail and one resizable panel on the left; the canvas with the quick
 * actions bar and the floating selection pill; the resizable properties
 * inspector on the right while something is selected; the status bar. Below
 * 1280 px only one side panel shows at a time (the last one asked for), so
 * the canvas keeps its room. Below 1024 px the inspector and below 768 px the
 * side panel become bottom sheets, and the rail becomes a bottom tab bar.
 * Landmarks: banner, navigation, complementary panels, main, contentinfo,
 * and a skip link to the canvas.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { usePreferences, watchPreferences } from "@/store/preferences-store";
import { clampPanelWidth, defaultPanelWidth, PANEL_LIMITS, MIN_CANVAS_WIDTH, type PanelKind } from "@/lib/preferences";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./Header";
import { SidePanelContent, SideRail } from "./SidePanel";
import { CanvasWorkspace } from "./CanvasWorkspace";
import { QuickActionsBar } from "./QuickActionsBar";
import { FloatingPill } from "./FloatingPill";
import { PagesBar } from "./PagesBar";
import { MockupDialog } from "@/components/products/MockupPreview";
import { LivePreviewDock } from "@/components/products/LivePreviewDock";
import { LeaveDialog } from "./LeaveDialog";
import { Product3DDialog } from "@/components/products/Product3DDialog";
import { PropertiesPanel } from "./PropertiesPanel";
import { Footer } from "./Footer";
import { StartDialog, ONBOARDED_KEY } from "./StartDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { CommandPalette } from "./CommandPalette";
import { ResizeHandle } from "./ResizeHandle";
import { SheetDialog } from "@/components/settings/SheetDialog";
import { ExportDialog } from "@/components/export/ExportDialog";
import { ArrangeDialog } from "./ArrangeDialog";
import { StripDialog } from "@/components/settings/StripDialog";
import { useEditorShortcuts } from "./use-editor-shortcuts";
import { useStickerOutlines } from "./use-sticker-outlines";
import { loadSampleSheet } from "@/lib/sample";
import { parseEditorLink } from "@/lib/editor-link";
import { hasWorkToLose, openProductDesign, requestProduct } from "@/lib/editor-actions";

/**
 * True while the viewport is narrower than `px`. Panels are mounted for one
 * layout only: rendering the desktop panel and the hidden mobile sheet side by
 * side doubled the work (two product grids) and confused focus and tests.
 */
function useNarrower(px: number) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(`(max-width: ${px - 0.02}px)`);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(`(max-width: ${px - 0.02}px)`).matches,
    () => false,
  );
}

function useWindowWidth() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      return () => window.removeEventListener("resize", onChange);
    },
    () => window.innerWidth,
    () => 1440,
  );
}

/** Rail width in CSS px for the current density (the CSS variable `--rail-w`). */
const RAIL_PX = { comfortable: 72, compact: 64 } as const;

export default function EditorLayout() {
  useEditorShortcuts();
  useStickerOutlines();
  useEffect(() => watchPreferences(), []);
  const phone = useNarrower(768);
  const tablet = useNarrower(1024);
  const panelOpen = useEditor((s) => s.panelOpen);
  const inspectorOpen = useEditor((s) => s.inspectorOpen);
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const setPanelOpen = useEditor((s) => s.setPanelOpen);
  const setInspectorOpen = useEditor((s) => s.setInspectorOpen);

  useEffect(() => {
    const s = useEditor.getState();
    // Small screens start with the canvas unobstructed.
    if (window.innerWidth < 1024) s.setInspectorOpen(false);
    if (window.innerWidth < 768) s.setPanelOpen(false);
    // Links from the home page: the sample project or a product template.
    const link = parseEditorLink(window.location.search);
    if (link.kind === "sample") {
      void loadSampleSheet();
      return;
    }
    if (link.kind === "product") {
      if (hasWorkToLose()) requestProduct(link.productId);
      else openProductDesign(link.productId, { process: link.process });
      return;
    }
    let onboarded = false;
    try {
      onboarded = localStorage.getItem(ONBOARDED_KEY) === "1";
    } catch {
      onboarded = true;
    }
    if (!onboarded && s.doc.designs.length === 0) s.setDialog("start");
  }, []);

  // Below 1280 px there is room for one side panel next to the canvas, not
  // two: selecting a design brings up the inspector (and folds the left
  // panel); opening the left panel hides the inspector until the next pick.
  const compact = useNarrower(1280);
  const selectionKey = useEditor((s) => s.selection.join(","));
  const lastSelection = useRef(selectionKey);
  useEffect(() => {
    const changed = selectionKey !== lastSelection.current;
    lastSelection.current = selectionKey;
    if (compact && changed && selectionKey && useEditor.getState().inspectorOpen && useEditor.getState().panelOpen) setPanelOpen(false);
  }, [selectionKey, compact, setPanelOpen]);
  const showInspector = inspectorOpen && hasSelection && !(compact && panelOpen);

  // Panel widths: the user's (saved) or the default for this window, always
  // leaving the canvas at least MIN_CANVAS_WIDTH.
  const windowWidth = useWindowWidth();
  const density = usePreferences((s) => s.density);
  const savedSide = usePreferences((s) => s.sidePanelWidth);
  const savedInspector = usePreferences((s) => s.inspectorWidth);
  const rail = RAIL_PX[density];
  const sideShown = panelOpen && !phone;
  const inspectorShown = showInspector && !tablet;
  const sideBase = savedSide ?? defaultPanelWidth("side", windowWidth);
  const inspectorBase = savedInspector ?? defaultPanelWidth("inspector", windowWidth);
  const sideWidth = clampPanelWidth("side", sideBase, windowWidth, rail + (inspectorShown ? inspectorBase : 0));
  const inspectorWidth = clampPanelWidth("inspector", inspectorBase, windowWidth, rail + (sideShown ? sideWidth : 0));
  const maxFor = (kind: PanelKind) => {
    const others = rail + (kind === "side" ? (inspectorShown ? inspectorWidth : 0) : sideShown ? sideWidth : 0);
    return Math.max(PANEL_LIMITS[kind].min, Math.min(PANEL_LIMITS[kind].max, windowWidth - others - MIN_CANVAS_WIDTH));
  };
  const live = (kind: PanelKind) => (w: number) =>
    usePreferences.setState(kind === "side" ? { sidePanelWidth: w } : { inspectorWidth: w });
  const commit = (kind: PanelKind) => (w: number) => usePreferences.getState().setPanelWidth(kind, w);
  const reset = (kind: PanelKind) => () => usePreferences.getState().setPanelWidth(kind, null);

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={150}>
      <div className="flex h-dvh flex-col overflow-hidden bg-surface text-ink">
        <a href="#sheet-canvas" className="skip-link">
          Skip to the sheet
        </a>
        <Header />
        <div className="relative flex min-h-0 flex-1">
          <div className="hidden md:flex">
            <SideRail />
            {sideShown && (
              <aside
                aria-label="Side panel"
                style={{ width: sideWidth }}
                className="relative shrink-0 border-r border-line bg-surface animate-panel"
              >
                <SidePanelContent />
                <ResizeHandle
                  label="Resize side panel"
                  edge="right"
                  width={sideWidth}
                  min={PANEL_LIMITS.side.min}
                  max={maxFor("side")}
                  onResize={live("side")}
                  onCommit={commit("side")}
                  onReset={reset("side")}
                />
              </aside>
            )}
          </div>

          <main className="@container relative min-w-0 flex-1">
            <CanvasWorkspace />
            <QuickActionsBar />
            <FloatingPill />
            <PagesBar />
            <LivePreviewDock />
          </main>

          {inspectorShown && (
            <aside
              aria-label="Properties"
              style={{ width: inspectorWidth }}
              className="relative hidden shrink-0 border-l border-line bg-surface lg:block"
            >
              <div className="scroll-thin h-full overflow-y-auto [scroll-padding-top:calc(var(--inspector-sticky,48px)+var(--control-h-lg)+8px)]">
                <InspectorHeader onClose={() => setInspectorOpen(false)} />
                <PropertiesPanel />
              </div>
              <ResizeHandle
                label="Resize properties panel"
                edge="left"
                width={inspectorWidth}
                min={PANEL_LIMITS.inspector.min}
                max={maxFor("inspector")}
                onResize={live("inspector")}
                onCommit={commit("inspector")}
                onReset={reset("inspector")}
              />
            </aside>
          )}

          {panelOpen && phone && (
            <MobileSheet className="md:hidden" label="Side panel" onClose={() => setPanelOpen(false)}>
              <SidePanelContent onClose={() => setPanelOpen(false)} />
            </MobileSheet>
          )}
          {showInspector && tablet && (
            <MobileSheet className="lg:hidden" label="Properties" onClose={() => setInspectorOpen(false)}>
              <InspectorHeader onClose={() => setInspectorOpen(false)} />
              <div className="scroll-thin min-h-0 flex-1 overflow-y-auto [--inspector-sticky:0px] [scroll-padding-top:calc(var(--control-h-lg)+8px)]">
                <PropertiesPanel />
              </div>
            </MobileSheet>
          )}
        </div>
        <div className="md:hidden">
          <SideRail horizontal />
        </div>
        <Footer />
        <ExportDialog />
        <ArrangeDialog />
        <StripDialog />
        <SheetDialog />
        <StartDialog />
        <ShortcutsDialog />
        <CommandPalette />
        <MockupDialog />
        <LeaveDialog />
        <Product3DDialog />
      </div>
    </TooltipProvider>
  );
}

function InspectorHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-line bg-surface px-(--panel-pad)">
      <h2 className="text-subtitle font-semibold tracking-tight">Properties</h2>
      <button
        type="button"
        aria-label="Close properties"
        onClick={onClose}
        className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-subtle-2 hover:text-ink"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function MobileSheet({
  children,
  onClose,
  className,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  label: string;
}) {
  return (
    <div className={`absolute inset-0 z-40 flex flex-col justify-end ${className ?? ""}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-scrim animate-fade" onClick={onClose} />
      <section
        aria-label={label}
        className="relative flex max-h-[85%] min-h-[45%] flex-col rounded-t-2xl bg-surface shadow-dialog animate-up"
      >
        <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden />
        {children}
      </section>
    </div>
  );
}
