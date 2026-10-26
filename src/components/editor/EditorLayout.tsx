"use client";

/**
 * Editor shell.
 *
 * Desktop: top bar, icon rail + panel on the left, workspace in the centre,
 * properties on the right, status bar at the bottom.
 * Mobile: the workspace fills the screen, the rail becomes a bottom tab bar,
 * and both panels open as sheets over the workspace.
 */

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { TopToolbar } from "./TopToolbar";
import { SidebarPanel, SidebarRail } from "./LeftSidebar";
import { CanvasWorkspace } from "./CanvasWorkspace";
import { PropertiesPanel } from "./PropertiesPanel";
import { BottomBar } from "./BottomBar";
import { ZoomControls } from "./ZoomControls";
import { ExportDialog } from "@/components/export/ExportDialog";
import { useEditorShortcuts } from "./use-editor-shortcuts";
import { loadSampleSheet } from "@/lib/sample";

export default function EditorLayout() {
  useEditorShortcuts();
  const [leftOpen, setLeftOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const selectionCount = useEditor((s) => s.selection.length);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("sample")) void loadSampleSheet();
  }, []);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <TopToolbar />
        <div className="relative flex min-h-0 flex-1">
          <div className="hidden md:flex">
            <SidebarRail />
            <aside aria-label="Panel" className="w-[284px] shrink-0 border-r border-line bg-chrome">
              <SidebarPanel />
            </aside>
          </div>

          <main className="relative min-w-0 flex-1">
            <CanvasWorkspace />
            <div className="absolute top-8 right-3 z-20 md:hidden">
              <ZoomControls />
            </div>
            {selectionCount > 0 && (
              <Button
                variant="dark"
                className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 shadow-lg lg:hidden"
                onClick={() => setPropsOpen(true)}
              >
                <SlidersHorizontal />
                Edit {selectionCount > 1 ? `${selectionCount} designs` : "design"}
              </Button>
            )}
          </main>

          <aside aria-label="Properties" className="hidden w-[312px] shrink-0 overflow-y-auto border-l border-line bg-chrome lg:block">
            <PropertiesPanel />
          </aside>

          {leftOpen && (
            <MobileSheet onClose={() => setLeftOpen(false)} className="md:hidden">
              <SidebarPanel onClose={() => setLeftOpen(false)} />
            </MobileSheet>
          )}
          {propsOpen && (
            <MobileSheet onClose={() => setPropsOpen(false)} className="lg:hidden">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
                <h2 className="font-condensed text-[17px] font-semibold">Properties</h2>
                <Button size="icon-sm" variant="ghost" aria-label="Close properties" onClick={() => setPropsOpen(false)}>
                  <X />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PropertiesPanel />
              </div>
            </MobileSheet>
          )}
        </div>
        <div className="md:hidden">
          <SidebarRail orientation="horizontal" onPick={() => setLeftOpen(true)} />
        </div>
        <BottomBar />
        <ExportDialog />
      </div>
    </TooltipProvider>
  );
}

function MobileSheet({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className={`absolute inset-0 z-40 flex flex-col justify-end ${className ?? ""}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0d1a15]/40" onClick={onClose} />
      <div className="relative flex max-h-[78%] min-h-[40%] flex-col rounded-t-xl border-t border-line bg-chrome shadow-2xl">
        {children}
      </div>
    </div>
  );
}
