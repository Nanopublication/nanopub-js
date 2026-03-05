import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        inline: ["@nanopub/sign"],  // This is only required for vitest to work with nanopub-rs (wasm)
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        "tests/**",
        "examples/**",
        "src/types",
        "src/validate.ts", // TEMP excluding until validate is implemented
        "*/*.d.ts",
        "*.config.{ts,js}"
      ],    },
    poolOptions: {
      threads: { singleThread: true },
    },
  },
});
