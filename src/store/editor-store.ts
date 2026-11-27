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
 * A project has one or more pages, each with its own sheet (A4, A3, a DTF
 * roll...) and its own undo history. `doc`, `past` and `future` always describe
 * the active page, so most of the editor only ever sees one page; the other
 * pages wait in `pages`, and `allPages()` gives the full, current list.
 *
 * Geometry rules live in `lib/`; the store only orchestrates them, which keeps
 * the rules testable without React.
 */

import { create } from "zustand";
import type { AlignX, AlignY, CropView, Design, EditorDocument, FitMode, Orientation, PageSettings, PrintProcess, Unit } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { createId } from "@/lib/id";
import { effectiveSourceSize, fitContain, normalizeBox, normalizeView, resizeBox, type Size } from "@/lib/image/image-fit";
import { centerIn, clampIntoRect, pageRect, pageSize, printableRect, uniformMargins } from "@/lib/layout/sheet-layout";
import { CSS_DPI, MM_PER_INCH } from "@/lib/layout/coordinate-conversion";
import { alignGroup, distributeDesigns, unionBounds, type AlignTarget } from "@/lib/layout/alignment";
import { DEFAULT_SHEET_ID, type SheetDefinition } from "@/lib/catalogue/sheets";
import { findProduct, sidesOf, slotSize } from "@/lib/catalogue/products";
import { DEFAULT_GUIDES } from "@/lib/storage/migrate";
import { DEFAULT_ARRANGE, planArrange, type ArrangeOptions } from "@/lib/layout/arrange";
import { pairMembers, partnerOf, placeBackOf, shiftBlockInto } from "@/lib/layout/card-pair";
import { planProductPlacement, type PlacementReason } from "@/lib/layout/product-placement";
import { designBounds } from "@/lib/layout/sheet-layout";
import { applyPlacements, arrangeGrid, suggestLayoutFixes, type LayoutGap } from "@/lib/layout/auto-arrange";
import { maxPrintSizeAt } from "@/lib/image/image-resolution";
import { DEFAULT_CUT_GUIDE } from "@/lib/cut/cut-method";
import { MAX_FILL, fillTurns, planFill } from "@/lib/layout/fill";

/** True when two rotations differ by an odd number of quarter turns. */
const turnsDiffer = (a: number, b: number) => Math.abs(Math.round((a - b) / 90)) % 2 === 1;

const HISTORY_LIMIT = 100;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
/** Screen pixels per millimetre at 100% zoom (CSS assumes 96 px per inch). */
export const PX_PER_MM = CSS_DPI / MM_PER_INCH;
/** Width of the workspace rulers, in screen pixels. */
export const RULER_PX = 22;
/** Space reserved above the sheet for the floating quick-actions bar. */
export const QUICK_BAR_PX = 48;
/** Space reserved below the sheet for the floating page strip. */
export const PAGES_BAR_PX = 64;
/** Width of the docked live product preview, plus its margin. */
export const PREVIEW_DOCK_PX = 248;
/**
 * Narrowest canvas that still shows the preview dock expanded. Below this the
 * dock folds to a "Preview" pill so the sheet keeps the room (on a 1366 px
 * laptop with both panels open the canvas is about 650 px wide).
 */
export const PREVIEW_DOCK_MIN_CANVAS = 760;

export const DEFAULT_PAGE: PageSettings = {
  sheet: DEFAULT_SHEET_ID,
  customSize: null,
  process: "sublimation",
  mirrorMode: "auto",
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
  spacing: 5,
  pairGap: 5,
  guides: { ...DEFAULT_GUIDES },
  sheetCut: false,
  // Used on sticker pages only. Most people cut stickers by hand, so new pages
  // print a thin cutting line and paint the sticker border white.
  cutMethod: "hand",
  cutGuide: { ...DEFAULT_CUT_GUIDE },
  borderFill: "#ffffff",
};

export function emptyDocument(): EditorDocument {
  return { page: structuredClone(DEFAULT_PAGE), designs: [] };
}

export type InspectorTab = "design" | "arrange" | "cut";

export type SidebarTab = "products" | "designs" | "uploads" | "layers" | "sheet" | "projects";

/**
 * Something that replaces the current design (a product template, the sample,
 * a blank sheet, the start dialog). When there is work to lose, the editor
 * asks first: save and continue, discard and continue, or (for a product) add
 * it to the current sheet instead.
 */
export type LeaveIntent =
  | { kind: "product"; productId: string }
  | { kind: "sample" }
  | { kind: "blank" }
  | { kind: "start" };

/** A page of the project. For the active page these fields may be stale; use `allPages`. */
export interface PageEntry {
  id: string;
  doc: EditorDocument;
  past: EditorDocument[];
  future: EditorDocument[];
}

function pageEntry(doc: EditorDocument): PageEntry {
  return { id: createId("page"), doc, past: [], future: [] };
}

export interface LayoutReport {
  placed: number;
  unplaced: number;
  suggestions: string[];
  /** Pages Auto Arrange added for what did not fit. */
  pagesAdded?: number;
  /** Designs larger than the printable area (never shrunk). */
  tooLarge?: string[];
  /** Share of each page's printable area that is used, 0–1. */
  utilisation?: number[];
  turned?: number;
}

/**
 * Auto Arrange that spilled onto new pages is one undo step for the whole
 * project: undoing it on the page where it ran also removes the pages it
 * created (if they were not edited since), and redo puts them back. Keyed by
 * the document the arrange produced.
 */
