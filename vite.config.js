import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@nanopub/sign"],
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
