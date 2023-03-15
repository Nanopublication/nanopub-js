import summary from 'rollup-plugin-summary';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import {terser} from 'rollup-plugin-terser';
// import minifyHTML from 'rollup-plugin-minify-html-literals';

const rollupConf = {
  input: 'dist/index.js',
  plugins: [
    replace({
      preventAssignment: true,
      'Reflect.decorate': 'undefined'
      // exclude: 'node_modules/**',
      // ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    commonjs(), // https://github.com/rollup/plugins/tree/master/packages/commonjs
    // Resolve bare module specifiers to relative paths
    resolve({preferBuiltins: true, browser: true, jsnext: true, main: true}),
    // minifyHTML(), // Minify HTML template literals
    summary()
  ],
  onwarn(warning) {
    if (warning.code !== 'THIS_IS_UNDEFINED') {
      console.error(`(!) ${warning.message}`);
    }
  }
};

// https://lit.dev/docs/tools/production/
// 3 outputs: a normal with external dependencies, one with all dependencies bundled, and one bundled and minified
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
    external: process.env.BUNDLE ? [] : [/^lit/, /^n3/]
  },
  {
    ...rollupConf,
    // Everything is bundled
    external: [],
    output: [
      {
        file: 'dist/nanopub-display.bundle.js',
        format: 'esm'
      },
      {
        file: 'dist/nanopub-display.min.js',
        format: 'iife',
        name: '[name].min.js',
        // globals: { lit: 'lit', n3: 'n3' },
        // format: "esm", // NOTE: apparently esm is not supported by firefox web workers, use UMD?
        plugins: [
          terser({
            ecma: 2020,
            module: true,
            warnings: true
          })
        ]
      }
    ]
  }
];