const projectSteps = new WeakMap<EditorDocument, { before: PageEntry[]; after: PageEntry[]; added: string[] }>();

export interface EditorState {
  /** The active page. */
  doc: EditorDocument;
  pages: PageEntry[];
  activePage: number;
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
  /** True until the user pans or zooms; while true the view refits on resize. */
  autoFit: boolean;
  sidebarTab: SidebarTab;
  layoutGap: LayoutGap;
  lastLayoutReport: LayoutReport | null;
  /** Auto Arrange settings (kept for the session; spacing itself is saved per page). */
  arrangeOptions: ArrangeOptions;
  /** Design whose image is being cropped or adjusted on the canvas. */
  cropEditing: string | null;
  dialog: "export" | "print" | "sheet" | "shortcuts" | "start" | "mockup" | "viewer3d" | "arrange" | "strip" | "commands" | null;
  /** Product shown in the catalogue 3D viewer (opened from a product card). */
  viewer3dProductId: string | null;
  /** Design shown in the product preview dialog. */
  mockupDesignId: string | null;
  /** Right-hand precise properties panel. */
  inspectorOpen: boolean;
  /** Which inspector tab is shown (kept while the selection changes). */
  inspectorTab: InspectorTab;
  /** Left panel pinned open (Ctrl+/ toggles). */
  panelOpen: boolean;
  /** A drag or transform is in progress on the canvas. */
  interacting: boolean;
  /** Pending "replace the current design" action waiting for the user's answer. */
  leaveIntent: LeaveIntent | null;
  /** Live product preview docked on the canvas is expanded. */
  previewDock: boolean;
  /** Screen pixels covered by overlays on the right of the canvas (the preview dock). */
  rightInset: number;

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

  /** Select designs; groups and card pairs expand to all members unless `exact` (one side of a pair). */
  select: (ids: string[], mode?: "replace" | "toggle" | "add", options?: { exact?: boolean }) => void;
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
  /** Pack designs without overlap (see `lib/layout/arrange.ts`); one undo step. */
  autoArrange: (scope?: "all" | "selection", options?: Partial<ArrangeOptions>) => LayoutReport;
  setArrangeOptions: (patch: Partial<ArrangeOptions>) => void;
  /** Make the total number of copies of a design `total`, packed with Auto Arrange. */
  setQuantity: (id: string, total: number) => LayoutReport;
  /** Fill the free space of the page with copies of one design (step and repeat); one undo step. */
  fillSheet: (id: string, options?: { rotate?: boolean }) => LayoutReport;

  /** Crop mode: pan and zoom the image inside its fixed box. */
  startCrop: (id: string) => void;
  endCrop: () => void;
  /** Commit a cover view (one undo step); switches the design to `cover`. */
  setView: (id: string, view: CropView | null) => void;

  /** Add an empty back to a two-sided product, placed beside the front. */
  addCardBack: (frontId: string) => string | null;
  /** Swap which design is the front and which the back (artwork stays in place). */
  swapSides: (id: string) => void;
  /** Unlink a pair; both designs stay, as one-sided designs. */
  unlinkPair: (id: string) => void;
  /** Pair two selected designs of the same size as front and back. */
  pairSelection: () => boolean;
  /** Put the back beside the front again at the page's pair gap. */
  realignPair: (id: string) => void;

  setPage: (patch: Partial<PageSettings>) => void;
  /** Set page settings on several pages at once (each page records its own undo step). */
  setPagesAt: (indices: number[], patch: Partial<PageSettings>) => void;
  setUnit: (unit: Unit) => void;
  setViewport: (size: { width: number; height: number }) => void;
  setPan: (pan: { x: number; y: number }) => void;
  /** Zoom to `zoom`, keeping the screen point `anchor` fixed (default: centre). */
  zoomTo: (zoom: number, anchor?: { x: number; y: number }) => void;
  fitPage: () => void;
  zoomToSelection: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setLayoutGap: (gap: LayoutGap) => void;
  setDialog: (dialog: EditorState["dialog"]) => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setPanelOpen: (open: boolean) => void;
  setInteracting: (interacting: boolean) => void;
  setLeaveIntent: (intent: LeaveIntent | null) => void;
  setPreviewDock: (open: boolean) => void;
  setRightInset: (px: number) => void;

  addProductSlot: (productId: string) => SlotResult;
  /** Add an empty page (default: same sheet settings as the active page) after the active one and open it. */
  addPage: (page?: PageSettings) => number;
  switchPage: (index: number) => void;
  deletePage: (index: number) => void;
  duplicatePage: (index: number) => void;
  moveDesignsToPage: (ids: string[], index: number) => void;
  openMockup: (designId: string | null) => void;
  openViewer3d: (productId: string) => void;
  addEmptySlot: (size: Size, name?: string) => string;
  moveLayer: (id: string, toIndex: number) => void;
  fillSlot: (designId: string, assetId: string) => void;
  clearSlot: (designId: string) => void;
  flipDesigns: (axis: "x" | "y") => void;
  distributeSelection: (axis: "x" | "y") => void;
  setProcess: (process: PrintProcess) => void;
  setSheet: (sheet: string, customSize?: { width: number; height: number } | null, orientation?: Orientation) => void;

