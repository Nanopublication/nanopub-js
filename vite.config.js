import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import dts from "vite-plugin-dts";
import arraybuffer from "vite-plugin-arraybuffer";

export default defineConfig({
  // These plugins allow wasm (@nanopub/sign) to be bundled as a buffer in the library for seamless use in browser environments
  // It does increase the build size though. There might be a more efficient storage than an arraybuffer.
  // The dts plugin generates types (.d.ts file) in the build dist folder
  plugins: [arraybuffer(), wasm(), topLevelAwait(), dts({ rollupTypes: true })],
  optimizeDeps: {
    exclude: ["@nanopub/sign"],
  },
  // Build in library mode
  build: {
    lib: {
      entry: "src/index.ts",
      name: "nanopub-js",
      // the proper extensions will be added
      fileName: "index",
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
