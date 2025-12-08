import { defineConfig } from "vite";

export default defineConfig({
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
