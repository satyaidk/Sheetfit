"use client";

/**
 * The interactive workspace: a cutting-mat viewport with rulers, the A4 sheet
 * and every design on it.
 *
 * Scene graph:
 *   Stage (viewport pixels)
 *   └─ Layer
 *      ├─ Group  x/y = pan, scale = zoom × px-per-mm   ← everything below is in mm
 *      │  ├─ A4PrintSheet
 *      │  ├─ DesignNode × n
 *      │  └─ guides and out-of-bounds outlines
 *      └─ Transformer (screen space)
 *
 * Konva owns the pointer interaction while a gesture is in progress. Drags
 * are resolved through `resolveDrag` (snapping and constraints) on every move
 * and committed to the store once, on release, so one gesture is one undo
 * step. During a resize Konva scales the group; the node re-fits and
 * counter-scales the image so it is never shown stretched, and on release the
 * scale is converted into a real width and height.
 */

import { useEffect, useRef, useState } from "react";
import { Group, Layer, Line, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import { ImagePlus, Sparkles, Upload } from "lucide-react";
import { PX_PER_MM, useEditor } from "@/store/editor-store";
import type { Design } from "@/types/editor";
import { A4PrintSheet } from "./A4PrintSheet";
import { DesignNode } from "./ImageLayer";
import { Rulers } from "./Rulers";
import { designBounds, pageSize, placementStatus, printableRect, rectsOverlap } from "@/lib/layout/a4-layout";
import { boxFollowsImage, croppedSourceSize, normalizeBox, type Rect as RectT } from "@/lib/image/image-fit";
import { resolveDrag } from "@/lib/layout/drag";
import { CROP_MARK, cropMarksFor } from "@/lib/render/render-plan";
import type { SnapGuide } from "@/lib/layout/alignment";
import { unionBounds } from "@/lib/layout/alignment";
import { uploadFiles } from "@/lib/editor-actions";
import { loadSampleSheet } from "@/lib/sample";
import { ACCEPT_ATTR } from "@/lib/image/image-loader";
import { Button } from "@/components/ui/button";
import { formatUnit } from "@/lib/layout/coordinate-conversion";

/** Group scale and resulting box of a resize gesture in progress. */
type LiveResize = { scale: { x: number; y: number }; box: Pick<Design, "x" | "y" | "width" | "height" | "rotation"> };

const MIN_BOX_MM = 1;

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
  const page = pageSize(doc.page.orientation);

  const [hovered, setHovered] = useState<string | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [live, setLive] = useState<Record<string, LiveResize>>({});
  const [readout, setReadout] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<RectT | null>(null);
  const [dropActive, setDropActive] = useState(false);

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

  const keepRatio = single ? single.lockAspect || single.fitMode === "manual" : true;
  const anchors = (() => {
    if (!single) return ["top-left", "top-right", "bottom-left", "bottom-right"];
    if (single.fitMode === "fit-width") return ["middle-left", "middle-right"];
    if (single.fitMode === "fit-height") return ["top-center", "bottom-center"];
    if (keepRatio) return ["top-left", "top-right", "bottom-left", "bottom-right"];
    return [
      "top-left", "top-center", "top-right", "middle-right",
      "bottom-right", "bottom-center", "bottom-left", "middle-left",
    ];
  })();

  /* ---------- design pointer and drag handling ---------- */

  const onDesignPointerDown = (d: Design) => (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    const evt = e.evt as MouseEvent;
    if (evt.button === 1) return;
    const additive = evt.shiftKey || evt.ctrlKey || evt.metaKey;
    const state = useEditor.getState();
    if (additive) state.select([d.id], "toggle");
    else if (!state.selection.includes(d.id)) state.select([d.id]);
  };

  const onDragStart = () => {
    const { doc: current, selection: sel } = useEditor.getState();
    dragOrigin.current = new Map(
      current.designs.filter((d) => sel.includes(d.id)).map((d) => [d.id, { x: d.x, y: d.y }]),
    );
  };

  const onDragMove = (d: Design) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const { doc: current, selection: sel } = useEditor.getState();
    const candidate = { ...d, x: node.x() - d.width / 2, y: node.y() - d.height / 2 };
    const others = current.designs.filter((o) => !sel.includes(o.id) && o.id !== d.id);
    const res = resolveDrag(candidate, {
      page: current.page,
      others,
      pxPerMm,
      bypassSnap: e.evt.altKey,
    });
    node.position({ x: res.x + d.width / 2, y: res.y + d.height / 2 });
    setGuides(res.guides);
    const origin = dragOrigin.current?.get(d.id);
    if (origin) {
      const dx = res.x - origin.x;
      const dy = res.y - origin.y;
      for (const other of current.designs) {
        if (other.id === d.id || !sel.includes(other.id)) continue;
        const o = dragOrigin.current!.get(other.id);
        const n = nodeRefs.current.get(other.id);
        if (o && n) n.position({ x: o.x + dx + other.width / 2, y: o.y + dy + other.height / 2 });
      }
    }
    setReadout(
      `X ${formatUnit(res.x, unit, current.page.dpi)}  Y ${formatUnit(res.y, unit, current.page.dpi)} ${unit}`,
    );
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
    setReadout(null);
  };

  /** Box a node describes right now, converting any gesture scale into size. */
  const boxFromNode = (d: Design, node: Konva.Node) => {
    let width = Math.max(MIN_BOX_MM, d.width * Math.abs(node.scaleX()));
    let height = Math.max(MIN_BOX_MM, d.height * Math.abs(node.scaleY()));
    const asset = useEditor.getState().assets[d.assetId];
    if (asset && boxFollowsImage(d.fitMode)) {
      const source = croppedSourceSize({ width: asset.naturalWidth, height: asset.naturalHeight }, d.crop);
      ({ width, height } = normalizeBox({ ...d, width, height }, source));
    }
    return { width, height, x: node.x() - width / 2, y: node.y() - height / 2, rotation: node.rotation() };
  };

  const onTransform = (d: Design) => (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const box = boxFromNode(d, node);
    setLive((prev) => ({ ...prev, [d.id]: { scale: { x: node.scaleX(), y: node.scaleY() }, box } }));
    const dpi = useEditor.getState().doc.page.dpi;
    setReadout(
      `${formatUnit(box.width, unit, dpi)} × ${formatUnit(box.height, unit, dpi)} ${unit}, ${Math.round(((box.rotation % 360) + 360) % 360)}°`,
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
  };

  /* ---------- stage: pan, marquee, wheel ---------- */

  const pointer = (e: Konva.KonvaEventObject<PointerEvent | WheelEvent>) =>
    e.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };

  const onStagePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    const p = pointer(e);
    const middle = e.evt.button === 1;
    if (!middle && e.target !== stage) return;
    if (!middle && e.evt.shiftKey) {
      gesture.current = { kind: "marquee", startX: p.x, startY: p.y, additive: true };
      setMarquee({ x: p.x, y: p.y, width: 0, height: 0 });
      return;
    }
    const current = useEditor.getState().pan;
    gesture.current = { kind: "pan", startX: p.x, startY: p.y, panX: current.x, panY: current.y, moved: false };
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
      setMarquee({
        x: Math.min(g.startX, p.x),
        y: Math.min(g.startY, p.y),
        width: Math.abs(p.x - g.startX),
        height: Math.abs(p.y - g.startY),
      });
    }
  };

  const onStagePointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.kind === "pan") {
      if (!g.moved) useEditor.getState().clearSelection();
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
      const factor = Math.exp(-e.evt.deltaY * 0.0025);
      state.zoomTo(state.zoom * factor, pointer(e));
    } else {
      const dx = e.evt.shiftKey ? e.evt.deltaY : e.evt.deltaX;
      const dy = e.evt.shiftKey ? 0 : e.evt.deltaY;
      state.setPan({ x: state.pan.x - dx, y: state.pan.y - dy });
    }
  };

  /* ---------- file drop ---------- */

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
  };

  /* ---------- derived overlays ---------- */

  // Designs as currently displayed, including any resize in progress.
  const shown = doc.designs.map((d) => (live[d.id] ? { ...d, ...live[d.id].box } : d));
  const outOfBounds = shown.filter((d) => placementStatus(d, doc.page).exceedsPrintable);
  const selectionBounds = unionBounds(shown.filter((d) => selection.includes(d.id)).map(designBounds));
  const printable = printableRect(doc.page);

  const readoutPos = selectionBounds
    ? {
        left: pan.x + (selectionBounds.x + selectionBounds.width / 2) * pxPerMm,
        top: pan.y + (selectionBounds.y + selectionBounds.height) * pxPerMm + 34,
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="mat-surface relative h-full w-full touch-none overflow-hidden select-none"
      onDragOver={onDragOver}
      onDragLeave={() => setDropActive(false)}
      onDrop={onDrop}
      role="application"
      aria-label="A4 sheet editor. Use the properties panel for precise values."
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
              <A4PrintSheet page={doc.page} pxPerMm={pxPerMm} />
              {doc.designs.map((d) => {
                const asset = assets[d.assetId];
                if (!asset) return null;
                return (
                  <DesignNode
                    key={d.id}
                    ref={(node) => {
                      if (node) nodeRefs.current.set(d.id, node);
                      else nodeRefs.current.delete(d.id);
                    }}
                    design={d}
                    asset={asset}
                    hovered={hovered === d.id && !selection.includes(d.id)}
                    draggable={!d.locked}
                    onHover={(h) => setHovered(h ? d.id : null)}
                    onPointerDown={onDesignPointerDown(d)}
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
                    <Line
                      key={`mark-${d.id}-${i}`}
                      points={[m.x1, m.y1, m.x2, m.y2]}
                      stroke="#000"
                      strokeWidth={CROP_MARK.width}
                      listening={false}
                    />
                  )),
                )}
              {outOfBounds.map((d) => {
                const b = designBounds(d);
                return (
                  <Rect
                    key={`oob-${d.id}`}
                    x={b.x}
                    y={b.y}
                    width={b.width}
                    height={b.height}
                    stroke="#e0337a"
                    strokeWidth={1.5}
                    strokeScaleEnabled={false}
                    dash={[6, 4]}
                    listening={false}
                  />
                );
              })}
              {guides.map((g, i) =>
                g.orientation === "vertical" ? (
                  <Line
                    key={i}
                    points={[g.position, -10, g.position, page.height + 10]}
                    stroke="#ff2d8a"
                    strokeWidth={1}
                    strokeScaleEnabled={false}
                    listening={false}
                  />
                ) : (
                  <Line
                    key={i}
                    points={[-10, g.position, page.width + 10, g.position]}
                    stroke="#ff2d8a"
                    strokeWidth={1}
                    strokeScaleEnabled={false}
                    listening={false}
                  />
                ),
              )}
            </Group>
            <Transformer
              ref={transformerRef}
              rotateEnabled
              flipEnabled={false}
              keepRatio={keepRatio}
              enabledAnchors={anchors}
              ignoreStroke
              anchorSize={9}
              anchorCornerRadius={2}
              anchorStroke="#00a0e0"
              anchorFill="#ffffff"
              borderStroke="#00a0e0"
              borderStrokeWidth={1.5}
              rotateAnchorOffset={26}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={4}
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
                  if (newBox.x < left || newBox.y < top || newBox.x + newBox.width > right || newBox.y + newBox.height > bottom) {
                    return oldBox;
                  }
                }
                return newBox;
              }}
            />
            {marquee && (
              <Rect
                {...marquee}
                fill="rgba(0,160,224,0.12)"
                stroke="#00a0e0"
                strokeWidth={1}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      )}

      <Rulers
        width={viewport.width}
        height={viewport.height}
        pan={pan}
        pxPerMm={pxPerMm}
        page={page}
        highlight={selectionBounds}
      />

      {readout && readoutPos && (
        <div
          className="tnum pointer-events-none absolute z-20 -translate-x-1/2 rounded-[4px] bg-ink px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-white"
          style={{ left: readoutPos.left, top: Math.min(readoutPos.top, viewport.height - 28) }}
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

      {dropActive && (
        <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-cyan-bright bg-[#0d1a15]/40">
          <div className="flex items-center gap-2 rounded-md bg-surface px-4 py-2.5 text-sm font-medium shadow-xl">
            <ImagePlus className="size-4 text-cyan" />
            Drop to place on the sheet
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
          if (e.target.files) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function EmptySheet({ rect, onUpload }: { rect: RectT; onUpload: () => void }) {
  const compact = rect.width < 260;
  return (
    <div
      className="absolute z-10 flex flex-col items-center justify-center gap-3 rounded-[3px] border-2 border-dashed border-line-strong px-4 text-center"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    >
      <p className="font-condensed text-[22px] leading-tight font-semibold text-ink">
        Put a design on this sheet
      </p>
      {!compact && (
        <p className="max-w-64 text-[13px] text-ink-muted">
          Drop a PNG, JPG or WebP here. It is placed at its native size at 300 DPI, whole and uncropped.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={onUpload}>
          <Upload />
          Upload image
        </Button>
        <Button onClick={() => void loadSampleSheet()}>
          <Sparkles />
          Open sample sheet
        </Button>
      </div>
    </div>
  );
}
