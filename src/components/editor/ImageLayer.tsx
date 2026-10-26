"use client";

/**
 * One design on the canvas: its box, optional background and border, and the
 * image placed by the fitting engine.
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
import { Group, Image as KImage, Rect } from "react-konva";
import type Konva from "konva";
import type { Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { computeImageRect, croppedSourceSize, sourceCropRect } from "@/lib/image/image-fit";

export interface DesignNodeProps {
  design: Design;
  asset: LoadedAsset;
  hovered: boolean;
  draggable: boolean;
  onPointerDown: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransform: (e: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onHover: (hovered: boolean) => void;
  /** Group scale during an in-progress resize gesture. */
  previewScale?: { x: number; y: number };
}

export const DesignNode = forwardRef<Konva.Group, DesignNodeProps>(function DesignNode(
  { design, asset, hovered, draggable, onHover, onPointerDown, previewScale, ...handlers },
  ref,
) {
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const sx = previewScale?.x ?? 1;
  const sy = previewScale?.y ?? 1;
  const fitted = computeImageRect(
    { ...design, width: design.width * sx, height: design.height * sy },
    croppedSourceSize(natural, design.crop),
  );
  const image = { x: fitted.x / sx, y: fitted.y / sy, width: fitted.width / sx, height: fitted.height / sy };
  const crop = design.crop ? sourceCropRect(natural, design.crop) : undefined;

  return (
    <Group
      ref={ref}
      id={design.id}
      name="design"
      x={design.x + design.width / 2}
      y={design.y + design.height / 2}
      offsetX={design.width / 2}
      offsetY={design.height / 2}
      rotation={design.rotation}
      draggable={draggable}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      {...handlers}
    >
      {/* Hit area and optional background for fill mode. */}
      <Rect
        width={design.width}
        height={design.height}
        fill={design.fitMode === "fill" && design.fillColor ? design.fillColor : "rgba(0,0,0,0)"}
      />
      <KImage
        image={asset.element}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        crop={crop}
        listening={false}
      />
      {design.border && (
        <Rect
          x={0.1}
          y={0.1}
          width={design.width - 0.2}
          height={design.height - 0.2}
          stroke="#000"
          strokeWidth={0.2}
          listening={false}
        />
      )}
      {/* Box outline so empty space in the box is visible while editing. */}
      <Rect
        width={design.width}
        height={design.height}
        stroke={hovered ? "#00a0e0" : "rgba(22,25,28,0.28)"}
        strokeWidth={hovered ? 1.5 : 1}
        strokeScaleEnabled={false}
        dash={hovered ? undefined : [3, 3]}
        listening={false}
      />
    </Group>
  );
});