  setProjectName: (name: string) => void;
  markSaved: (at: number) => void;
  loadState: (input: {
    doc: EditorDocument;
    assets: Record<string, LoadedAsset>;
    project: EditorState["project"];
    /** Every page; when given, `doc` is ignored in favour of `pages[0]`. */
    pages?: EditorDocument[];
  }) => void;
  newProject: () => void;
}

export interface SlotResult {
  designId: string | null;
  /** True when the product got a page of its own (it did not fit, or needs another process). */
  newPage: boolean;
  /** Why it went where it went (see `lib/layout/product-placement.ts`). */
  reason: PlacementReason | null;
  /** Sheet the page was switched to, when the sheet changed. */
  sheet: SheetDefinition | null;
  /** 1-based number of the page it is on. */
  pageNumber: number;
}

/** A design with every field defaulted; callers override what they need. */
export function makeDesign(patch: Partial<Design> & Pick<Design, "width" | "height">): Design {
  return {
    ...baseDesign(),
    ...patch,
  };
}

function baseDesign(): Omit<Design, "width" | "height"> {
  return {
    id: createId("design"),
    name: "Design",
    assetId: null,
    productId: null,
    productColor: null,
    bleed: 0,
    flipX: false,
    flipY: false,
    x: 0,
    y: 0,
    rotation: 0,
    fitMode: "contain",
    alignX: "center",
    alignY: "center",
    padding: 0,
    fillColor: null,
    lockAspect: false,
    border: false,
    crop: null,
    groupId: null,
    locked: false,
    view: null,
    lockRotation: false,
    side: null,
    pairId: null,
    cut: null,
    strap: null,
  };
}

/** Source size the fitting engine sees: crop insets and (in cover mode) the cover window applied. */
function assetSource(asset: LoadedAsset, design: Design): Size {
  return effectiveSourceSize(design, { width: asset.naturalWidth, height: asset.naturalHeight });
}

/** Cut spec a new product design starts with (stickers), filled to a full spec. */
function productCut(productId: string | null): Design["cut"] {
  const p = findProduct(productId);
  if (!p?.cut) return null;
  return {
    shape: p.cut.shape ?? "rect",
    radius: p.cut.radius ?? p.cornerRadius ?? 0,
    offset: p.cut.offset ?? 0,
    through: p.cut.through ?? "die",
    safeInset: p.cut.safeInset ?? 0,
    contour: null,
  };
}

/** The project's pages with the active page's live state written in. */
function stashPages(s: Pick<EditorState, "pages" | "activePage" | "doc" | "past" | "future">): PageEntry[] {
  return s.pages.map((p, i) => (i === s.activePage ? { ...p, doc: s.doc, past: s.past, future: s.future } : p));
}

/** Every page of the project, in order, with the active page up to date. */
export function allPages(s: Pick<EditorState, "pages" | "activePage" | "doc">): EditorDocument[] {
  return s.pages.map((p, i) => (i === s.activePage ? s.doc : p.doc));
}

/**
 * Copy designs with fresh ids, keeping group and pair membership within the
 * copy (a copied card pair is a new pair; a copied lone side is one-sided).
 */
export function cloneDesigns(designs: Design[]): Design[] {
  const groups = new Map<string, string>();
  const pairs = new Map<string, string>();
  const pairCount = new Map<string, number>();
  for (const d of designs) if (d.pairId) pairCount.set(d.pairId, (pairCount.get(d.pairId) ?? 0) + 1);
  const remap = (map: Map<string, string>, id: string | null, prefix: string) => {
    if (!id) return null;
    if (!map.has(id)) map.set(id, createId(prefix));
    return map.get(id)!;
  };
  return designs.map((d) => {
    const pairId = d.pairId && (pairCount.get(d.pairId) ?? 0) > 1 ? remap(pairs, d.pairId, "pair") : null;
    return { ...d, id: createId("design"), groupId: remap(groups, d.groupId, "group"), pairId };
  });
}

function newProjectMeta(): EditorState["project"] {
  return { id: createId("project"), name: "Untitled sheet", savedAt: null, dirty: false, createdAt: Date.now() };
}

