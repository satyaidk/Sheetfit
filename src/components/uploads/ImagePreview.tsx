/* eslint-disable @next/next/no-img-element -- object URLs of local files cannot go through next/image */
import type { LoadedAsset } from "@/types/image";

/** Thumbnail of an uploaded image, shown whole (contain) on a checkerboard. */
export function ImagePreview({ asset }: { asset: LoadedAsset }) {
  return (
    <div>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[4px] bg-[conic-gradient(#eceee9_25%,#fff_0_50%,#eceee9_0_75%,#fff_0)] bg-[length:12px_12px]">
        <img src={asset.objectUrl} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
      </div>
      <p className="mt-1 truncate text-[12px] font-medium" title={asset.name}>
        {asset.name}
      </p>
      <p className="tnum text-[11px] text-ink-muted">
        {asset.naturalWidth} × {asset.naturalHeight} px{asset.hasAlpha ? ", transparent" : ""}
      </p>
    </div>
  );
}
