"use client";

/**
 * Editor shell (Canva structure, see AGENTS.md section 6).
 *
 * Desktop: header; icon rail + one pinned panel on the left; the canvas with
 * the quick-actions bar and the floating selection pill; the properties
 * inspector on the right while something is selected; footer with zoom.
 * Below 1024 px the inspector and below 768 px the side panel become bottom
 * sheets, and the rail becomes a bottom tab bar.
 */

import { useEffect, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useEditor } from "@/store/editor-store";
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
import { SheetDialog } from "@/components/settings/SheetDialog";
import { ExportDialog } from "@/components/export/ExportDialog";
import { useEditorShortcuts } from "./use-editor-shortcuts";
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

export default function EditorLayout() {
  useEditorShortcuts();
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

  const showInspector = inspectorOpen && hasSelection;

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={150}>
      <div className="flex h-dvh flex-col overflow-hidden bg-surface">
        <Header />
        <div className="relative flex min-h-0 flex-1">
          <div className="hidden md:flex">
            <SideRail />
            {panelOpen && !phone && (
              <aside aria-label="Side panel" className="w-[360px] shrink-0 border-r border-line bg-surface animate-panel">
                <SidePanelContent />
              </aside>
            )}
          </div>

          <main className="relative min-w-0 flex-1">
            <CanvasWorkspace />
            <QuickActionsBar />
            <FloatingPill />
            <PagesBar />
            <LivePreviewDock />
          </main>

          {showInspector && !tablet && (
            <aside aria-label="Properties" className="scroll-thin hidden w-[312px] shrink-0 overflow-y-auto border-l border-line bg-surface lg:block">
              <InspectorHeader onClose={() => setInspectorOpen(false)} />
              <PropertiesPanel />
            </aside>
          )}

          {panelOpen && phone && (
            <MobileSheet className="md:hidden" onClose={() => setPanelOpen(false)}>
              <SidePanelContent onClose={() => setPanelOpen(false)} />
            </MobileSheet>
          )}
          {showInspector && tablet && (
            <MobileSheet className="lg:hidden" onClose={() => setInspectorOpen(false)}>
              <InspectorHeader onClose={() => setInspectorOpen(false)} />
              <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
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
        <SheetDialog />
        <StartDialog />
        <ShortcutsDialog />
        <MockupDialog />
        <LeaveDialog />
        <Product3DDialog />
      </div>
    </TooltipProvider>
  );
}

function InspectorHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-line bg-surface px-4">
      <h2 className="text-[15px] font-semibold tracking-tight">Properties</h2>
      <button
        type="button"
        aria-label="Close properties"
        onClick={onClose}
        className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function MobileSheet({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className={`absolute inset-0 z-40 flex flex-col justify-end ${className ?? ""}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[rgb(16_24_40/0.32)] animate-fade" onClick={onClose} />
      <div className="relative flex max-h-[85%] min-h-[45%] flex-col rounded-t-2xl bg-surface shadow-pop animate-up">
        <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden />
        {children}
      </div>
    </div>
  );
}
