// Minimal type shim so TypeScript understands Vite/Rollup-style `?url` imports.
//
// This avoids type errors with tsc
declare module '*?url' {
  const url: string;
  export default url;
}

