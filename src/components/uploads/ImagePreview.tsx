/* eslint-disable @next/next/no-img-element -- object URLs of local files cannot go through next/image */
import type { LoadedAsset } from "@/types/image";
import { maxPrintSizeAt } from "@/lib/image/image-resolution";

/**
 * Thumbnail of an uploaded image, shown whole on a checkerboard, with the
 * largest size it prints sharply (300 DPI). That number answers "how big can I
 * print this?" before the image is even placed.
 */
export function ImagePreview({ asset }: { asset: LoadedAsset }) {
  const max = maxPrintSizeAt({ width: asset.naturalWidth, height: asset.naturalHeight }, 300);
  return (
    <div>
      <div className="checker flex aspect-square items-center justify-center overflow-hidden rounded-md">
        <img src={asset.objectUrl} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
      </div>
      <p className="mt-1.5 truncate text-[12px] font-medium" title={asset.name}>
        {asset.name}
      </p>
      <p className="tnum text-[11px] text-ink-muted">
        {asset.naturalWidth} × {asset.naturalHeight} px{asset.hasAlpha ? ", transparent" : ""}
      </p>
      <p className="tnum text-[11px] text-ink-faint">
        Sharp up to {Math.round(max.width)} × {Math.round(max.height)} mm
      </p>
    </div>
  );
}
