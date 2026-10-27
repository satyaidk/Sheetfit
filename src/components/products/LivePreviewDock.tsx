"use client";

/**
 * Live product preview docked on the canvas.
 *
 * While a page holds a product box, the product is always visible next to
 * the sheet with the design on it, updating as the design changes, so users
 * never have to look for the preview. It follows the selected product box (or
 * a selected plain image, shown on a T-shirt), else the first product box on
 * the page. Blank colours can be switched right here; the expand button opens
 * the large preview. It collapses to a pill, and reserves its width on the
 * right of the canvas so fit-to-screen never hides the sheet behind it.
 */

import { useEffect } from "react";
import { Box, ChevronsRight, Expand, Shirt } from "lucide-react";
import { PREVIEW_DOCK_MIN_CANVAS, PREVIEW_DOCK_PX, useEditor } from "@/store/editor-store";
import { findProduct } from "@/lib/catalogue/products";
import { colorsFor, resolveColor } from "@/lib/catalogue/colors";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ProductMockup } from "./ProductMockup";
import { designImageUrl } from "./design-image";
import { blendFor } from "./MockupPreview";

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
    selected && (selected.productId || selected.assetId) ? selected : designs.find((d) => d.productId);
  const asset = useEditor((s) => (target?.assetId ? s.assets[target.assetId] : undefined));
  const roomy = viewportWidth >= PREVIEW_DOCK_MIN_CANVAS;
  const shown = !!target && open && roomy;

  // Keep the sheet clear of the dock when fitting it to the screen.
  useEffect(() => {
    setRightInset(shown ? PREVIEW_DOCK_PX : 0);
  }, [shown, setRightInset]);
  useEffect(() => () => setRightInset(0), [setRightInset]);

  if (!target) return null;
  const product = findProduct(target.productId) ?? findProduct("tee-full-front")!;
  const isProductBox = !!target.productId;
  const color = resolveColor(product, target.productColor);
  const image = asset ? designImageUrl(target, asset, 480) : null;

  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => (roomy ? setOpen(true) : openMockup(target.id))}
        className="absolute top-[84px] right-3 z-20 flex h-9 items-center gap-1.5 rounded-full bg-surface pr-3.5 pl-3 text-[12.5px] font-semibold shadow-bar ring-1 ring-line hover:bg-subtle"
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
          <p className="truncate text-[12.5px] font-semibold">{isProductBox ? product.name : "On a T-shirt"}</p>
          <p className="truncate text-[11px] text-ink-muted">{isProductBox ? product.detail : "Plain image, not a product box"}</p>
        </div>
        <Tooltip label="3D model">
          <button
            type="button"
            aria-label="View in 3D"
            onClick={() => openMockup(target.id)}
            className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-semibold text-ink-muted hover:bg-subtle hover:text-ink"
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
      <button
        type="button"
        onClick={() => openMockup(target.id)}
        className="relative mx-2 block w-[216px] rounded-xl bg-[radial-gradient(circle_at_50%_32%,var(--surface)_0%,var(--subtle-2)_75%)]"
        aria-label={`${product.name} preview, click to enlarge`}
      >
        <ProductMockup
          product={product}
          color={color.hex}
          design={image}
          blend={blendFor(process)}
          showArea={!image}
          className="aspect-square w-full p-2 drop-shadow-[0_8px_10px_rgb(16_24_40/0.16)]"
        />
        {!image && (
          <span className="absolute inset-x-3 bottom-2 rounded-md bg-surface/95 px-2 py-1 text-center text-[11px] font-medium text-ink-muted shadow-sm">
            Add a design to see it here
          </span>
        )}
      </button>
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
                  "size-5 rounded-full ring-1 ring-black/15 transition-transform hover:scale-110",
                  c.id === color.id && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                )}
                style={{ background: c.hex }}
              />
            </Tooltip>
          ))}
        </div>
      ) : (
        <p className="px-3 pt-2 pb-3 text-[11px] leading-snug text-ink-muted">Add a product from Products to print at its exact size.</p>
      )}
    </aside>
  );
}
