"use client";

/**
 * Toasts in the interface theme. Sonner draws its own surfaces, so it is told
 * the resolved theme (after hydration: the server always renders light); the
 * font and radius come from the design tokens.
 */

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { usePreferences } from "@/store/preferences-store";

const noop = () => () => {};

export function ThemedToaster() {
  const theme = usePreferences((s) => s.resolvedTheme);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return (
    <Toaster
      theme={hydrated ? theme : "light"}
      position="bottom-center"
      toastOptions={{
        style: { fontFamily: "var(--font-sans)", fontSize: "var(--fs-body)", borderRadius: "var(--radius-md)" },
      }}
    />
  );
}
