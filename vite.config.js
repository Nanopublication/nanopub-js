import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// The browser build has to bundle Buffer, the node build keeps it external
export default defineConfig(({ mode }) => {
  const node = mode === "node";

  return {
    plugins: node ? [] : [dts({ rollupTypes: true })],

    build: {
      emptyOutDir: !node,
      lib: {
        entry: node
          ? { node: "src/node.ts" }
          : { index: "src/index.ts" },
        formats: ["es"],
      },
      rollupOptions: {
        external: node
          ? ["crypto", "node:crypto", "buffer"]
          : ["crypto", "node:crypto"],
      },
    },

    resolve: {
      conditions: ["module", "import", "default"],
    },

    test: {
      environment: "node",
      globals: true,
      setupFiles: ["./tests/setup.ts"],

      // See vitest.config.js — `poolOptions` was removed in Vitest 4.
      maxWorkers: 1,
    },

  };
});
