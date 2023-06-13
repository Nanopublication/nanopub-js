import summary from 'rollup-plugin-summary'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import nodePolyfills from 'rollup-plugin-polyfill-node';
import {terser} from 'rollup-plugin-terser'
// import minifyHTML from 'rollup-plugin-minify-html-literals';


const rollupConf = {
  input: 'src/index.ts',
  plugins: [
    typescript(),
    commonjs(), // https://github.com/rollup/plugins/tree/master/packages/commonjs
    // Resolve bare module specifiers to relative paths:
    nodeResolve({preferBuiltins: true, browser: true, jsnext: true, main: true}),
    nodePolyfills(),
    summary()
  ],
  onwarn(warning) {
    if (warning.code !== 'THIS_IS_UNDEFINED') {
      console.error(`(!) ${warning.message}`)
    }
  }
}

// Config used for testing, 3 outputs: a normal with external dependencies, one with all dependencies bundled, and one bundled and minified
export default [
  {
    ...rollupConf,
    output: [
      {
        file: 'dist/index.js',
        format: 'esm'
        // name: '[name].js'
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
        file: 'dist/index.bundle.js',
        format: 'esm'
      },
      {
        file: 'dist/index.min.js',
        format: 'umd',
        name: 'NP',
        globals: {n3: 'n3'},
        plugins: [terser({})]
      }
    ]
  }
]
