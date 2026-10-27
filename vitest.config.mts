import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/store/**/*.ts"],
      // Browser-only glue (DOM canvas, image decoding, window.print, toasts)
      // is exercised end to end in a real browser rather than in Node.
      exclude: [
        "src/lib/export/export-raster.ts",
        "src/lib/export/print.ts",
        "src/lib/editor-actions.ts",
        "src/lib/sample.ts",
        "src/lib/utils.ts",
        // Draws textures on a DOM canvas; the 3D models themselves are covered.
        "src/lib/three/print-textures.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 65, statements: 80 },
      reporter: ["text", "json-summary", "html"],
    },
  },
});
