import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import {ViteMinifyPlugin} from 'vite-plugin-minify';
import filesize from 'rollup-plugin-filesize';
import {terser} from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import nodeGlobals from 'rollup-plugin-node-globals';

// import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
// import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
// import rollupNodePolyFill from "rollup-plugin-node-polyfills";

const plugins = [
  typescript({
    compilerOptions: {
      declaration: true
      // declarationDir: "types/",
    }
  }),
  // TODO: resolves imports, but fail due to N3.js https://github.com/rdfjs/N3.js/issues/257
  // nodeGlobals(),
  // nodeResolve(),
  filesize({
    showMinifiedSize: false,
    showBrotliSize: true
  })
];

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: ['esnext'],
    lib: {
      entry: 'src/index.ts',
      name: 'nanopub-rdf'
      // fileName: (format) => `nanopub-rdf.${format}.js`,
      // dir: "dist",
      // formats: ["es"],
    },
    minify: true,
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: 'src/index.ts',
      output: [
        {
          file: 'dist/nanopub-display.js',
          // dir: "dist",
          format: 'esm'
        },
        {
          file: 'dist/nanopub-display.min.js',
          // dir: "dist",
          format: 'esm',
          plugins: [terser()]
        }
      ],
      plugins
      // external: /^@microsoft\/fast-(element|components)/
      // external: /^@microsoft\/fast-element/,
      // Added from rollup.config.js
      // input: "src/index.ts",
      // output: [
      //     {
      //         // file: "dist/nanopub-display.js",
      //         dir: "dist",
      //         format: "esm",
      //     },
      //     {
      //         // file: "dist/nanopub-display.min.js",
      //         dir: "dist",
      //         format: "esm",
      //         plugins: [terser()],
      //     },
      // ],
      // plugins,
    }
  },
  optimizeDeps: {
    include: ['@microsoft/fast-element', 'n3', 'cytoscape', 'cytoscape-popper', 'cytoscape-cose-bilkent']
  },
  plugins: [
    dts()
    // terser(),
    // input https://www.npmjs.com/package/html-minifier-terser options
    // ViteMinifyPlugin({}),
  ]
  // define: {
  //     global: {},
  // },
});
