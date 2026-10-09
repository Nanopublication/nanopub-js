import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { createRequire } from "node:module";

const { dependencies } = createRequire(import.meta.url)("./package.json");
const NODE_BUILTINS = ["crypto", "buffer", "stream", "util", "events", "string_decoder", "process"];
const DEPENDENCIES = Object.keys(dependencies).map((name) => new RegExp(`^${name}(/|$)`));

// Three builds:
// - browser (default): dependencies stay external so bundlers and CDNs that rewrite
//   bare imports (esm.sh, jsDelivr +esm) resolve and dedupe them
// - bundle: self-contained, for loading the file directly in a browser without a bundler
// - node: Node crypto and dependencies external
export default defineConfig(({ mode }) => {
  const node = mode === "node";
  const bundle = mode === "bundle";

  return {
    plugins: node || bundle ? [] : [dts({ rollupTypes: true })],

    build: {
      emptyOutDir: !node && !bundle,
      lib: {
        entry: node
          ? { node: "src/node.ts" }
          : bundle
            ? { "nanopub.bundle": "src/index.ts" }
            : { index: "src/index.ts", constants: "src/constants.ts" },
        formats: ["es"],
      },
      rollupOptions: {
        // Node resolves dependencies itself; bundling them inlines CJS that ESM consumers cannot require
        external: node
          ? [/^node:/, ...NODE_BUILTINS, ...DEPENDENCIES]
          : bundle
            ? ["crypto", "node:crypto"]
            : ["crypto", "node:crypto", ...DEPENDENCIES],
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
