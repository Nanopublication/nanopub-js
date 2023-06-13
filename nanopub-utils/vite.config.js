import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'
import summary from 'rollup-plugin-summary'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import nodePolyfills from 'rollup-plugin-polyfill-node';
import {terser} from 'rollup-plugin-terser'

// NOTE: vite build not used at the moment, we use tsc directly

const rollupPlugins = [
  typescript(),
  commonjs(),
  nodeResolve({preferBuiltins: true, browser: true}),
  nodePolyfills(),
  summary()
]

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    target: ['esnext'],
    lib: {
      entry: 'src/index.ts',
      name: '@nanopub/utils',
      fileName: 'nanopub-utils',
      dir: 'dist'
    },
    minify: true,
    sourcemap: true,
    cssCodeSplit: true,

    rollupOptions:
      {
        output: [
          {
            entryFileNames: '[name].js',
            format: 'esm'
          },
          {
            entryFileNames: '[name].min.js',
            name: 'NP',
            format: 'umd',
            globals: { n3: 'n3' },
            plugins: [
              terser({}) // Minify
            ]
          }
        ],
        plugins: rollupPlugins,
        external: []
      }
  },
  optimizeDeps: {
    include: ['n3']
  },
  plugins: [
    dts()
  ]
})
