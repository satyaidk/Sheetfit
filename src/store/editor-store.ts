/**
 * Editor state.
 *
 * The store separates three kinds of state:
 *
 * - `doc`      The printable document (page settings + designs). Every change
 *              that the user would expect to undo goes through `commit`, which
 *              records the previous document on the undo stack.
 * - `assets`   Decoded source images keyed by id. They are not part of undo
 *              history: undoing a placement should not "un-upload" a file.
 * - UI state   Selection, zoom, units, panels. Never persisted in history.
 *
 * Geometry rules live in `lib/`; the store only orchestrates them, which keeps
 * the rules testable without React.
 */

import { create } from "zustand";
import type { AlignX, AlignY, Design, EditorDocument, FitMode, PageSettings, Unit } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { createId } from "@/lib/id";
import { croppedSourceSize, fitContain, normalizeBox, resizeBox, type Size } from "@/lib/image/image-fit";
import { centerIn, clampIntoRect, pageRect, pageSize, printableRect, uniformMargins } from "@/lib/layout/a4-layout";
import { CSS_DPI, MM_PER_INCH } from "@/lib/layout/coordinate-conversion";
import { alignGroup, unionBounds, type AlignTarget } from "@/lib/layout/alignment";
import { designBounds } from "@/lib/layout/a4-layout";
import {
  applyPlacements,
  arrangeGrid,
  packItemsFor,
  packShelves,
  suggestLayoutFixes,
  type LayoutGap,
} from "@/lib/layout/auto-arrange";
import { maxPrintSizeAt } from "@/lib/image/image-resolution";

const HISTORY_LIMIT = 100;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
/** Screen pixels per millimetre at 100% zoom (CSS assumes 96 px per inch). */
export const PX_PER_MM = CSS_DPI / MM_PER_INCH;
/** Width of the workspace rulers, in screen pixels. */
export const RULER_PX = 22;

export const DEFAULT_PAGE: PageSettings = {
  paper: "A4",
  orientation: "portrait",
  margins: uniformMargins(5),
  background: "#ffffff",
  dpi: 300,
  showGrid: false,
  snapToGrid: false,
  gridSize: 5,
  snapToGuides: true,
  constrainToPrintable: true,
  cropMarks: false,
};

export function emptyDocument(): EditorDocument {
  return { page: structuredClone(DEFAULT_PAGE), designs: [] };
}

export type SidebarTab = "uploads" | "designs" | "page" | "background" | "guides" | "projects";

export interface LayoutReport {
  placed: number;
  unplaced: number;
  suggestions: string[];
}

export interface EditorState {
  doc: EditorDocument;
  assets: Record<string, LoadedAsset>;
  selection: string[];
  past: EditorDocument[];
  future: EditorDocument[];
  clipboard: Design[];
  project: { id: string; name: string; savedAt: number | null; dirty: boolean; createdAt: number };
  unit: Unit;
  /** 1 = actual size on a 96 DPI display. */
  zoom: number;
  /** Screen position of the page's top-left corner inside the viewport. */
  pan: { x: number; y: number };
  viewport: { width: number; height: number };
  sidebarTab: SidebarTab;
  layoutGap: LayoutGap;
  lastLayoutReport: LayoutReport | null;
  dialog: "export" | "print" | null;

  commit: (next: EditorDocument) => void;
  undo: () => void;
  redo: () => void;

  addAsset: (asset: LoadedAsset) => void;
  placeAsset: (assetId: string, size?: Size) => string | null;
  replaceAsset: (designId: string, asset: LoadedAsset) => void;
  removeUnusedAssets: () => void;

  updateDesign: (id: string, patch: Partial<Design>) => void;
  resizeDesign: (id: string, size: Partial<Size>) => void;
  setFitMode: (id: string, mode: FitMode) => void;
  resetDesign: (id: string) => void;
  moveDesigns: (moves: { id: string; x: number; y: number; rotation?: number; width?: number; height?: number }[]) => void;
  nudgeSelection: (dx: number, dy: number) => void;

  select: (ids: string[], mode?: "replace" | "toggle" | "add") => void;
  selectAll: () => void;
  clearSelection: () => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  copySelection: () => void;
  paste: () => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
  bringForward: (id: string, toEdge?: boolean) => void;
  sendBackward: (id: string, toEdge?: boolean) => void;

  alignSelection: (target: AlignTarget, relativeTo: "printable" | "page" | "selection") => void;
  centerSelection: () => void;
  repeatDesign: (id: string, copies: number) => LayoutReport;
  autoArrange: (scope: "all" | "selection") => LayoutReport;