/** Expand a selection to include every member of any selected group or card pair. */
function expandGroups(designs: Design[], ids: string[]): string[] {
  const picked = designs.filter((d) => ids.includes(d.id));
  const groups = new Set(picked.filter((d) => d.groupId).map((d) => d.groupId));
  const pairs = new Set(picked.filter((d) => d.pairId).map((d) => d.pairId));
  const out = new Set(ids);
  for (const d of designs) {
    if (d.groupId && groups.has(d.groupId)) out.add(d.id);
    if (d.pairId && pairs.has(d.pairId)) out.add(d.id);
  }
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
    const asset = d.assetId ? get().assets[d.assetId] : undefined;
    if (!asset) return d;
    return { ...d, ...normalizeBox(d, assetSource(asset, d)) };
  };

  const constrain = (d: Design): Design => {
    const { page } = get().doc;
    return page.constrainToPrintable ? clampIntoRect(d, printableRect(page)) : d;
  };

  const firstDoc = emptyDocument();
  return {
    doc: firstDoc,
    pages: [pageEntry(firstDoc)],
    activePage: 0,
    mockupDesignId: null,
    viewer3dProductId: null,
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
    autoFit: true,
    sidebarTab: "products",
    layoutGap: { x: 5, y: 5 },
    lastLayoutReport: null,
    arrangeOptions: { ...DEFAULT_ARRANGE },
    cropEditing: null,
    dialog: null,
    inspectorOpen: true,
    inspectorTab: "design",
    leaveIntent: null,
    previewDock: true,
    rightInset: 0,
    panelOpen: true,
    interacting: false,

    commit: commitDoc,

    undo: () =>
      set((s) => {
        const prev = s.past[s.past.length - 1];
        if (!prev) return s;
        const step = projectSteps.get(s.doc);
        if (step) {
          // Remove the pages an Auto Arrange created, if nobody edited them since.
          const current = stashPages(s);
          const untouched = step.added.every((id) => {
            const now = current.find((p) => p.id === id);
            const then = step.after.find((p) => p.id === id);
            return !now || (then && now.doc === then.doc);
          });
          if (untouched) {
            const pages = step.before.map((p, i) => (i === s.activePage ? { ...p, doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future] } : p));
            const ids = new Set(prev.designs.map((d) => d.id));
            return {
              pages,
              doc: prev,
              past: s.past.slice(0, -1),
              future: [s.doc, ...s.future],
              selection: s.selection.filter((id) => ids.has(id)),
              project: { ...s.project, dirty: true },
            };
          }
        }
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
        const step = projectSteps.get(next);
        if (step && step.before.length === s.pages.length) {
          const past = [...s.past, s.doc];
          const pages = step.after.map((p, i) => (i === s.activePage ? { ...p, doc: next, past, future: s.future.slice(1) } : p));
          return { pages, doc: next, past, future: s.future.slice(1), project: { ...s.project, dirty: true } };
        }
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
      const { assets, doc, selection } = get();
      const asset = assets[assetId];
      if (!asset) return null;
      // Canva-style frames: a selected empty product slot takes the image.
      const target = selection.length === 1 ? doc.designs.find((d) => d.id === selection[0]) : undefined;
      if (target && !target.assetId && !size) {
        get().fillSlot(target.id, assetId);
        return target.id;
      }
      const printable = printableRect(doc.page);
      const box = size ?? defaultPrintSize(asset, printable);
      const offset = (doc.designs.length % 8) * 5;
      const base = makeDesign({
        name: asset.name.replace(/\.[^.]+$/, ""),
        assetId,
        width: box.width,
        height: box.height,
        // An explicit box with a different shape than the image is intentional.
        lockAspect:
          !size ||
          Math.abs(size.width / size.height / (asset.naturalWidth / asset.naturalHeight) - 1) < 0.005,
      });
      const centred = centerIn(base, printable);
      const design = constrain({ ...centred, x: centred.x + offset, y: centred.y + offset });
      commitDoc({ ...doc, designs: [...doc.designs, design] });
      set({ selection: [design.id] });
      return design.id;
    },

    addProductSlot: (productId) => {
      const product = findProduct(productId);
      const none: SlotResult = { designId: null, newPage: false, reason: null, sheet: null, pageNumber: get().activePage + 1 };
      if (!product) return none;
      const { doc } = get();
      const plan = planProductPlacement(product, doc.page, doc.designs);
      const slot = slotSize(product);
      const design = makeDesign({
        name: `${product.name}, ${product.detail}`,
        productId: product.id,
        width: slot.width,
        height: slot.height,
        bleed: slot.bleed,
        rotation: plan.rotation,
        x: plan.x,
        y: plan.y,
        fitMode: "fill",
        fillColor: null,
        cut: productCut(product.id),
        side: sidesOf(product) === 2 ? "front" : null,
      });
      if (plan.target === "new-page") {
        // A product that needs another sheet or process never changes this page.
        get().addPage(plan.page);
        commitDoc({ ...get().doc, designs: [design] });
      } else {
        const pageChanged = plan.page !== doc.page;
        commitDoc({ page: plan.page, designs: [...doc.designs, design] });
        if (pageChanged) get().fitPage();
      }
      set({ selection: [design.id] });
      return {
        designId: design.id,
        newPage: plan.target === "new-page",
        reason: plan.reason,
        sheet: plan.sheet,
        pageNumber: get().activePage + 1,
      };
    },

    addPage: (page) => {
      const s = get();
      const pages = stashPages(s);
      const doc: EditorDocument = { page: structuredClone(page ?? s.doc.page), designs: [] };
      const entry = pageEntry(doc);
      const at = s.activePage + 1;
      pages.splice(at, 0, entry);
      set({ pages, activePage: at, doc, past: [], future: [], selection: [], project: { ...s.project, dirty: true } });
      get().fitPage();
      return at;
    },

    switchPage: (index) => {
      const s = get();
      if (index === s.activePage || index < 0 || index >= s.pages.length) return;
      const pages = stashPages(s);
      const target = pages[index];
      set({ pages, activePage: index, doc: target.doc, past: target.past, future: target.future, selection: [] });
      get().fitPage();
    },

    deletePage: (index) => {
      const s = get();
      if (s.pages.length <= 1 || index < 0 || index >= s.pages.length) return;
      const pages = stashPages(s);
      pages.splice(index, 1);
      const active = index < s.activePage ? s.activePage - 1 : Math.min(s.activePage, pages.length - 1);
      const target = pages[active];
      set({
        pages,
        activePage: active,
        doc: target.doc,
        past: target.past,
        future: target.future,
        selection: [],
        project: { ...s.project, dirty: true },
      });
      get().fitPage();
    },

    duplicatePage: (index) => {
      const s = get();
      const source = allPages(s)[index];
      if (!source) return;
      if (index !== s.activePage) get().switchPage(index);
      get().addPage(source.page);
      // The copy starts with the source's designs and an empty history.
      set((x) => ({ doc: { ...x.doc, designs: cloneDesigns(source.designs) } }));
    },

    moveDesignsToPage: (ids, index) => {
      const s = get();
      if (index === s.activePage || index < 0 || index >= s.pages.length) return;
      const moving = s.doc.designs.filter((d) => ids.includes(d.id));
      if (moving.length === 0) return;
      commitDoc({ ...s.doc, designs: s.doc.designs.filter((d) => !ids.includes(d.id)) });
      const pages = stashPages(get());
      const target = pages[index];
      const area = printableRect(target.doc.page);
      const placed = moving.map((d) => (target.doc.page.constrainToPrintable ? clampIntoRect(d, area) : d));
      pages[index] = {
        ...target,
        doc: { ...target.doc, designs: [...target.doc.designs, ...placed] },
        past: [...target.past, target.doc].slice(-HISTORY_LIMIT),
        future: [],
      };
      set({ pages, selection: [] });
    },

    openMockup: (designId) => set({ dialog: "mockup", mockupDesignId: designId }),
    openViewer3d: (productId) => set({ dialog: "viewer3d", viewer3dProductId: productId }),

    addEmptySlot: (size, name = "Custom box") => {
      const { doc } = get();
      const printable = printableRect(doc.page);
      const offset = (doc.designs.length % 8) * 5;
      const centred = centerIn(makeDesign({ name, width: size.width, height: size.height, fitMode: "fill" }), printable);
      const design = constrain({ ...centred, x: centred.x + offset, y: centred.y + offset });
      commitDoc({ ...doc, designs: [...doc.designs, design] });
      set({ selection: [design.id] });
      return design.id;
    },

    moveLayer: (id, toIndex) => {
      const { doc } = get();
      const from = doc.designs.findIndex((d) => d.id === id);
      if (from < 0) return;
      const designs = [...doc.designs];
      const [item] = designs.splice(from, 1);
      designs.splice(Math.max(0, Math.min(designs.length, toIndex)), 0, item);
      if (designs.every((d, i) => d.id === doc.designs[i].id)) return;
      commitDoc({ ...doc, designs });
    },

    fillSlot: (designId, assetId) =>
      mapDesigns((d) => {
        if (d.id !== designId) return d;
        const asset = get().assets[assetId];
        // Product slots keep their box: the image is fitted inside, never cropped.
        return normalize({
          ...d,
          assetId,
          crop: null,
          view: null,
          name: d.productId ? d.name : (asset?.name.replace(/\.[^.]+$/, "") ?? d.name),
        });
      }),

    clearSlot: (designId) => mapDesigns((d) => (d.id === designId ? { ...d, assetId: null, crop: null, view: null } : d)),

    flipDesigns: (axis) => {
      const { selection } = get();
      mapDesigns((d) =>
        selection.includes(d.id) ? (axis === "x" ? { ...d, flipX: !d.flipX } : { ...d, flipY: !d.flipY }) : d,
      );
    },

    distributeSelection: (axis) => {
      const { doc, selection } = get();
      const picked = doc.designs.filter((d) => selection.includes(d.id));
      if (picked.length < 3) return;
      const byId = new Map(distributeDesigns(picked, axis).map((d) => [d.id, d]));
      commitDoc({ ...doc, designs: doc.designs.map((d) => byId.get(d.id) ?? d) });
    },

    setProcess: (process) => {
      const { doc } = get();
      // The mirror follows the process while it is on "auto"; an explicit on/off stays.
      commitDoc({ ...doc, page: { ...doc.page, process } });
    },

    setSheet: (sheet, customSize = null, orientation) => {
      const { doc } = get();
      commitDoc({
        ...doc,
        page: { ...doc.page, sheet, customSize: sheet === "custom" ? customSize : null, orientation: orientation ?? doc.page.orientation },
      });
      get().fitPage();
    },

    replaceAsset: (designId, asset) => {
      get().addAsset(asset);
      // Keep the box, position and page setup; only the picture changes.
      mapDesigns((d) => (d.id === designId ? normalize({ ...d, assetId: asset.id, crop: null, view: null }) : d));
      set({ selection: [designId] });
    },

    removeUnusedAssets: () =>
      set((s) => {
        const docs = stashPages(s).flatMap((p) => [p.doc, ...p.past, ...p.future]);
        const used = new Set(docs.flatMap((d) => d.designs).map((d) => d.assetId));
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
        const asset = d.assetId ? get().assets[d.assetId] : undefined;
        // Empty slots resize freely; images keep the aspect lock rules.
        const next = asset
          ? resizeBox(d, assetSource(asset, d), size)
          : { width: Math.max(1, size.width ?? d.width), height: Math.max(1, size.height ?? d.height) };
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
        const asset = d.assetId ? get().assets[d.assetId] : undefined;
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
          view: null,
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

    select: (ids, mode = "replace", options = {}) =>
      set((s) => {
        const expanded = options.exact ? ids : expandGroups(s.doc.designs, ids);
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
      const kept = doc.designs.filter((d) => !selection.includes(d.id));
      // A card side whose partner was deleted becomes a one-sided card (nothing is invented).
      const alive = new Set(kept.map((d) => d.pairId).filter(Boolean));
      const counts = new Map<string, number>();
      for (const d of kept) if (d.pairId) counts.set(d.pairId, (counts.get(d.pairId) ?? 0) + 1);
      const designs = kept.map((d) => (d.pairId && alive.has(d.pairId) && counts.get(d.pairId) === 1 ? { ...d, pairId: null } : d));
      commitDoc({ ...doc, designs });
      set({ selection: [] });
    },

    duplicateSelection: () => {
      const { doc, selection } = get();
      const picked = doc.designs.filter((d) => selection.includes(d.id));
      if (picked.length === 0) return;
      const copies = cloneDesigns(picked).map((d) => constrain({ ...d, x: d.x + 5, y: d.y + 5 }));
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
      const copies = cloneDesigns(clipboard).map((d) => constrain({ ...d, x: d.x + 5, y: d.y + 5 }));
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

    autoArrange: (scope, patch = {}) => {
      const s = get();
      const options: ArrangeOptions = { ...s.arrangeOptions, ...(scope ? { scope } : {}), ...patch };
      const { doc, selection } = s;
      const empty: LayoutReport = { placed: 0, unplaced: 0, suggestions: [] };
      if (doc.designs.length === 0 || (options.scope === "selection" && selection.length === 0)) return empty;
      const plan = planArrange(doc.designs, doc.page, selection, options);
      const r = plan.report;
      const gap = { x: doc.page.spacing, y: doc.page.spacing };
      const report: LayoutReport = {
        placed: r.placed,
        unplaced: r.unplaced.length,
        suggestions:
          r.unplaced.length > 0
            ? [
                ...(r.tooLarge.length > 0 ? [`${r.tooLarge.length} ${r.tooLarge.length === 1 ? "design is" : "designs are"} larger than the printable area and cannot fit any page of this sheet.`] : []),
                ...(options.extraPages ? [] : ["Turn on \"Add pages for the rest\" to place them on new pages."]),
                ...suggestLayoutFixes(doc.designs.filter((d) => r.unplaced.includes(d.id)), doc.page, gap).slice(1),
              ]
            : [],
        pagesAdded: r.pagesAdded,
        tooLarge: r.tooLarge,
        utilisation: r.utilisation,
        turned: r.turned,
      };
      const next: EditorDocument = { ...doc, designs: plan.current };
      if (plan.newPages.length === 0) {
        commitDoc(next);
      } else {
        // One project-level step: the arranged page plus the pages it created.
        const before = stashPages(s);
        const added = plan.newPages.map((designs) => pageEntry({ page: structuredClone(doc.page), designs }));
        commitDoc(next);
        const after = stashPages(get());
        after.splice(s.activePage + 1, 0, ...added);
        set({ pages: after });
        projectSteps.set(next, { before, after, added: added.map((p) => p.id) });
      }
      set({ lastLayoutReport: report, selection: r.unplaced, arrangeOptions: options });
      return report;
    },

    setArrangeOptions: (patch) => set((s) => ({ arrangeOptions: { ...s.arrangeOptions, ...patch } })),

    fillSheet: (id, options = {}) => {
      const s = get();
      const { doc } = s;
      const source = doc.designs.find((d) => d.id === id);
      const none = { placed: 0, unplaced: 0, suggestions: [] as string[] };
      if (!source || source.pairId || source.locked) return none;
      const plan = planFill(source, doc.page, doc.designs, { rotate: options.rotate ?? fillTurns(source, s.arrangeOptions.rotate) });
      if (plan.slots.length === 0) {
        const report = { ...none, unplaced: 1, suggestions: ["The design is larger than the free printable area. Nothing was resized."] };
        set({ lastLayoutReport: report });
        return report;
      }
      const [first, ...rest] = plan.slots;
      const copies = cloneDesigns(rest.map((slot) => ({ ...source, groupId: null, ...slot })));
      const designs = doc.designs.filter((d) => !plan.replaces.includes(d.id)).map((d) => (d.id === source.id ? { ...d, ...first } : d));
      designs.splice(designs.findIndex((d) => d.id === source.id) + 1, 0, ...copies);
      commitDoc({ ...doc, designs });
      const turnedCount = plan.slots.filter((x) => turnsDiffer(x.rotation, source.rotation)).length;
      const report: LayoutReport = { placed: plan.slots.length, unplaced: 0, suggestions: [], turned: turnedCount };
      set({ selection: [source.id], lastLayoutReport: report });
      return report;
    },

    setQuantity: (id, total) => {
      const s = get();
      const { doc } = s;
      const source = doc.designs.find((d) => d.id === id);
      if (!source || source.pairId) return { placed: 0, unplaced: 0, suggestions: [] };
      const want = Math.max(1, Math.min(MAX_FILL, Math.round(total)));
      const rotate = fillTurns(source, s.arrangeOptions.rotate);
      // This page first (around the other designs), then fresh pages with the same sheet.
      const here = planFill(source, doc.page, doc.designs, { rotate, max: want });
      const perPage = planFill(source, doc.page, [source], { rotate, emptyPage: true }).slots.length;
      if (here.slots.length === 0 && perPage === 0) {
        const report = { placed: 0, unplaced: want, suggestions: ["The design is larger than the printable area of this sheet. Nothing was resized."] };
        set({ lastLayoutReport: report });
        return report;
      }
      let remaining = want - here.slots.length;
      const newPages: Design[][] = [];
      while (remaining > 0 && perPage > 0 && newPages.length < 50) {
        const n = Math.min(perPage, remaining);
        const slots = planFill(source, doc.page, [source], { rotate, emptyPage: true, max: n }).slots;
        newPages.push(cloneDesigns(slots.map((slot) => ({ ...source, groupId: null, ...slot }))));
        remaining -= n;
      }
      let designs = doc.designs.filter((d) => !here.replaces.includes(d.id));
      if (here.slots.length > 0) {
        const [first, ...rest] = here.slots;
        const copies = cloneDesigns(rest.map((slot) => ({ ...source, groupId: null, ...slot })));
        designs = designs.map((d) => (d.id === source.id ? { ...d, ...first } : d));
        designs.splice(designs.findIndex((d) => d.id === source.id) + 1, 0, ...copies);
      } else {
        // Nothing fits here: the source moves to the first new page with its copies.
        designs = designs.filter((d) => d.id !== source.id);
        if (newPages[0]?.[0]) newPages[0][0] = { ...newPages[0][0], id: source.id };
      }
      const next: EditorDocument = { ...doc, designs };
      if (newPages.length === 0) commitDoc(next);
      else {
        // One project-level undo step: this page plus the pages it created.
        const before = stashPages(s);
        const added = newPages.map((ds) => pageEntry({ page: structuredClone(doc.page), designs: ds }));
        commitDoc(next);
        const after = stashPages(get());
        after.splice(s.activePage + 1, 0, ...added);
        set({ pages: after });
        projectSteps.set(next, { before, after, added: added.map((p) => p.id) });
      }
      const placed = want - Math.max(0, remaining);
      const report: LayoutReport = {
        placed,
        unplaced: Math.max(0, remaining),
        suggestions: remaining > 0 ? [`Stopped at 50 new pages; ${remaining} copies were not made.`] : [],
        pagesAdded: newPages.length,
      };
      set({ selection: designs.some((d) => d.id === source.id) ? [source.id] : [], lastLayoutReport: report });
      return report;
    },

    startCrop: (id) => {
      const d = get().doc.designs.find((x) => x.id === id);
      if (!d?.assetId || d.locked) return;
      set({ cropEditing: id, selection: [id] });
    },
    endCrop: () => set({ cropEditing: null }),
    setView: (id, view) =>
      mapDesigns((d) => (d.id === id ? normalize({ ...d, fitMode: "cover", view: view ? normalizeView(view) : null, lockAspect: false }) : d)),

    addCardBack: (frontId) => {
      const { doc } = get();
      const front = doc.designs.find((d) => d.id === frontId);
      if (!front || sidesOf(findProduct(front.productId)) !== 2) return null;
      if (front.pairId && partnerOf(doc.designs, front)) return null;
      const pairId = front.pairId ?? createId("pair");
      const back = makeDesign({
        ...front,
        id: createId("design"),
        name: front.name.replace(/(, front)?$/, "") + ", back",
        assetId: null,
        crop: null,
        view: null,
        flipX: false,
        flipY: false,
        side: "back",
        pairId,
        groupId: null,
        locked: false,
      });
      // Keep the pair on the sheet: shift both sides (never resize) if the back would run off it.
      const [frontNext, placedBack] = shiftBlockInto(
        [{ ...front, side: "front" as const, pairId }, { ...back, ...placeBackOf({ ...front, pairId }, back, doc.page.pairGap) }],
        printableRect(doc.page),
      );
      commitDoc({ ...doc, designs: [...doc.designs.map((d) => (d.id === frontId ? frontNext : d)), placedBack] });
      set({ selection: [placedBack.id] });
      return placedBack.id;
    },

    swapSides: (id) => {
      const { doc } = get();
      const d = doc.designs.find((x) => x.id === id);
      if (!d?.pairId) return;
      mapDesigns((x) => (x.pairId === d.pairId ? { ...x, side: x.side === "front" ? "back" : "front" } : x));
    },

    unlinkPair: (id) => {
      const { doc } = get();
      const d = doc.designs.find((x) => x.id === id);
      if (!d?.pairId) return;
      mapDesigns((x) => (x.pairId === d.pairId ? { ...x, pairId: null } : x));
    },

    pairSelection: () => {
      const { doc, selection } = get();
      const picked = doc.designs.filter((d) => selection.includes(d.id));
      if (picked.length !== 2 || picked.some((d) => d.pairId)) return false;
      const [a, b] = picked;
      // Front and back must be the same physical size.
      if (Math.abs(a.width - b.width) > 0.01 || Math.abs(a.height - b.height) > 0.01 || Math.abs(a.bleed - b.bleed) > 0.01) return false;
      const pairId = createId("pair");
      const [front, back] = shiftBlockInto(
        [{ ...a, side: "front" as const, pairId }, { ...b, side: "back" as const, pairId, ...placeBackOf({ ...a, pairId }, b, doc.page.pairGap) }],
        printableRect(doc.page),
      );
      commitDoc({ ...doc, designs: doc.designs.map((d) => (d.id === a.id ? front : d.id === b.id ? back : d)) });
      return true;
    },

    realignPair: (id) => {
      const { doc } = get();
      const d = doc.designs.find((x) => x.id === id);
      const [front, back] = pairMembers(doc.designs, d?.pairId ?? null);
      if (!front || !back) return;
      const pos = placeBackOf(front, back, doc.page.pairGap);
      mapDesigns((x) => (x.id === back.id ? { ...x, ...pos } : x));
    },

    setPage: (patch) => {
      const { doc } = get();
      let designs = doc.designs;
      // A new pair gap moves every back beside its front at once.
      if (patch.pairGap !== undefined && patch.pairGap !== doc.page.pairGap) {
        const gap = patch.pairGap;
        designs = designs.map((d) => {
          if (d.side !== "back" || !d.pairId) return d;
          const front = designs.find((f) => f.pairId === d.pairId && f.id !== d.id);
          return front ? { ...d, ...placeBackOf(front, d, gap) } : d;
        });
      }
      commitDoc({ ...doc, designs, page: { ...doc.page, ...patch } });
      if (patch.orientation && patch.orientation !== doc.page.orientation) get().fitPage();
    },

    setPagesAt: (indices, patch) => {
      const s = get();
      if (indices.includes(s.activePage)) get().setPage(patch);
      const pages = stashPages(get()).map((p, i) =>
        i === s.activePage || !indices.includes(i)
          ? p
          : { ...p, doc: { ...p.doc, page: { ...p.doc.page, ...patch } }, past: [...p.past, p.doc].slice(-HISTORY_LIMIT), future: [] },
      );
      set((x) => ({ pages, project: { ...x.project, dirty: true } }));
    },

    setUnit: (unit) => set({ unit }),
    setViewport: (viewport) => {
      set({ viewport });
      if (get().autoFit) get().fitPage();
    },
    setPan: (pan) => set({ pan, autoFit: false }),

    zoomTo: (target, anchor) => {
      const { zoom, pan, viewport } = get();
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, target));
      const a = anchor ?? { x: viewport.width / 2, y: viewport.height / 2 };
      const k = next / zoom;
      set({ zoom: next, pan: { x: a.x - (a.x - pan.x) * k, y: a.y - (a.y - pan.y) * k }, autoFit: false });
    },

    zoomToSelection: () => {
      const { viewport, doc, selection, rightInset } = get();
      const picked = doc.designs.filter((d) => selection.includes(d.id));
      const box = unionBounds(picked.map(designBounds));
      if (!box || viewport.width === 0) return get().fitPage();
      const pad = viewport.width < 640 ? 24 : 56;
      const top = RULER_PX + QUICK_BAR_PX;
      const width = viewport.width - RULER_PX - rightInset;
      const height = viewport.height - top - PAGES_BAR_PX;
      const zoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, (width - pad * 2) / (box.width * PX_PER_MM), (height - pad * 2) / (box.height * PX_PER_MM)),
      );
      const s = zoom * PX_PER_MM;
      set({
        zoom,
        autoFit: false,
        pan: {
          x: RULER_PX + width / 2 - (box.x + box.width / 2) * s,
          y: top + height / 2 - (box.y + box.height / 2) * s,
        },
      });
    },

    fitPage: () => {
      const { viewport, doc, rightInset } = get();
      if (viewport.width === 0 || viewport.height === 0) return;
      const page = pageSize(doc.page);
      const pad = viewport.width < 640 ? 12 : 40;
      // The rulers cover the top and left edges of the viewport.
      // Leave room for the rulers and the floating quick-actions bar at the top.
      const top = RULER_PX + QUICK_BAR_PX;
      const width = viewport.width - RULER_PX - rightInset;
      const height = viewport.height - top - PAGES_BAR_PX;
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
        autoFit: true,
        pan: {
          x: RULER_PX + (width - page.width * s) / 2,
          y: top + (height - page.height * s) / 2,
        },
      });
    },
    setSidebarTab: (sidebarTab) => set({ sidebarTab }),
    setLayoutGap: (layoutGap) => set({ layoutGap }),
    setDialog: (dialog) => set({ dialog }),
    setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
    setInspectorTab: (inspectorTab) => set({ inspectorTab }),
    setPanelOpen: (panelOpen) => set({ panelOpen }),
    setInteracting: (interacting) => set({ interacting }),
    setLeaveIntent: (leaveIntent) => set({ leaveIntent }),
    setPreviewDock: (previewDock) => set({ previewDock }),
    setRightInset: (rightInset) => {
      if (rightInset === get().rightInset) return;
      set({ rightInset });
      if (get().autoFit) get().fitPage();
    },

    setProjectName: (name) => set((s) => ({ project: { ...s.project, name, dirty: true } })),
    markSaved: (at) => set((s) => ({ project: { ...s.project, savedAt: at, dirty: false } })),

    loadState: ({ doc, assets, project, pages }) => {
      for (const a of Object.values(get().assets)) URL.revokeObjectURL(a.objectUrl);
      const docs = pages && pages.length > 0 ? pages : [doc];
      set({
        cropEditing: null,
        doc: docs[0],
        pages: docs.map(pageEntry),
        activePage: 0,
        assets,
        project,
        selection: [],
        past: [],
        future: [],
        lastLayoutReport: null,
      });
      get().fitPage();
    },

    newProject: () => {
      for (const a of Object.values(get().assets)) URL.revokeObjectURL(a.objectUrl);
      const doc = emptyDocument();
      set({
        cropEditing: null,
        doc,
        pages: [pageEntry(doc)],
        activePage: 0,
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
