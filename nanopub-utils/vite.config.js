import {defineConfig} from 'vite'
import {terser} from 'rollup-plugin-terser'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import dts from 'vite-plugin-dts'
import typescript from '@rollup/plugin-typescript'

// NOTE: vite build not used at the moment, we use tsc directly

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
      // formats: ["esm"],
      // fileName: (format) => `nanopub-rdf.${format}.js`,
    },
    minify: true,
    sourcemap: true,
    cssCodeSplit: true,

    rollupOptions: [{
      // input: 'src/index.ts',
      output: [
        {
          entryFileNames: '[name].bundle.js',
          format: 'esm'
        },
        {
          entryFileNames: '[name].min.js',
          name: '[name].min.js',
          format: 'umd',
          globals: {
            n3: 'n3',
          },
          plugins: [
            terser({
              // ecma: 2020,
              // module: true,
              // warnings: true
            })
          ]
        }
      ],
      rollupPlugins,
      // Adding env BUNDLE=true will bundle all dependencies in the final JS
      // https://vitejs.dev/guide/build.html#library-mode
      // external: process.env.BUNDLE ? [] : [/^n3/]
      external: []
    },
    {
      // input: 'src/index.ts',
      output: [
        {
          entryFileNames: '[name].js',
          format: 'esm'
        },
      ],
      rollupPlugins,
      // Adding env BUNDLE=true will bundle all dependencies in the final JS
      // https://vitejs.dev/guide/build.html#library-mode
      external: process.env.BUNDLE ? [] : [/^n3/]
      // external: []
    }
  ]
  },
  optimizeDeps: {
    include: ['n3']
  },
  plugins: [
    dts()
    // ViteMinifyPlugin({}),
  ]
  // define: {
  //     global: {},
  // },
})

const rollupPlugins = [
  typescript(),
  // typescript({
  //   "compilerOptions": {
  //     "outDir": "dist",
  //     "declaration": true,
  //     "declarationDir": "."
  //   }
  // }),
  commonjs(),
  nodeResolve({preferBuiltins: true, browser: true})
]
