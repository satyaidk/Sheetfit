"use client";

/**
 * The interactive workspace: a neutral canvas with rulers, the print sheet and
 * every design on it.
 *
 * Scene graph:
 *   Stage (viewport pixels)
 *   └─ Layer
 *      ├─ Group  x/y = pan, scale = zoom × px-per-mm   ← everything below is in mm
 *      │  ├─ PrintSheet (paper, printable area, grid)
 *      │  ├─ DesignNode × n (images and empty product slots)
 *      │  └─ crop marks, out-of-bounds outlines, snap guides, live gap lines
 *      └─ Transformer (screen space, Canva-style round and pill handles)
 *
 * Konva owns the pointer while a gesture runs. Drags go through `resolveDrag`
 * (snapping, constraints) on every move and are committed once on release, so
 * one gesture is one undo step. During a drag the canvas shows live gaps in
 * millimetres to the nearest neighbours (a cutting spec on a print sheet).
 * During a resize Konva scales the group; the node re-fits and counter-scales
 * the image so it is never shown stretched, and on release the scale becomes
 * a real width and height.
 *
 * Space-drag, middle-drag, or dragging empty canvas pans; Shift-drag on empty
 * canvas draws a selection marquee; Ctrl+wheel zooms at the pointer.
 */

import { useEffect, useRef, useState } from "react";
import { Group, Layer, Line, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import { ImagePlus, Package, Sparkles, Upload } from "lucide-react";
import { PX_PER_MM, useEditor } from "@/store/editor-store";
import type { Design } from "@/types/editor";
import { PrintSheet } from "./PrintSheet";
import { DesignNode } from "./ImageLayer";
import { Rulers } from "./Rulers";
import { designAt, designBounds, pageSize, placementStatus, printableRect, rectsOverlap } from "@/lib/layout/sheet-layout";
import { boxFollowsImage, computeImageRect, croppedSourceSize, normalizeBox, type Rect as RectT } from "@/lib/image/image-fit";
import { resolveDrag } from "@/lib/layout/drag";
import { measureGaps, type Gap } from "@/lib/layout/measure";
import { CROP_MARK, cropMarksFor } from "@/lib/render/render-plan";
import type { SnapGuide } from "@/lib/layout/alignment";
import { unionBounds } from "@/lib/layout/alignment";
import { resolutionReport } from "@/lib/image/image-resolution";
import { ASSET_DRAG_TYPE, placeAssetAt, uploadFiles, uploadIntoSlot } from "@/lib/editor-actions";
import { loadSampleSheet } from "@/lib/sample";
import { ACCEPT_ATTR } from "@/lib/image/image-loader";
import { Button } from "@/components/ui/button";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { CanvasContextMenu } from "./CanvasContextMenu";

/** Group scale and resulting box of a resize gesture in progress. */
type LiveResize = { scale: { x: number; y: number }; box: Pick<Design, "x" | "y" | "width" | "height" | "rotation"> };

const MIN_BOX_MM = 1;
const ACCENT = "#077d89";
const GUIDE = "#ec2f8f";

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function CanvasWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Group>());
  const fileInput = useRef<HTMLInputElement>(null);

  const doc = useEditor((s) => s.doc);
  const assets = useEditor((s) => s.assets);
  const selection = useEditor((s) => s.selection);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const viewport = useEditor((s) => s.viewport);
  const unit = useEditor((s) => s.unit);

  const pxPerMm = zoom * PX_PER_MM;
  const page = pageSize(doc.page);
  const u = unit === "px" ? "mm" : unit;

  const [hovered, setHovered] = useState<string | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [live, setLive] = useState<Record<string, LiveResize>>({});
  const [readout, setReadout] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<RectT | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);

  const dragOrigin = useRef<Map<string, { x: number; y: number }> | null>(null);
  const gesture = useRef<
    | { kind: "pan"; startX: number; startY: number; panX: number; panY: number; moved: boolean }
    | { kind: "marquee"; startX: number; startY: number; additive: boolean }
    | null
  >(null);

  // Track the viewport size; fit the page the first time it is known.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const store = useEditor.getState();
      const first = store.viewport.width === 0;
      store.setViewport({ width, height });
      if (first) useEditor.getState().fitPage();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Space held = hand tool (Figma/Canva convention).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isTyping(e.target)) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    const blur = () => setSpaceDown(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const selectedDesigns = doc.designs.filter((d) => selection.includes(d.id));
  const single = selectedDesigns.length === 1 ? selectedDesigns[0] : null;
  const transformable = selectedDesigns.filter((d) => !d.locked);

  // Attach the transformer to the selected, unlocked nodes.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = transformable
      .map((d) => nodeRefs.current.get(d.id))
      .filter((n): n is Konva.Group => Boolean(n));
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  });

  const keepRatio = single ? (single.assetId !== null && single.lockAspect) || single.fitMode === "manual" : true;
  const anchors = (() => {
    if (!single) return ["top-left", "top-right", "bottom-left", "bottom-right"];
    if (single.assetId && single.fitMode === "fit-width") return ["middle-left", "middle-right"];
    if (single.assetId && single.fitMode === "fit-height") return ["top-center", "bottom-center"];
    if (keepRatio) return ["top-left", "top-right", "bottom-left", "bottom-right"];
    return ["top-left", "top-center", "top-right", "middle-right", "bottom-right", "bottom-center", "bottom-left", "middle-left"];
  })();

  /** Screen point (relative to the container) to sheet millimetres. */
  const toSheet = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const { pan: p, zoom: z } = useEditor.getState();
    const s = z * PX_PER_MM;
    return { x: (clientX - rect.left - p.x) / s, y: (clientY - rect.top - p.y) / s };
  };

  /* ---------- design pointer and drag handling ---------- */

  const onDesignPointerDown = (d: Design) => (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const evt = e.evt as MouseEvent;
    if (evt.button === 1 || spaceDown) return; // let the stage pan
    e.cancelBubble = true;
    if (evt.button === 2) {
      if (!useEditor.getState().selection.includes(d.id)) useEditor.getState().select([d.id]);
      return;
    }
    const additive = evt.shiftKey || evt.ctrlKey || evt.metaKey;
    const state = useEditor.getState();
    if (additive) state.select([d.id], "toggle");
    else if (!state.selection.includes(d.id)) state.select([d.id]);
  };

  const onDragStart = () => {
    const { doc: current, selection: sel } = useEditor.getState();
    dragOrigin.current = new Map(current.designs.filter((d) => sel.includes(d.id)).map((d) => [d.id, { x: d.x, y: d.y }]));
    useEditor.getState().setInteracting(true);
  };

  const onDragMove = (d: Design) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const { doc: current, selection: sel } = useEditor.getState();
    const candidate = { ...d, x: node.x() - d.width / 2, y: node.y() - d.height / 2 };
    const others = current.designs.filter((o) => !sel.includes(o.id) && o.id !== d.id);
    const res = resolveDrag(candidate, { page: current.page, others, pxPerMm, bypassSnap: e.evt.altKey });
    node.position({ x: res.x + d.width / 2, y: res.y + d.height / 2 });
    setGuides(res.guides);
    const origin = dragOrigin.current?.get(d.id);
    let moved: RectT[] = [designBounds({ ...d, x: res.x, y: res.y })];
    if (origin) {
      const dx = res.x - origin.x;
      const dy = res.y - origin.y;
      moved = [];
      for (const other of current.designs) {
        if (!sel.includes(other.id) && other.id !== d.id) continue;
        const o = dragOrigin.current!.get(other.id);
        if (!o) continue;
        if (other.id !== d.id) nodeRefs.current.get(other.id)?.position({ x: o.x + dx + other.width / 2, y: o.y + dy + other.height / 2 });
        moved.push(designBounds({ ...other, x: o.x + dx, y: o.y + dy }));
      }
    }
    const block = unionBounds(moved)!;
    setGaps(measureGaps(block, others.map(designBounds), printableRect(current.page)));
    setReadout(`X ${formatUnit(res.x, u, current.page.dpi)}  Y ${formatUnit(res.y, u, current.page.dpi)} ${u}`);
  };

  const onDragEnd = () => {
    const { doc: current, selection: sel, moveDesigns } = useEditor.getState();
    const moves = current.designs
      .filter((d) => sel.includes(d.id))
      .map((d) => {
        const n = nodeRefs.current.get(d.id);
        return n ? { id: d.id, x: n.x() - d.width / 2, y: n.y() - d.height / 2 } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    const origin = dragOrigin.current;
    const moved = moves.some((m) => {
      const o = origin?.get(m.id);
      return !o || Math.abs(o.x - m.x) > 1e-6 || Math.abs(o.y - m.y) > 1e-6;
    });
    if (moved) moveDesigns(moves);
    dragOrigin.current = null;
    setGuides([]);
    setGaps([]);
    setReadout(null);
    useEditor.getState().setInteracting(false);
  };

  /** Box a node describes right now, converting any gesture scale into size. */
  const boxFromNode = (d: Design, node: Konva.Node) => {
    let width = Math.max(MIN_BOX_MM, d.width * Math.abs(node.scaleX()));
    let height = Math.max(MIN_BOX_MM, d.height * Math.abs(node.scaleY()));
    const asset = d.assetId ? useEditor.getState().assets[d.assetId] : undefined;
    if (asset && boxFollowsImage(d.fitMode)) {
      const source = croppedSourceSize({ width: asset.naturalWidth, height: asset.naturalHeight }, d.crop);
      ({ width, height } = normalizeBox({ ...d, width, height }, source));
    }
    return { width, height, x: node.x() - width / 2, y: node.y() - height / 2, rotation: node.rotation() };
  };

  const onTransform = (d: Design) => (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const box = boxFromNode(d, node);
    if (!useEditor.getState().interacting) useEditor.getState().setInteracting(true);
    setLive((prev) => ({ ...prev, [d.id]: { scale: { x: node.scaleX(), y: node.scaleY() }, box } }));
    const dpi = useEditor.getState().doc.page.dpi;
    setReadout(
      `${formatUnit(box.width, u, dpi)} × ${formatUnit(box.height, u, dpi)} ${u}, ${Math.round(((box.rotation % 360) + 360) % 360)}°`,
    );
  };

  const onTransformEnd = () => {
    // Transformer fires transformend once per node; commit all nodes on the first.
    const { doc: current, selection: sel, moveDesigns } = useEditor.getState();
    const moves = current.designs
      .filter((d) => sel.includes(d.id))
      .map((d) => {
        const node = nodeRefs.current.get(d.id);
        if (!node || (node.scaleX() === 1 && node.scaleY() === 1 && node.rotation() === d.rotation)) return null;
        const box = boxFromNode(d, node);
        node.scale({ x: 1, y: 1 });
        return { id: d.id, ...box };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    if (moves.length > 0) moveDesigns(moves);
    setLive({});
    setReadout(null);
    useEditor.getState().setInteracting(false);
  };

  /* ---------- stage: pan, marquee, wheel, context menu ---------- */

  const pointer = (e: Konva.KonvaEventObject<PointerEvent | WheelEvent>) =>
    e.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };

  const onStagePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    const p = pointer(e);
    const middle = e.evt.button === 1;
    if (e.evt.button === 2) {
      if (e.target === stage) useEditor.getState().clearSelection();
      return;
    }
    if (!middle && !spaceDown && e.target !== stage) return;
    if (!middle && !spaceDown && e.evt.shiftKey) {
      gesture.current = { kind: "marquee", startX: p.x, startY: p.y, additive: true };
      setMarquee({ x: p.x, y: p.y, width: 0, height: 0 });
      return;
    }
    const current = useEditor.getState().pan;
    gesture.current = { kind: "pan", startX: p.x, startY: p.y, panX: current.x, panY: current.y, moved: false };
    setPanning(true);
  };

  const onStagePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const g = gesture.current;
    if (!g) return;
    const p = pointer(e);
    if (g.kind === "pan") {
      const dx = p.x - g.startX;
      const dy = p.y - g.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) g.moved = true;
      useEditor.getState().setPan({ x: g.panX + dx, y: g.panY + dy });
    } else {
      setMarquee({ x: Math.min(g.startX, p.x), y: Math.min(g.startY, p.y), width: Math.abs(p.x - g.startX), height: Math.abs(p.y - g.startY) });
    }
  };

  const onStagePointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    setPanning(false);
    if (!g) return;
    if (g.kind === "pan") {
      if (!g.moved && !spaceDown) useEditor.getState().clearSelection();
      return;
    }
    if (marquee && marquee.width > 2 && marquee.height > 2) {
      const { pan: p, zoom: z, doc: current } = useEditor.getState();
      const s = z * PX_PER_MM;
      const area = { x: (marquee.x - p.x) / s, y: (marquee.y - p.y) / s, width: marquee.width / s, height: marquee.height / s };
      const hits = current.designs.filter((d) => rectsOverlap(area, designBounds(d))).map((d) => d.id);
      useEditor.getState().select(hits, g.additive ? "add" : "replace");
    }
    setMarquee(null);
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const state = useEditor.getState();
    if (e.evt.ctrlKey || e.evt.metaKey) {
      state.zoomTo(state.zoom * Math.exp(-e.evt.deltaY * 0.0025), pointer(e));
    } else {
      const dx = e.evt.shiftKey ? e.evt.deltaY : e.evt.deltaX;
      const dy = e.evt.shiftKey ? 0 : e.evt.deltaY;
      state.setPan({ x: state.pan.x - dx, y: state.pan.y - dy });
    }
  };

  /* ---------- drop: files from the desktop, images from Uploads ---------- */

  const accepts = (e: React.DragEvent) =>
    e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes(ASSET_DRAG_TYPE);

  const onDragOver = (e: React.DragEvent) => {
    if (!accepts(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropActive(true);
    const point = toSheet(e.clientX, e.clientY);
    const slot = designAt(useEditor.getState().doc.designs, point, (d) => d.assetId === null);
    setDropTarget(slot?.id ?? null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const target = dropTarget;
    setDropTarget(null);
    const point = toSheet(e.clientX, e.clientY);
    const assetId = e.dataTransfer.getData(ASSET_DRAG_TYPE);
    if (assetId) {
      if (target) {
        useEditor.getState().fillSlot(target, assetId);
        useEditor.getState().select([target]);
      } else placeAssetAt(assetId, point);
      return;
    }
    const files = [...e.dataTransfer.files];
    if (files.length === 0) return;
    if (target) {
      void uploadIntoSlot(files[0], target);
      if (files.length > 1) void uploadFiles(files.slice(1));
    } else {
      void uploadFiles(files, { at: point });
    }
  };

  /* ---------- derived overlays ---------- */

  const shown = doc.designs.map((d) => (live[d.id] ? { ...d, ...live[d.id].box } : d));
  const outOfBounds = shown.filter((d) => placementStatus(d, doc.page).exceedsPrintable);
  const selectionBounds = unionBounds(shown.filter((d) => selection.includes(d.id)).map(designBounds));
  const printable = printableRect(doc.page);
  const toScreen = (x: number, y: number) => ({ left: pan.x + x * pxPerMm, top: pan.y + y * pxPerMm });

  const lowDpi = doc.designs.flatMap((d) => {
    const a = d.assetId ? assets[d.assetId] : undefined;
    if (!a || live[d.id]) return [];
    const natural = { width: a.naturalWidth, height: a.naturalHeight };
    const rect = computeImageRect(d, croppedSourceSize(natural, d.crop));
    const q = resolutionReport(natural, d.crop, rect);
    return q.level === "low" ? [{ d, dpi: Math.round(q.effectiveDpi) }] : [];
  });

  const readoutPos = selectionBounds
    ? toScreen(selectionBounds.x + selectionBounds.width / 2, selectionBounds.y + selectionBounds.height)
    : null;

  const cursor = panning ? "grabbing" : spaceDown ? "grab" : undefined;

  return (
    <CanvasContextMenu>
      <div
        ref={containerRef}
        className="canvas-surface relative h-full w-full touch-none overflow-hidden select-none"
        style={{ cursor }}
        onDragOver={onDragOver}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropActive(false);
            setDropTarget(null);
          }
        }}
        onDrop={onDrop}
        role="application"
        aria-label="Sheet editor canvas. Use the quick actions bar and the properties panel for precise values."
      >
        {viewport.width > 0 && (
          <Stage
            width={viewport.width}
            height={viewport.height}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerLeave={onStagePointerUp}
            onWheel={onWheel}
          >
            <Layer>
              <Group x={pan.x} y={pan.y} scaleX={pxPerMm} scaleY={pxPerMm}>
                <PrintSheet page={doc.page} pxPerMm={pxPerMm} />
                {doc.designs.map((d) => {
                  const asset = d.assetId ? (assets[d.assetId] ?? null) : null;
                  if (d.assetId && !asset) return null;
                  return (
                    <DesignNode
                      key={d.id}
                      ref={(node) => {
                        if (node) nodeRefs.current.set(d.id, node);
                        else nodeRefs.current.delete(d.id);
                      }}
                      design={d}
                      asset={asset}
                      pxPerMm={pxPerMm}
                      hovered={hovered === d.id && !selection.includes(d.id)}
                      dropTarget={dropTarget === d.id}
                      draggable={!d.locked && !spaceDown}
                      onHover={(h) => setHovered(h ? d.id : null)}
                      onPointerDown={onDesignPointerDown(d)}
                      onDblClick={() => {
                        if (!d.assetId) fileInput.current?.click();
                        else useEditor.getState().setInspectorOpen(true);
                      }}
                      onDragStart={onDragStart}
                      onDragMove={onDragMove(d)}
                      onDragEnd={onDragEnd}
                      onTransform={onTransform(d)}
                      onTransformEnd={onTransformEnd}
                      previewScale={live[d.id]?.scale}
                    />
                  );
                })}
                {doc.page.cropMarks &&
                  shown.flatMap((d) =>
                    cropMarksFor(designBounds(d)).map((m, i) => (
                      <Line key={`mark-${d.id}-${i}`} points={[m.x1, m.y1, m.x2, m.y2]} stroke="#000" strokeWidth={CROP_MARK.width} listening={false} />
                    )),
                  )}
                {outOfBounds.map((d) => {
                  const b = designBounds(d);
                  return (
                    <Rect key={`oob-${d.id}`} x={b.x} y={b.y} width={b.width} height={b.height} stroke="#cc2848" strokeWidth={1.5} strokeScaleEnabled={false} dash={[6, 4]} listening={false} />
                  );
                })}
                {guides.map((g, i) =>
                  g.orientation === "vertical" ? (
                    <Line key={`g${i}`} points={[g.position, -10, g.position, page.height + 10]} stroke={GUIDE} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
                  ) : (
                    <Line key={`g${i}`} points={[-10, g.position, page.width + 10, g.position]} stroke={GUIDE} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
                  ),
                )}
                {gaps.map((g, i) => {
                  const tick = 4 / pxPerMm;
                  return g.axis === "x" ? (
                    <Group key={`gap${i}`} listening={false}>
                      <Line points={[g.from, g.at, g.to, g.at]} stroke={GUIDE} strokeWidth={1} strokeScaleEnabled={false} />
                      <Line points={[g.from, g.at - tick, g.from, g.at + tick]} stroke={GUIDE} strokeWidth={1} strokeScaleEnabled={false} />
                      <Line points={[g.to, g.at - tick, g.to, g.at + tick]} stroke={GUIDE} strokeWidth={1} strokeScaleEnabled={false} />
                    </Group>
                  ) : (
                    <Group key={`gap${i}`} listening={false}>
                      <Line points={[g.at, g.from, g.at, g.to]} stroke={GUIDE} strokeWidth={1} strokeScaleEnabled={false} />
                      <Line points={[g.at - tick, g.from, g.at + tick, g.from]} stroke={GUIDE} strokeWidth={1} strokeScaleEnabled={false} />
                      <Line points={[g.at - tick, g.to, g.at + tick, g.to]} stroke={GUIDE} strokeWidth={1} strokeScaleEnabled={false} />
                    </Group>
                  );
                })}
              </Group>
              <Transformer
                ref={transformerRef}
                rotateEnabled
                flipEnabled={false}
                keepRatio={keepRatio}
                enabledAnchors={anchors}
                ignoreStroke
                anchorSize={12}
                anchorStroke="rgba(16,24,40,0.25)"
                anchorStrokeWidth={1}
                anchorFill="#ffffff"
                anchorStyleFunc={(anchor) => {
                  // Canva-style handles: round corners, pill-shaped sides, round rotate knob.
                  const name = anchor.name();
                  anchor.cornerRadius(6);
                  anchor.shadowColor("black");
                  anchor.shadowOpacity(0.18);
                  anchor.shadowBlur(3);
                  anchor.shadowOffsetY(1);
                  if (name.includes("top-center") || name.includes("bottom-center")) {
                    anchor.width(22);
                    anchor.height(7);
                    anchor.offsetX(11);
                    anchor.offsetY(3.5);
                  } else if (name.includes("middle-left") || name.includes("middle-right")) {
                    anchor.width(7);
                    anchor.height(22);
                    anchor.offsetX(3.5);
                    anchor.offsetY(11);
                  }
                }}
                borderStroke={ACCENT}
                borderStrokeWidth={2}
                rotateAnchorOffset={28}
                rotateAnchorCursor="grab"
                rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                rotationSnapTolerance={4}
                padding={1}
                boundBoxFunc={(oldBox, newBox) => {
                  const min = MIN_BOX_MM * pxPerMm;
                  if (Math.abs(newBox.width) < min || Math.abs(newBox.height) < min) return oldBox;
                  const { doc: current, pan: p } = useEditor.getState();
                  if (current.page.constrainToPrintable && Math.abs(newBox.rotation) < 1e-6) {
                    const area = printableRect(current.page);
                    const left = p.x + area.x * pxPerMm - 0.5;
                    const top = p.y + area.y * pxPerMm - 0.5;
                    const right = p.x + (area.x + area.width) * pxPerMm + 0.5;
                    const bottom = p.y + (area.y + area.height) * pxPerMm + 0.5;
                    if (newBox.x < left || newBox.y < top || newBox.x + newBox.width > right || newBox.y + newBox.height > bottom) return oldBox;
                  }
                  return newBox;
                }}
              />
              {marquee && <Rect {...marquee} fill="rgba(7,125,137,0.10)" stroke={ACCENT} strokeWidth={1} listening={false} />}
            </Layer>
          </Stage>
        )}

        <Rulers width={viewport.width} height={viewport.height} pan={pan} pxPerMm={pxPerMm} page={page} highlight={selectionBounds} />

        {/* Live gap labels: crisp HTML pills at the middle of each gap line. */}
        {gaps.map((g, i) => {
          const mid = (g.from + g.to) / 2;
          const pos = g.axis === "x" ? toScreen(mid, g.at) : toScreen(g.at, mid);
          return (
            <span
              key={`gl${i}`}
              className="tnum pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-guide px-1.5 py-px text-[10.5px] font-semibold text-white shadow"
              style={pos}
            >
              {formatUnit(g.value, u, doc.page.dpi)}
            </span>
          );
        })}

        {lowDpi.map(({ d, dpi }) => {
          const b = designBounds(d);
          const pos = toScreen(b.x, b.y);
          return (
            <span
              key={`dpi-${d.id}`}
              className="tnum pointer-events-none absolute z-10 rounded-md bg-danger px-1.5 py-0.5 text-[10.5px] font-semibold text-white shadow"
              style={{ left: pos.left + 4, top: pos.top + 4 }}
            >
              {dpi} DPI
            </span>
          );
        })}

        {readout && readoutPos && (
          <div
            className="tnum pointer-events-none absolute z-20 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white shadow-lg"
            style={{ left: readoutPos.left, top: Math.min(readoutPos.top + 36, viewport.height - 32) }}
          >
            {readout}
          </div>
        )}

        {doc.designs.length === 0 && viewport.width > 0 && (
          <EmptySheet
            rect={{
              x: pan.x + printable.x * pxPerMm,
              y: pan.y + printable.y * pxPerMm,
              width: printable.width * pxPerMm,
              height: printable.height * pxPerMm,
            }}
            onUpload={() => fileInput.current?.click()}
          />
        )}

        {dropActive && !dropTarget && (
          <div className="pointer-events-none absolute inset-3 z-30 flex items-start justify-center rounded-xl border-2 border-dashed border-accent bg-accent/5 pt-6">
            <div className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[13px] font-medium shadow-pop">
              <ImagePlus className="size-4 text-accent" />
              Drop to place on the sheet, or onto an empty product box
            </div>
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          onChange={(e) => {
            const files = e.target.files ? [...e.target.files] : [];
            const sel = useEditor.getState().selection;
            const slot = sel.length === 1 ? useEditor.getState().doc.designs.find((d) => d.id === sel[0] && !d.assetId) : undefined;
            if (slot && files[0]) {
              void uploadIntoSlot(files[0], slot.id);
              if (files.length > 1) void uploadFiles(files.slice(1));
            } else if (files.length) void uploadFiles(files);
            e.target.value = "";
          }}
        />
      </div>
    </CanvasContextMenu>
  );
}

function EmptySheet({ rect, onUpload }: { rect: RectT; onUpload: () => void }) {
  const compact = rect.width < 300;
  const setTab = useEditor((s) => s.setSidebarTab);
  const setPanelOpen = useEditor((s) => s.setPanelOpen);
  return (
    <div
      className="pointer-events-none absolute z-10 flex items-center justify-center p-4"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    >
      <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line-strong bg-surface/80 px-6 py-7 text-center backdrop-blur-sm">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
          <ImagePlus className="size-5" />
        </span>
        <p className="text-[17px] font-semibold tracking-tight text-ink">Start your print sheet</p>
        {!compact && (
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Drop images here, or pick a product to get a template at its real print size. Nothing is ever cropped.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={onUpload}>
            <Upload />
            Upload images
          </Button>
          <Button
            onClick={() => {
              setTab("products");
              setPanelOpen(true);
            }}
          >
            <Package />
            Choose a product
          </Button>
        </div>
        <button type="button" onClick={() => void loadSampleSheet()} className="flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline">
          <Sparkles className="size-3.5" />
          Or open the sample sheet
        </button>
      </div>
    </div>
  );
}
