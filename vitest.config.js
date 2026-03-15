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
    poolOptions: {
      threads: { singleThread: true },
    },
  },
});
