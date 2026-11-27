"use client";

/**
 * One design on the canvas: its box, optional background and border, and the
 * image placed by the fitting engine, or an empty product slot.
 *
 * The Konva group is positioned at the box centre with an offset of half the
 * box, so Konva rotates around the centre exactly as the render plan and the
 * exporters do. The image is the original decoded element; Konva scales it
 * at draw time, so no pixels are resampled into a new bitmap while editing.
 *
 * While a resize handle is being dragged, Konva scales the whole group. To
 * avoid ever showing a stretched preview, `previewScale` tells this node the
 * group's current scale: the image is re-fitted for the scaled box and then
 * counter-scaled, so it appears at its true, undistorted proportions.
 */

import { forwardRef } from "react";
import { Group, Image as KImage, Rect, Shape, Text } from "react-konva";
import type Konva from "konva";
import type { CutGuideStyle, Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { computeImageRect, effectiveSourceRect } from "@/lib/image/image-fit";
import { findProduct } from "@/lib/catalogue/products";
import { cutPaths, resolvedCut, safeAreaPath, type Path } from "@/lib/cut/cut-path";
import { fillPathsEvenOdd, strokeCutGuide, tracePath } from "@/lib/export/rasterize";
import { uiFontFamily } from "@/lib/utils";

const ACCENT = "#077d89";

export interface DesignNodeProps {
  design: Design;
  /** `null` renders an empty product slot. */
  asset: LoadedAsset | null;
  hovered: boolean;
  /** Empty slot currently under a dragged file or upload. */
  dropTarget: boolean;
  draggable: boolean;
  /** Screen pixels per mm, for constant-size labels and dashes. */
  pxPerMm: number;
  onPointerDown: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransform: (e: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onDblClick: () => void;
  onHover: (hovered: boolean) => void;
  previewScale?: { x: number; y: number };
  /** Show the cut path even for plain rectangles (page "print cut lines" is on). */
  showCut?: boolean;
  /** Sticker pages: the printed white border and hand-cutting line, drawn exactly as they print. */
  sticker?: { fill: string | null; guide: CutGuideStyle | null };
}

/** The white sticker border: cut paths filled even-odd under the artwork, in true millimetres. */
function StickerUnderlay({ paths, w, h, color }: { paths: Path[]; w: number; h: number; color: string }) {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        const c = ctx._context;
        c.save();
        c.translate(w / 2, h / 2);
        fillPathsEvenOdd(c, paths, color);
        c.restore();
      }}
    />
  );
}

/** The printed hand-cutting line, at its real width and colour (it is part of the print). */
function StickerGuide({ paths, w, h, guide }: { paths: Path[]; w: number; h: number; guide: CutGuideStyle }) {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        const c = ctx._context;
        c.save();
        c.translate(w / 2, h / 2);
        strokeCutGuide(c, { paths, color: guide.color, width: guide.width, inside: guide.placement === "inside" });
        c.restore();
      }}
    />
  );
}

/** Konva shape that strokes cut paths given in box coordinates (origin top-left). */
function PathOutline({ paths, w, h, color, dash }: { paths: Path[]; w: number; h: number; color: string; dash?: number[] }) {
  return (
    <Shape
      listening={false}
      stroke={color}
      strokeWidth={1.25}
      strokeScaleEnabled={false}
      dash={dash}
      sceneFunc={(ctx, shape) => {
        ctx.save();
        // Paths are local to the box centre; the group's origin is the box top-left.
        ctx.translate(w / 2, h / 2);
        ctx.beginPath();
        for (const p of paths) tracePath(ctx as unknown as CanvasRenderingContext2D, p);
        ctx.restore();
        ctx.strokeShape(shape);
      }}
    />
  );
}

