import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import dts from "vite-plugin-dts";

export default defineConfig({
  // We no longer need `vite-plugin-top-level-await` as we now lazy-load `@nanopub/sign`.
  plugins: [wasm(), dts({ rollupTypes: true })],
  optimizeDeps: {
    exclude: ["@nanopub/sign"],
  },
  // Build in library mode with separate browser and node entry points.
  // The browser entry (index) uses Web Crypto only; the node entry imports
  // from Node's built-in 'crypto' module which is kept external.
  build: {
    lib: {
      entry: {
        index: "src/index.ts",  // browser entry (Web Crypto, no Node crypto)
        node: "src/node.ts",    // Node.js entry (Node crypto, kept external)
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ['crypto', 'node:crypto', 'buffer'],
    },
  },

  resolve: {
    conditions: ["module", "import", "default"],
  },

  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],

    server: {
      deps: {
        optimizer: {
          ssr: {
            include: ["@nanopub/sign/dist/index.js"],
            exclude: ["@nanopub/sign"],
          },
        },
      },
    },

    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },

});
