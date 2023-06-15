import summary from 'rollup-plugin-summary'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import {terser} from 'rollup-plugin-terser'

const rollupConf = {
  input: 'dist/index.js',
  plugins: [
    replace({
      preventAssignment: true,
      'Reflect.decorate': 'undefined'
    }),
    commonjs(), // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({preferBuiltins: true, browser: true, jsnext: true, main: true}),
    nodePolyfills(),
    summary()
  ]
}

// https://lit.dev/docs/tools/production/
// Config used for testing, 3 outputs: a normal with external dependencies, one with all dependencies bundled, and one bundled and minified
export default [
  {
    ...rollupConf,
    output: [
      {
        file: 'dist/nanopub-display.js',
        format: 'esm'
      }
    ],
    // No external for testing, everything needs to be bundled
    external: process.env.BUNDLE ? [] : [/^lit/, /^@nanopub\/utils/, /^n3/]
  },
  {
    ...rollupConf,
    // Everything is bundled
    external: [],
    output: [
      {
        file: 'dist/nanopub-display.esm.js',
        format: 'esm'
      },
      {
        file: 'dist/nanopub-display.min.js',
        format: 'umd',
        name: 'NanopubDisplay',
        // globals: { lit: 'lit', n3: 'n3' },
        // format: "esm", // NOTE: apparently esm is not supported by firefox web workers, use UMD?
        plugins: [terser({})]
      }
    ]
  }
]