  setPage: (patch: Partial<PageSettings>) => void;
  setUnit: (unit: Unit) => void;
  setViewport: (size: { width: number; height: number }) => void;
  setPan: (pan: { x: number; y: number }) => void;
  /** Zoom to `zoom`, keeping the screen point `anchor` fixed (default: centre). */
  zoomTo: (zoom: number, anchor?: { x: number; y: number }) => void;
  fitPage: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setLayoutGap: (gap: LayoutGap) => void;
  setDialog: (dialog: EditorState["dialog"]) => void;

  setProjectName: (name: string) => void;
  markSaved: (at: number) => void;
  loadState: (input: { doc: EditorDocument; assets: Record<string, LoadedAsset>; project: EditorState["project"] }) => void;
  newProject: () => void;
}

function assetSource(asset: LoadedAsset, design?: Pick<Design, "crop">): Size {
  return croppedSourceSize(
    { width: asset.naturalWidth, height: asset.naturalHeight },
    design?.crop ?? null,
  );
}

function newProjectMeta(): EditorState["project"] {
  return { id: createId("project"), name: "Untitled sheet", savedAt: null, dirty: false, createdAt: Date.now() };
}

/** Expand a selection to include every member of any selected group. */
function expandGroups(designs: Design[], ids: string[]): string[] {
  const groups = new Set(designs.filter((d) => ids.includes(d.id) && d.groupId).map((d) => d.groupId));
  const out = new Set(ids);
  for (const d of designs) if (d.groupId && groups.has(d.groupId)) out.add(d.id);
  return [...out];
}

/** Default print size: native size at 300 DPI, kept within the printable area. */
export function defaultPrintSize(asset: LoadedAsset, printable: Size): Size {
  const native = maxPrintSizeAt({ width: asset.naturalWidth, height: asset.naturalHeight }, 300);
  const capped = fitContain(native, {
    width: Math.min(native.width, printable.width),
    height: Math.min(native.height, printable.height),
  });
  const longest = Math.max(capped.width, capped.height);
  if (longest >= 30) return capped;
  // Very small sources would land as postage stamps; start them at 30 mm.
  return fitContain(native, { width: 30, height: 30 });
}