export const DesignNode = forwardRef<Konva.Group, DesignNodeProps>(function DesignNode(
  { design, asset, hovered, dropTarget, pxPerMm, draggable, onHover, onPointerDown, onDblClick, previewScale, showCut = false, sticker, ...handlers },
  ref,
) {
  const sx = previewScale?.x ?? 1;
  const sy = previewScale?.y ?? 1;
  const w = design.width;
  const h = design.height;
  const px = 1 / pxPerMm;

  let imageNode: React.ReactNode = null;
  if (asset) {
    const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
    // Same source window as every export (crop insets, then the cover window).
    const scaled = { ...design, width: w * sx, height: h * sy };
    const src = effectiveSourceRect(scaled, natural);
    const fitted = computeImageRect(scaled, { width: src.width, height: src.height });
    const r = { x: fitted.x / sx, y: fitted.y / sy, width: fitted.width / sx, height: fitted.height / sy };
    const whole = src.x === 0 && src.y === 0 && src.width === natural.width && src.height === natural.height;
    const crop = whole ? undefined : src;
    imageNode = (
      <KImage
        image={asset.element}
        x={design.flipX ? r.x + r.width : r.x}
        y={design.flipY ? r.y + r.height : r.y}
        scaleX={design.flipX ? -1 : 1}
        scaleY={design.flipY ? -1 : 1}
        width={r.width}
        height={r.height}
        crop={crop}
        listening={false}
      />
    );
  }

  const product = findProduct(design.productId);
  const cut = resolvedCut(design);
  // The printed guide replaces the dashed editor outline: it is what will print.
  const printedGuide = !!(asset && sticker?.guide);
  // Draw the real cut path when it is not a plain rectangle at the trim (or when cut lines are on).
  const shapedCut = !printedGuide && (cut.shape !== "rect" || cut.radius > 0 || cut.offset !== 0 || showCut || (!design.cut && !!product?.outline));
  const stickerPaths = asset && (sticker?.fill || sticker?.guide) ? cutPaths(design) : [];
  const paths = shapedCut ? cutPaths(design) : [];
  const safe = safeAreaPath(design);
  const label = product ? `${product.name}, ${product.detail}` : design.name;
  const fontSize = 12 * px;
  const trim = product && !product.wrap ? { w: w - design.bleed * 2, h: h - design.bleed * 2 } : { w, h };
  const size = `${+trim.w.toFixed(1)} × ${+trim.h.toFixed(1)} mm${product ? ` (${+(trim.w / 25.4).toFixed(2)} × ${+(trim.h / 25.4).toFixed(2)} in)` : ""}`;
  // Small boxes get a plus sign instead of a label that would not fit.
  const showLabel = !asset && w * pxPerMm > 150 && h * pxPerMm > 84;
  const showPlus = !asset && !showLabel && w * pxPerMm > 22 && h * pxPerMm > 22;

  return (
    <Group
      ref={ref}
      id={design.id}
      name="design"
      x={design.x + w / 2}
      y={design.y + h / 2}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={design.rotation}
      draggable={draggable}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      {...handlers}
    >
      {/* Hit area, fill-mode background, or the empty-slot surface. */}
      <Rect
        width={w}
        height={h}
        fill={
          !asset
            ? dropTarget
              ? "rgba(7,125,137,0.18)"
              : "rgba(7,125,137,0.08)"
            : design.fitMode === "fill" && design.fillColor
              ? design.fillColor
              : "rgba(0,0,0,0)"
        }
      />
      {asset && sticker?.fill && <StickerUnderlay paths={stickerPaths} w={w} h={h} color={sticker.fill} />}
      {imageNode}
      {asset && sticker?.guide && <StickerGuide paths={stickerPaths} w={w} h={h} guide={sticker.guide} />}
      {!asset && (
        <>
          <Rect
            width={w}
            height={h}
            stroke={ACCENT}
            strokeWidth={dropTarget ? 2.5 : 1.5}
            strokeScaleEnabled={false}
            dash={[6, 4]}
            listening={false}
          />
          {showPlus && (
            <Text
              x={0}
              y={h / 2 - fontSize * 1.1}
              width={w}
              align="center"
              text="+"
              fontSize={fontSize * 1.8}
              fontFamily={uiFontFamily()}
              fill="#05656f"
              listening={false}
            />
          )}
          {showLabel && (
            <>
              <Text
                x={0}
                y={h / 2 - fontSize * 2.6}
                width={w}
                align="center"
                text={label}
                fontSize={fontSize * 1.15}
                fontFamily={uiFontFamily()}
                fontStyle="700"
                fill="#05656f"
                listening={false}
              />
              <Text
                x={0}
                y={h / 2 - fontSize * 0.9}
                width={w}
                align="center"
                text={size}
                fontSize={fontSize}
                fontFamily={uiFontFamily()}
                fill="#05656f"
                listening={false}
              />
              <Text
                x={0}
                y={h / 2 + fontSize * 0.9}
                width={w}
                align="center"
                text={dropTarget ? "Release to place your design" : "Drop your design here, or click Add image"}
                fontSize={fontSize}
                fontFamily={uiFontFamily()}
                fontStyle="600"
                fill="#1b1f24"
                opacity={0.7}
                listening={false}
              />
            </>
          )}
        </>
      )}
      {design.border && (
        <Rect x={0.1} y={0.1} width={w - 0.2} height={h - 0.2} stroke="#000" strokeWidth={0.2} listening={false} />
      )}
      {shapedCut && <PathOutline paths={paths} w={w} h={h} color={cut.through === "kiss" ? "#ec2f8f" : "#05656f"} dash={[5, 3]} />}
      {safe && <PathOutline paths={[safe]} w={w} h={h} color="#05656f" dash={[1, 3]} />}
      {/* Trim line for products that include bleed. */}
      {design.bleed > 0 && !shapedCut && (
        <Rect
          x={design.bleed}
          y={design.bleed}
          width={w - design.bleed * 2}
          height={h - design.bleed * 2}
          stroke="#ec2f8f"
          strokeWidth={1}
          strokeScaleEnabled={false}
          dash={[2, 3]}
          opacity={0.75}
          listening={false}
        />
      )}
      {/* Box outline so empty space in a box is visible while editing. */}
      {asset && (
        <Rect
          width={w}
          height={h}
          stroke={hovered ? ACCENT : "rgba(27,31,36,0.22)"}
          strokeWidth={hovered ? 1.5 : 1}
          strokeScaleEnabled={false}
          dash={hovered ? undefined : [3, 3]}
          listening={false}
        />
      )}
    </Group>
  );
});
