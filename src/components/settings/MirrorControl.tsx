"use client";

/**
 * Output mirror: Process default / On / Off, with the effective result and
 * what to set in the printer driver. Used by the Sheet panel and the export
 * and print dialog, so the choice is always visible before output.
 */

import { FlipHorizontal2 } from "lucide-react";
import type { MirrorMode, PageSettings } from "@/types/editor";
import { Segmented } from "@/components/ui/segmented";
import { Note } from "./Section";
import { driverAdvice, processMirrorDefault, resolveMirror } from "@/lib/render/mirror";
import { PROCESS_LABELS } from "@/lib/catalogue/processes";

export function MirrorControl({
  page,
  onChange,
  compact = false,
}: {
  page: Pick<PageSettings, "process" | "mirrorMode">;
  onChange: (mode: MirrorMode) => void;
  compact?: boolean;
}) {
  const mirrored = resolveMirror(page);
  const def = processMirrorDefault(page.process);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-ink-muted">Mirror output</span>
        <span
          data-testid="mirror-effective"
          className={mirrored ? "flex items-center gap-1 text-[12px] font-semibold text-accent" : "text-[12px] font-semibold text-ink"}
        >
          {mirrored && <FlipHorizontal2 className="size-3.5" />}
          {mirrored ? "Mirrored" : "Not mirrored"}
        </span>
      </div>
      <Segmented<MirrorMode>
        ariaLabel="Mirror output"
        value={page.mirrorMode}
        onValueChange={onChange}
        options={[
          { value: "auto", label: `Auto (${def ? "on" : "off"})` },
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ]}
      />
      {!compact && (
        <Note icon={<FlipHorizontal2 />} className="mt-2">
          {driverAdvice(page)} Auto follows the process ({PROCESS_LABELS[page.process]}: {def ? "mirrored" : "not mirrored"}).
          Sheetfit cannot see or change the printer driver&apos;s own mirror setting.
        </Note>
      )}
    </div>
  );
}
