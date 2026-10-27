"use client";

/**
 * The print sheet as drawn in the editor: paper, printable-area guide and the
 * optional millimetre grid. Coordinates are millimetres; the parent group
 * applies zoom and pan. Hairlines use `strokeScaleEnabled={false}` so they
 * stay one screen pixel wide at any zoom.
 */

import { Group, Rect, Shape } from "react-konva";
import type { PageSettings } from "@/types/editor";
import { pageSize, printableRect } from "@/lib/layout/sheet-layout";

let checker: HTMLCanvasElement | null = null;
function checkerPattern(): HTMLCanvasElement {
  if (checker) return checker;
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#eceef1";
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillRect(8, 8, 8, 8);
  checker = c;
  return c;
}

export function PrintSheet({ page, pxPerMm }: { page: PageSettings; pxPerMm: number }) {
  const size = pageSize(page);
  const printable = printableRect(page);
  const transparent = page.background === null;
  const hasMargins = printable.width < size.width || printable.height < size.height;

  return (
    <Group listening={false}>
      <Rect
        width={size.width}
        height={size.height}
        fill={transparent ? undefined : page.background!}
        fillPatternImage={transparent ? (checkerPattern() as unknown as HTMLImageElement) : undefined}
        // Keep the checker squares a constant screen size.
        fillPatternScale={transparent ? { x: 1 / pxPerMm, y: 1 / pxPerMm } : undefined}
        shadowColor="#000"
        shadowOpacity={0.14}
        shadowBlur={18 / pxPerMm}
        shadowOffsetY={4 / pxPerMm}
      />
      {page.showGrid && page.gridSize > 0 && (
        <Shape
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            for (let x = page.gridSize; x < size.width; x += page.gridSize) {
              ctx.moveTo(x, 0);
              ctx.lineTo(x, size.height);
            }
            for (let y = page.gridSize; y < size.height; y += page.gridSize) {
              ctx.moveTo(0, y);
              ctx.lineTo(size.width, y);
            }
            ctx.strokeShape(shape);
          }}
          stroke="rgba(7, 125, 137, 0.14)"
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
      )}
      {hasMargins && (
        <Rect
          x={printable.x}
          y={printable.y}
          width={printable.width}
          height={printable.height}
          stroke="#077d89"
          strokeWidth={1}
          strokeScaleEnabled={false}
          dash={[4, 3]}
          opacity={0.45}
        />
      )}
    </Group>
  );
}
