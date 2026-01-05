/**
 * Lazy-loading + one-time initialization for `@nanopub/sign`.
 *
 * This enables running @nanopub/sign (wasm) in browser environments, while still
 * having a small bundle size on initial load, by importing wasm only when actually
 * needed (e.g. sign/publish).
 */

type NanopubSignWebModule = typeof import("@nanopub/sign/web.js");
type NanopubSignBundlerModule = typeof import("@nanopub/sign/bundler.js");

const isNode =
  typeof process !== "undefined" &&
  typeof process.versions !== "undefined" &&
  typeof process.versions.node === "string";

// Vitest can run with a DOM shim (e.g. happy-dom) while still being Node.
// Prefer the Node build whenever we're in Node to avoid browser-init paths.
const isBrowser =
  !isNode && typeof window !== "undefined" && typeof document !== "undefined";

let modulePromise: Promise<
  NanopubSignWebModule | NanopubSignBundlerModule
> | null = null;
let webInitPromise: Promise<unknown> | null = null;

/**
 * Returns an initialized `@nanopub/sign` module appropriate for the current runtime.
 *
 * - Browser: dynamically imports `@nanopub/sign/web.js` and initializes it with a wasm URL.
 * - Node: dynamically imports `@nanopub/sign/bundler.js` (self-initializing).
 */
export async function getNanopubSignModule(): Promise<
  NanopubSignWebModule | NanopubSignBundlerModule
> {
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    if (isBrowser) {
      const mod = await import("@nanopub/sign/web.js");

      // Initialize WASM once per runtime.
      if (!webInitPromise) {
        const wasmUrl = (await import("@nanopub/sign/web_bg.wasm?url")).default;
        webInitPromise = mod.default(wasmUrl);
      }
      await webInitPromise;

      return mod;
    }

    // Always prefer the ESM bundler entry when not in a real browser, regardless of
    // whether it is Node or not.
    // This avoids importing `@nanopub/sign/node.js` (which relies on Node `__dirname`),
    // which can throw runtime errors in some "node" environments such as Vitest.
    return await import("@nanopub/sign/bundler.js");
  })();

  return modulePromise;
}
