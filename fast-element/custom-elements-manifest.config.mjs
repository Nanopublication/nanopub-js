
export default {
    /** Globs to analyze */
    globs: ["src/*.ts", "src/**/*.ts"],
    /** Globs to exclude */
    exclude: [
        "src/__test__/*",
        "src/di/*",
        "src/design-token/*",
        "src/**/*.md",
        "src/**/*.spec.ts",
        "src/**/index.ts",
        "src/**/stories/*",
    ],
    /** Directory to output CEM to */
    outdir: "dist",
    /** Run in dev mode, provides extra logging */
    dev: false,
    /** Enable special handling for fast */
    fast: true,
    /** Include third party custom elements manifests */
    // dependencies: true,
    plugins: [],
};