import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
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

    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },

});
