import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm()],
  test: {
    globals: true,
    environment: "happy-dom", 
    include: ["tests/**/*.test.ts"],
    deps: {
      inline: ["@nanopub/sign"], 
    },
    poolOptions: {
      threads: { singleThread: true },
    },
  },
});
