"use client";

/**
 * Left icon rail and its single pinned panel (Canva's object panel).
 *
 * Clicking a tab opens its panel; clicking the active tab, the close button,
 * Esc inside the panel, or Ctrl+/ collapses it. Research found hover-opened
 * panels "too unstable" (Figma UI3), so panels open on click only. On small
 * screens the rail becomes a bottom tab bar and the panel a bottom sheet.
 */

import { ChevronsLeft, FolderOpen, Layers, Package, Palette, Upload, FileSliders, X } from "lucide-react";
import { useEditor, type SidebarTab } from "@/store/editor-store";
import { ProductsPanel } from "@/components/products/ProductsPanel";
import { DesignsPanel } from "@/components/products/DesignsPanel";
import { ImageUploader } from "@/components/uploads/ImageUploader";
import { SheetPanel } from "@/components/settings/SheetPanel";
import { LayersPanel } from "./LayersPanel";
import { ProjectsPanel } from "./ProjectsPanel";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const TABS: { id: SidebarTab; label: string; icon: React.ReactNode; title: string }[] = [
  { id: "products", label: "Products", icon: <Package />, title: "Product templates" },
  { id: "designs", label: "Designs", icon: <Palette />, title: "Sample designs" },
  { id: "uploads", label: "Uploads", icon: <Upload />, title: "Uploads" },
  { id: "layers", label: "Layers", icon: <Layers />, title: "Layers" },
  { id: "sheet", label: "Sheet", icon: <FileSliders />, title: "Sheet settings" },
  { id: "projects", label: "Projects", icon: <FolderOpen />, title: "Projects" },
];

export function SideRail({ horizontal = false, onPick }: { horizontal?: boolean; onPick?: (tab: SidebarTab) => void }) {
  const tab = useEditor((s) => s.sidebarTab);
  const panelOpen = useEditor((s) => s.panelOpen);
  const setTab = useEditor((s) => s.setSidebarTab);
  const setPanelOpen = useEditor((s) => s.setPanelOpen);
  const layerCount = useEditor((s) => s.doc.designs.length);

  return (
    <nav
      aria-label="Editor panels"
      className={cn(
        "flex shrink-0 bg-surface",
        horizontal
          ? "h-[60px] w-full items-stretch justify-around border-t border-line px-1 pb-[env(safe-area-inset-bottom)]"
          : "w-[72px] flex-col items-center gap-1 border-r border-line py-3",
      )}
    >
      {TABS.map((t) => {
        const active = t.id === tab && (panelOpen || horizontal);
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!horizontal && t.id === tab && panelOpen) setPanelOpen(false);
              else {
                setTab(t.id);
                setPanelOpen(true);
              }
              onPick?.(t.id);
            }}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              horizontal ? "flex-1" : "w-16 py-1.5",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-11 items-center justify-center rounded-lg transition-colors [&_svg]:size-[20px] [&_svg]:stroke-[1.75]",
                active ? "bg-accent-soft text-accent" : "group-hover:bg-subtle",
              )}
            >
              {t.icon}
            </span>
            {t.label}
            {t.id === "layers" && layerCount > 0 && (
              <span className="tnum absolute top-0.5 right-2 min-w-4 rounded-full bg-ink px-1 text-center text-[9.5px] leading-4 font-semibold text-white">
                {layerCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function SidePanelContent({ onClose }: { onClose?: () => void }) {
  const tab = useEditor((s) => s.sidebarTab);
  const setPanelOpen = useEditor((s) => s.setPanelOpen);
  const meta = TABS.find((t) => t.id === tab)!;
  const close = onClose ?? (() => setPanelOpen(false));
  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !(e.target as HTMLElement).closest("input")) close();
      }}
    >
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <h2 className="text-[15px] font-semibold tracking-tight">{meta.title}</h2>
        <Tooltip label={onClose ? "Close" : "Hide panel"} shortcut={onClose ? undefined : "Ctrl /"}>
          <button
            type="button"
            aria-label="Close panel"
            onClick={close}
            className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
          >
            {onClose ? <X className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </Tooltip>
      </div>
      <div key={tab} className="scroll-thin min-h-0 flex-1 overflow-y-auto animate-fade">
        {tab === "products" && <ProductsPanel />}
        {tab === "designs" && <DesignsPanel />}
        {tab === "uploads" && <ImageUploader />}
        {tab === "layers" && <LayersPanel />}
        {tab === "sheet" && <SheetPanel />}
        {tab === "projects" && <ProjectsPanel />}
      </div>
    </div>
  );
}
