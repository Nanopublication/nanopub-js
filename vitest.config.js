import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm()],
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        "tests/**",
        "src/types",
        "src/utils/wasm.ts",
        "src/validate.ts", // TEMP excluding until validate is implemented
        "*/*.d.ts",
        "*.config.{ts,js}"
      ],    },
    deps: {
      inline: ["@nanopub/sign", "/\?url$/"], 
      
    },
    poolOptions: {
      threads: { singleThread: true },
    },
  },
});
