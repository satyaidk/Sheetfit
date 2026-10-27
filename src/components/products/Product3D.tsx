"use client";

/**
 * Lazy wrapper for the 3D view: three.js (about 150 kB gzipped) is only
 * downloaded when a 3D preview is first shown, never for the editor itself.
 */

import dynamic from "next/dynamic";
import { Box } from "lucide-react";

export const Product3D = dynamic(() => import("./Product3DView"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_50%_38%,var(--surface),var(--subtle-2))]">
      <span className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-muted shadow-sm">
        <Box className="size-4 animate-pulse text-accent" /> Loading 3D view…
      </span>
    </div>
  ),
});