export const useEditor = create<EditorState>()((set, get) => {
  /** Apply a document change with undo history and the dirty flag. */
  const commitDoc = (next: EditorDocument) =>
    set((s) => ({
      doc: next,
      past: [...s.past, s.doc].slice(-HISTORY_LIMIT),
      future: [],
      project: { ...s.project, dirty: true },
    }));

  const mapDesigns = (fn: (d: Design) => Design) => {
    const { doc } = get();
    commitDoc({ ...doc, designs: doc.designs.map(fn) });
  };

  const normalize = (d: Design): Design => {
    const asset = get().assets[d.assetId];
    if (!asset) return d;
    return { ...d, ...normalizeBox(d, assetSource(asset, d)) };
  };

  const constrain = (d: Design): Design => {
    const { page } = get().doc;
    return page.constrainToPrintable ? clampIntoRect(d, printableRect(page)) : d;
  };

  return {
    doc: emptyDocument(),
    assets: {},
    selection: [],
    past: [],
    future: [],
    clipboard: [],
    project: newProjectMeta(),
    unit: "mm",
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewport: { width: 0, height: 0 },
    sidebarTab: "uploads",
    layoutGap: { x: 5, y: 5 },
    lastLayoutReport: null,
    dialog: null,

    commit: commitDoc,

    undo: () =>
      set((s) => {
        const prev = s.past[s.past.length - 1];
        if (!prev) return s;
        const ids = new Set(prev.designs.map((d) => d.id));
        return {
          doc: prev,
          past: s.past.slice(0, -1),
          future: [s.doc, ...s.future],
          selection: s.selection.filter((id) => ids.has(id)),
          project: { ...s.project, dirty: true },
        };
      }),

    redo: () =>
      set((s) => {
        const next = s.future[0];
        if (!next) return s;
        const ids = new Set(next.designs.map((d) => d.id));
        return {
          doc: next,
          past: [...s.past, s.doc],
          future: s.future.slice(1),
          selection: s.selection.filter((id) => ids.has(id)),
          project: { ...s.project, dirty: true },
        };
      }),

    addAsset: (asset) => set((s) => ({ assets: { ...s.assets, [asset.id]: asset } })),

    placeAsset: (assetId, size) => {
      const { assets, doc } = get();
      const asset = assets[assetId];
      if (!asset) return null;
      const printable = printableRect(doc.page);
      const box = size ?? defaultPrintSize(asset, printable);
      const offset = (doc.designs.length % 8) * 5;
      const base: Design = {
        id: createId("design"),
        name: asset.name.replace(/\.[^.]+$/, ""),
        assetId,
        x: 0,
        y: 0,
        width: box.width,
        height: box.height,
        rotation: 0,
        fitMode: "contain",
        alignX: "center",
        alignY: "center",
        padding: 0,
        fillColor: null,
        // An explicit box with a different shape than the image is intentional.
        lockAspect:
          !size ||
          Math.abs(size.width / size.height / (asset.naturalWidth / asset.naturalHeight) - 1) < 0.005,
        border: false,
        crop: null,
        groupId: null,
        locked: false,
      };
      const centred = centerIn(base, printable);
      const design = constrain({ ...centred, x: centred.x + offset, y: centred.y + offset });
      commitDoc({ ...doc, designs: [...doc.designs, design] });
      set({ selection: [design.id] });
      return design.id;
    },

    replaceAsset: (designId, asset) => {
      get().addAsset(asset);
      // Keep the box, position and page setup; only the picture changes.
      mapDesigns((d) => (d.id === designId ? normalize({ ...d, assetId: asset.id, crop: null }) : d));
    },

    removeUnusedAssets: () =>
      set((s) => {
        const used = new Set([...s.doc.designs, ...s.past.flatMap((d) => d.designs)].map((d) => d.assetId));
        const kept: Record<string, LoadedAsset> = {};
        for (const [id, a] of Object.entries(s.assets)) {
          if (used.has(id)) kept[id] = a;
          else URL.revokeObjectURL(a.objectUrl);
        }
        return { assets: kept };
      }),

    updateDesign: (id, patch) => mapDesigns((d) => (d.id === id ? normalize({ ...d, ...patch }) : d)),

    resizeDesign: (id, size) =>
      mapDesigns((d) => {
        if (d.id !== id) return d;
        const asset = get().assets[d.assetId];
        if (!asset) return d;
        // Keep the box centre fixed so typed sizes grow around the middle.
        const next = resizeBox(d, assetSource(asset, d), size);
        const cx = d.x + d.width / 2;
        const cy = d.y + d.height / 2;
        return normalize({ ...d, ...next, x: cx - next.width / 2, y: cy - next.height / 2 });
      }),

    setFitMode: (id, mode) =>
      mapDesigns((d) => {
        if (d.id !== id) return d;
        const lockAspect = mode === "stretch" ? false : mode === "manual" ? true : d.lockAspect;
        return normalize({ ...d, fitMode: mode, lockAspect });
      }),

    resetDesign: (id) =>
      mapDesigns((d) => {
        if (d.id !== id) return d;
        const asset = get().assets[d.assetId];
        if (!asset) return d;
        const source = { width: asset.naturalWidth, height: asset.naturalHeight };
        const box = fitContain(source, { width: d.width, height: d.height });
        const cx = d.x + d.width / 2;
        const cy = d.y + d.height / 2;
        return {
          ...d,
          ...box,
          x: cx - box.width / 2,
          y: cy - box.height / 2,
          rotation: 0,
          fitMode: "contain",
          alignX: "center" as AlignX,
          alignY: "center" as AlignY,
          padding: 0,
          crop: null,
          lockAspect: true,
        };
      }),

    moveDesigns: (moves) => {
      const byId = new Map(moves.map((m) => [m.id, m]));
      mapDesigns((d) => {
        const m = byId.get(d.id);
        if (!m) return d;
        return normalize({ ...d, ...m });
      });
    },

    nudgeSelection: (dx, dy) => {
      const { selection } = get();
      if (selection.length === 0) return;
      mapDesigns((d) => (selection.includes(d.id) && !d.locked ? constrain({ ...d, x: d.x + dx, y: d.y + dy }) : d));
    },

    select: (ids, mode = "replace") =>
      set((s) => {
        const expanded = expandGroups(s.doc.designs, ids);
        if (mode === "replace") return { selection: expanded };
        if (mode === "add") return { selection: [...new Set([...s.selection, ...expanded])] };
        const allSelected = expanded.every((id) => s.selection.includes(id));
        return {
          selection: allSelected
            ? s.selection.filter((id) => !expanded.includes(id))
            : [...new Set([...s.selection, ...expanded])],
        };
      }),

    selectAll: () => set((s) => ({ selection: s.doc.designs.map((d) => d.id) })),
    clearSelection: () => set({ selection: [] }),

    deleteSelection: () => {
      const { doc, selection } = get();
      if (selection.length === 0) return;
      commitDoc({ ...doc, designs: doc.designs.filter((d) => !selection.includes(d.id)) });
      set({ selection: [] });
    },

    duplicateSelection: () => {
      const { doc, selection } = get();
      const picked = doc.designs.filter((d) => selection.includes(d.id));
      if (picked.length === 0) return;
      const groupMap = new Map<string, string>();
      const copies = picked.map((d) => {
        const groupId = d.groupId ? (groupMap.get(d.groupId) ?? groupMap.set(d.groupId, createId("group")).get(d.groupId)!) : null;
        return constrain({ ...d, id: createId("design"), x: d.x + 5, y: d.y + 5, groupId });
      });
      commitDoc({ ...doc, designs: [...doc.designs, ...copies] });
      set({ selection: copies.map((d) => d.id) });
    },

    copySelection: () => {
      const { doc, selection } = get();
      set({ clipboard: structuredClone(doc.designs.filter((d) => selection.includes(d.id))) });
    },

    paste: () => {
      const { clipboard, doc } = get();
      if (clipboard.length === 0) return;
      const copies = clipboard.map((d) => constrain({ ...d, id: createId("design"), x: d.x + 5, y: d.y + 5 }));
      commitDoc({ ...doc, designs: [...doc.designs, ...copies] });
      // Paste again offsets further, like most editors.
      set({ selection: copies.map((d) => d.id), clipboard: copies.map((d) => ({ ...d })) });
    },

    groupSelection: () => {
      const { selection } = get();
      if (selection.length < 2) return;
      const groupId = createId("group");
      mapDesigns((d) => (selection.includes(d.id) ? { ...d, groupId } : d));
    },

    ungroupSelection: () => {
      const { selection } = get();
      mapDesigns((d) => (selection.includes(d.id) ? { ...d, groupId: null } : d));
    },

    bringForward: (id, toEdge = false) => {
      const { doc } = get();
      const i = doc.designs.findIndex((d) => d.id === id);
      if (i < 0 || i === doc.designs.length - 1) return;
      const designs = [...doc.designs];
      const [item] = designs.splice(i, 1);
      designs.splice(toEdge ? designs.length : i + 1, 0, item);
      commitDoc({ ...doc, designs });
    },

    sendBackward: (id, toEdge = false) => {
      const { doc } = get();
      const i = doc.designs.findIndex((d) => d.id === id);
      if (i <= 0) return;
      const designs = [...doc.designs];
      const [item] = designs.splice(i, 1);
      designs.splice(toEdge ? 0 : i - 1, 0, item);
      commitDoc({ ...doc, designs });
    },

    alignSelection: (target, relativeTo) => {
      const { doc, selection } = get();
      const picked = doc.designs.filter((d) => selection.includes(d.id));
      if (picked.length === 0) return;
      const ref =
        relativeTo === "page"
          ? pageRect(doc.page)
          : relativeTo === "printable"
            ? printableRect(doc.page)
            : unionBounds(picked.map(designBounds))!;
      // A single design (or "selection" mode) aligns each item; otherwise the
      // selection moves as one block so its internal layout is kept.
      const moved =
        relativeTo === "selection"
          ? picked.map((d) => alignGroup([d], target, ref)[0])
          : alignGroup(picked, target, ref);
      const byId = new Map(moved.map((d) => [d.id, d]));
      commitDoc({ ...doc, designs: doc.designs.map((d) => byId.get(d.id) ?? d) });
    },

    centerSelection: () => {
      const { doc, selection } = get();
      if (selection.length === 0) return;
      const picked = doc.designs.filter((d) => selection.includes(d.id));
      const ref = printableRect(doc.page);
      const moved = alignGroup(alignGroup(picked, "center-x", ref), "center-y", ref);
      const byId = new Map(moved.map((d) => [d.id, d]));
      commitDoc({ ...doc, designs: doc.designs.map((d) => byId.get(d.id) ?? d) });
    },

    repeatDesign: (id, copies) => {
      const { doc, layoutGap } = get();
      const source = doc.designs.find((d) => d.id === id);
      if (!source) return { placed: 0, unplaced: 0, suggestions: [] };
      const others = doc.designs.filter((d) => d.id !== id);
      const clones: Design[] = Array.from({ length: Math.max(1, copies) }, (_, i) =>
        i === 0 ? source : { ...source, id: createId("design"), groupId: null },
      );
      const b = designBounds(source);
      const result = arrangeGrid(
        clones.map((c) => c.id),
        { width: b.width, height: b.height },
        printableRect(doc.page),
        layoutGap,
      );
      const placedIds = new Set(result.placements.map((p) => p.id));
      // Copies that do not fit are not created; the report says how many.
      const kept = applyPlacements(clones.filter((c) => placedIds.has(c.id)), result.placements);
      const report: LayoutReport = {
        placed: kept.length,
        unplaced: result.unplaced.length,
        suggestions:
          result.unplaced.length > 0
            ? [
                `Only ${kept.length} copies fit at this size and spacing.`,
                ...suggestLayoutFixes(clones, doc.page, layoutGap).slice(1),
              ]
            : [],
      };
      if (kept.length > 0) {
        commitDoc({ ...doc, designs: [...others, ...kept] });
        set({ selection: kept.map((d) => d.id) });
      }
      set({ lastLayoutReport: report });
      return report;
    },

    autoArrange: (scope) => {
      const { doc, selection, layoutGap } = get();
      const targets = scope === "all" ? doc.designs : doc.designs.filter((d) => selection.includes(d.id));
      if (targets.length === 0) return { placed: 0, unplaced: 0, suggestions: [] };
      const result = packShelves(packItemsFor(targets), printableRect(doc.page), layoutGap);
      const moved = applyPlacements(targets, result.placements);
      const byId = new Map(moved.map((d) => [d.id, d]));
      commitDoc({ ...doc, designs: doc.designs.map((d) => byId.get(d.id) ?? d) });
      const report: LayoutReport = {
        placed: result.placements.length,
        unplaced: result.unplaced.length,
        suggestions: result.unplaced.length > 0 ? suggestLayoutFixes(targets, doc.page, layoutGap) : [],
      };
      set({ lastLayoutReport: report, selection: result.unplaced });
      return report;
    },

    setPage: (patch) => {
      const { doc } = get();
      commitDoc({ ...doc, page: { ...doc.page, ...patch } });
      if (patch.orientation && patch.orientation !== doc.page.orientation) get().fitPage();
    },

    setUnit: (unit) => set({ unit }),
    setViewport: (viewport) => set({ viewport }),
    setPan: (pan) => set({ pan }),

    zoomTo: (target, anchor) => {
      const { zoom, pan, viewport } = get();
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, target));
      const a = anchor ?? { x: viewport.width / 2, y: viewport.height / 2 };
      const k = next / zoom;
      set({ zoom: next, pan: { x: a.x - (a.x - pan.x) * k, y: a.y - (a.y - pan.y) * k } });
    },

    fitPage: () => {
      const { viewport, doc } = get();
      if (viewport.width === 0 || viewport.height === 0) return;
      const page = pageSize(doc.page.orientation);
      const pad = viewport.width < 640 ? 12 : 40;
      // The rulers cover the top and left edges of the viewport.
      const width = viewport.width - RULER_PX;
      const height = viewport.height - RULER_PX;
      const zoom = Math.max(
        MIN_ZOOM,
        Math.min(
          (width - pad * 2) / (page.width * PX_PER_MM),
          (height - pad * 2) / (page.height * PX_PER_MM),
        ),
      );
      const s = zoom * PX_PER_MM;
      set({
        zoom,
        pan: {
          x: RULER_PX + (width - page.width * s) / 2,
          y: RULER_PX + (height - page.height * s) / 2,
        },
      });
    },
    setSidebarTab: (sidebarTab) => set({ sidebarTab }),
    setLayoutGap: (layoutGap) => set({ layoutGap }),
    setDialog: (dialog) => set({ dialog }),

    setProjectName: (name) => set((s) => ({ project: { ...s.project, name, dirty: true } })),
    markSaved: (at) => set((s) => ({ project: { ...s.project, savedAt: at, dirty: false } })),

    loadState: ({ doc, assets, project }) => {
      for (const a of Object.values(get().assets)) URL.revokeObjectURL(a.objectUrl);
      set({ doc, assets, project, selection: [], past: [], future: [], lastLayoutReport: null });
      get().fitPage();
    },

    newProject: () => {
      for (const a of Object.values(get().assets)) URL.revokeObjectURL(a.objectUrl);
      set({
        doc: emptyDocument(),
        assets: {},
        selection: [],
        past: [],
        future: [],
        project: newProjectMeta(),
        lastLayoutReport: null,
      });
      get().fitPage();
    },
  };
});

/** Selected designs in document (z) order. */
export function selectedDesigns(state: Pick<EditorState, "doc" | "selection">): Design[] {
  return state.doc.designs.filter((d) => state.selection.includes(d.id));
}
