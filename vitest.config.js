import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
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
    // Vitest 4 removed `poolOptions`; the old `threads.singleThread` is now a
    // top-level `maxWorkers: 1`. See https://vitest.dev/guide/migration#pool-rework
    // The guide's literal equivalent also sets `isolate: false`, which we skip:
    // tests assign `global.fetch` without restoring it, so dropping per-file
    // isolation would leak mocks into the live-network integration tests.
    maxWorkers: 1,
  },
});
