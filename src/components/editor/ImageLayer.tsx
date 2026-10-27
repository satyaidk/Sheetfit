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
import { Group, Image as KImage, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { computeImageRect, croppedSourceSize, sourceCropRect } from "@/lib/image/image-fit";
import { findProduct } from "@/lib/catalogue/products";
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
}

export const DesignNode = forwardRef<Konva.Group, DesignNodeProps>(function DesignNode(
  { design, asset, hovered, dropTarget, pxPerMm, draggable, onHover, onPointerDown, onDblClick, previewScale, ...handlers },
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
    const fitted = computeImageRect(
      { ...design, width: w * sx, height: h * sy },
      croppedSourceSize(natural, design.crop),
    );
    const r = { x: fitted.x / sx, y: fitted.y / sy, width: fitted.width / sx, height: fitted.height / sy };
    const crop = design.crop ? sourceCropRect(natural, design.crop) : undefined;
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
  const label = product ? `${product.name}, ${product.detail}` : design.name;
  const fontSize = 12 * px;
  // Small boxes get a plus sign instead of a label that would not fit.
  const showLabel = !asset && w * pxPerMm > 130 && h * pxPerMm > 72;
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
              ? "rgba(7,125,137,0.16)"
              : "rgba(7,125,137,0.06)"
            : design.fitMode === "fill" && design.fillColor
              ? design.fillColor
              : "rgba(0,0,0,0)"
        }
      />
      {imageNode}
      {!asset && (
        <>
          <Rect
            width={w}
            height={h}
            stroke={ACCENT}
            strokeWidth={dropTarget ? 2 : 1.25}
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
            <Text
              x={0}
              y={h / 2 - fontSize * 1.6}
              width={w}
              align="center"
              text={`${label}\n${dropTarget ? "Release to place" : "Drop an image here"}`}
              fontSize={fontSize}
              lineHeight={1.5}
              fontFamily={uiFontFamily()}
              fontStyle="600"
              fill="#05656f"
              listening={false}
            />
          )}
        </>
      )}
      {design.border && (
        <Rect x={0.1} y={0.1} width={w - 0.2} height={h - 0.2} stroke="#000" strokeWidth={0.2} listening={false} />
      )}
      {/* Trim line for products that include bleed. */}
      {design.bleed > 0 && (
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
