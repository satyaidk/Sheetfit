"use client";

/**
 * Live product preview docked on the canvas.
 *
 * While a page holds a product box, the product is always visible next to
 * the sheet as a 3D model with the design on it, updating as the design
 * changes, so users never have to look for the preview. It can be turned by
 * dragging; the 3D view renders only when something changes, so leaving the
 * dock open costs nothing while the user works on the sheet. It follows the selected product box (or
 * a selected plain image, shown on a T-shirt), else the first product box on
 * the page. Blank colours can be switched right here; the expand button opens
 * the large preview. It collapses to a pill, and reserves its width on the
 * right of the canvas so fit-to-screen never hides the sheet behind it.
 */

import { useEffect, useMemo } from "react";
import { Box, ChevronsRight, Expand, Shirt } from "lucide-react";
import { PREVIEW_DOCK_MIN_CANVAS, PREVIEW_DOCK_PX, useEditor } from "@/store/editor-store";
import { colorsFor, resolveColor } from "@/lib/catalogue/colors";
import { previewOutline, previewProductFor } from "./preview-product";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Product3D } from "./Product3D";
import { designImageUrl } from "./design-image";

export function LivePreviewDock() {
  const designs = useEditor((s) => s.doc.designs);
  const selection = useEditor((s) => s.selection);
  const process = useEditor((s) => s.doc.page.process);
  const open = useEditor((s) => s.previewDock);
  const interacting = useEditor((s) => s.interacting);
  const viewportWidth = useEditor((s) => s.viewport.width);
  const setOpen = useEditor((s) => s.setPreviewDock);
  const setRightInset = useEditor((s) => s.setRightInset);
  const openMockup = useEditor((s) => s.openMockup);
  const updateDesign = useEditor((s) => s.updateDesign);

  const selected = selection.length === 1 ? designs.find((d) => d.id === selection[0]) : undefined;
  const target =
    selected && (selected.productId || selected.assetId || selected.strap) ? selected : designs.find((d) => d.productId || d.strap);
  const asset = useEditor((s) => (target?.assetId ? s.assets[target.assetId] : undefined));
  const roomy = viewportWidth >= PREVIEW_DOCK_MIN_CANVAS;
  const shown = !!target && open && roomy;

  // Keep the sheet clear of the dock when fitting it to the screen.
  useEffect(() => {
    setRightInset(shown ? PREVIEW_DOCK_PX : 0);
  }, [shown, setRightInset]);
  useEffect(() => () => setRightInset(0), [setRightInset]);

  // Memoised by value so the 3D model is not rebuilt on every render.
  const { product, kind } = useMemo(
    () => previewProductFor(target, process),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the fields that pick the preview
    [target?.id, target?.productId, target?.strap, target?.width, target?.height, target?.cut, process],
  );
  const outline = useMemo(() => previewOutline(target, kind), [target, kind]);
  if (!target) return null;
  const isProductBox = kind === "product" || kind === "sticker";
  const color = resolveColor(product, target.productColor);
  // 1024 px keeps the print sharp on the model's 2048 px texture at dock size.
  const image = asset ? designImageUrl(target, asset, 1024) : null;

  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => (roomy ? setOpen(true) : openMockup(target.id))}
        className="absolute top-[84px] right-3 z-20 flex h-9 items-center gap-1.5 rounded-full bg-surface pr-3.5 pl-3 text-caption font-semibold shadow-bar ring-1 ring-line hover:bg-subtle"
        aria-label="Show product preview"
      >
        <Shirt className="size-4 text-accent" />
        Preview
      </button>
    );
  }

  const colors = colorsFor(product);
  return (
    <aside
      aria-label="Live product preview"
      className={cn(
        "absolute top-[84px] right-3 z-20 w-[232px] overflow-hidden rounded-2xl bg-surface shadow-pop ring-1 ring-line transition-opacity animate-pop",
        interacting && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-semibold">{kind === "tee" ? "On a T-shirt" : product.name}</p>
          <p className="truncate text-caption text-ink-muted">{kind === "tee" ? "Plain image, not a product box" : product.detail}</p>
        </div>
        <Tooltip label="3D model">
          <button
            type="button"
            aria-label="View in 3D"
            onClick={() => openMockup(target.id)}
            className="flex h-7 items-center gap-1 rounded-md px-1.5 text-caption font-semibold text-ink-muted hover:bg-subtle hover:text-ink"
          >
            <Box className="size-4" />
            3D
          </button>
        </Tooltip>
        <Tooltip label="Large preview">
          <button
            type="button"
            aria-label="Open large preview"
            onClick={() => openMockup(target.id)}
            className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
          >
            <Expand className="size-4" />
          </button>
        </Tooltip>
        <Tooltip label="Hide preview">
          <button
            type="button"
            aria-label="Hide preview"
            onClick={() => setOpen(false)}
            className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
          >
            <ChevronsRight className="size-4" />
          </button>
        </Tooltip>
      </div>
      <div className="relative mx-2 aspect-square w-[216px] overflow-hidden rounded-xl" aria-label={`${product.name} in 3D`}>
        <Product3D product={product} color={color.hex} designUrl={image} process={process} toolbar={false} cutOutline={outline} kissCut={target.cut?.through === "kiss"} />
        {!image && (
          <span className="pointer-events-none absolute inset-x-3 bottom-2 rounded-md bg-surface/95 px-2 py-1 text-center text-caption font-medium text-ink-muted shadow-card">
            Add a design to see it here
          </span>
        )}
      </div>
      {isProductBox ? (
        <div role="radiogroup" aria-label="Product colour" className="flex flex-wrap gap-1 px-3 pt-2 pb-3">
          {colors.map((c) => (
            <Tooltip key={c.id} label={c.name}>
              <button
                type="button"
                role="radio"
                aria-checked={c.id === color.id}
                aria-label={c.name}
                onClick={() => updateDesign(target.id, { productColor: c.hex })}
                className={cn(
                  "size-5 rounded-full ring-1 ring-ink/20 transition-transform hover:scale-110",
                  c.id === color.id && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                )}
                style={{ background: c.hex }}
              />
            </Tooltip>
          ))}
        </div>
      ) : (
        <p className="px-3 pt-2 pb-3 text-caption leading-snug text-ink-muted">
          {kind === "strap" ? "Folded through a ring, as pressed onto white ribbon." : "Add a product from Products to print at its exact size."}
        </p>
      )}
    </aside>
  );
}
