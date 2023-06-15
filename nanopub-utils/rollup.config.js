import summary from 'rollup-plugin-summary'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import {terser} from 'rollup-plugin-terser'

const rollupConf = {
  input: 'src/index.ts',
  plugins: [
    typescript({sourceMap: true}),
    commonjs(), // https://github.com/rollup/plugins/tree/master/packages/commonjs
    // Resolve bare module specifiers to relative paths:
    nodeResolve({preferBuiltins: true, browser: true, jsnext: true, main: true}),
    nodePolyfills(),
    summary()
  ]
}

// Config used for testing, 3 outputs: a normal with external dependencies, one with all dependencies bundled, and one bundled and minified
export default [
  {
    ...rollupConf,
    output: [
      {
        file: 'dist/index.js',
        format: 'esm'
      }
    ],
    // Dependencies not bundled
    external: [/^n3/]
  },
  {
    ...rollupConf,
    // Everything is bundled
    external: [],
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm'
      },
      {
        file: 'dist/index.min.js',
        format: 'umd',
        name: 'NanopubUtils',
        globals: {n3: 'n3'},
        plugins: [terser({})] // Minify
      }
    ]
  }
]
