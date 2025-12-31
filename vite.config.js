import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import dts from "vite-plugin-dts";

export default defineConfig({
  // These plugins allow wasm (@nanopub/sign) to be bundled as a buffer in the library for seamless use in browser environments
  // We no longer need `vite-plugin-top-level-await` as we now lazy-load `@nanopub/sign`.
  plugins: [wasm(), dts({ rollupTypes: true })],
  optimizeDeps: {
    exclude: ["@nanopub/sign"],
  },
  // Build in library mode
  build: {
    lib: {
      // We now use single-entry index.ts when using vite build.
      // To add multi-entry see https://vite.dev/guide/build#library-mode
      entry: "src/index.ts",
      name: "nanopub-js",
      // the proper extensions will be added
      fileName: "index",
      // Avoid UMD output: Rollup UMD does not support top-level await and some wasm
      // dependency patterns. ESM output is the primary supported format.
      formats: ["es"],
    },
  },

  resolve: {
    conditions: ["module", "import", "default"],
  },

  test: {
    environment: "node",
    globals: true,

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
