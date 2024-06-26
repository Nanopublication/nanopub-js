// import {legacyPlugin} from '@web/dev-server-legacy'
import {playwrightLauncher} from '@web/test-runner-playwright'
import {esbuildPlugin} from '@web/dev-server-esbuild'
import {default as rollupCommonjs} from '@rollup/plugin-commonjs'
import {fromRollup} from '@web/dev-server-rollup'
const commonjs = fromRollup(rollupCommonjs)

const mode = process.env.MODE || 'dev'
if (!['dev', 'prod'].includes(mode)) {
  throw new Error(`MODE must be "dev" or "prod", was "${mode}"`)
}

// Uncomment for testing on Sauce Labs
// Must run `npm i --save-dev @web/test-runner-saucelabs` and set
// SAUCE_USERNAME and SAUCE_USERNAME environment variables
// ===========
// import {createSauceLabsLauncher} from '@web/test-runner-saucelabs';
// const sauceLabsLauncher = createSauceLabsLauncher(
//   {
//     user: process.env.SAUCE_USERNAME,
//     key: process.env.SAUCE_USERNAME,
//   },
//   {
//     'sauce:options': {
//       name: 'unit tests',
//       build: `${process.env.GITHUB_REF ?? 'local'} build ${
//         process.env.GITHUB_RUN_NUMBER ?? ''
//       }`,
//     },
//   }
// );

// Uncomment for testing on BrowserStack
// Must run `npm i --save-dev @web/test-runner-browserstack` and set
// BROWSER_STACK_USERNAME and BROWSER_STACK_ACCESS_KEY environment variables
// ===========
// import {browserstackLauncher as createBrowserstackLauncher} from '@web/test-runner-browserstack';
// const browserstackLauncher = (config) => createBrowserstackLauncher({
//   capabilities: {
//     'browserstack.user': process.env.BROWSER_STACK_USERNAME,
//     'browserstack.key': process.env.BROWSER_STACK_ACCESS_KEY,
//     project: 'my-element',
//     name: 'unit tests',
//     build: `${process.env.GITHUB_REF ?? 'local'} build ${
//       process.env.GITHUB_RUN_NUMBER ?? ''
//     }`,
//     ...config,
//   }
// });

const browsers = {
  // Local browser testing via playwright
  // ===========
  chromium: playwrightLauncher({product: 'chromium'}),
  firefox: playwrightLauncher({product: 'firefox'})
  // TODO: missing dependencies for linux: libpcre.so.3 libicui18n.so.66 libicuuc.so.66 libjpeg.so.8 libwebp.so.6 libflite.so.1 libflite_usenglish.so.1 libflite_cmulex.so.1  libflite_cmu_us_awb.so.1 libflite_cmu_us_kal.so.1 libflite_cmu_us_rms.so.1 libflite_cmu_us_slt.so.1 libffi.so.7 libx264.so
  // webkit: playwrightLauncher({product: 'webkit'}),

  // Uncomment example launchers for running on Sauce Labs
  // ===========
  // chromium: sauceLabsLauncher({browserName: 'chrome', browserVersion: 'latest', platformName: 'Windows 10'}),
  // firefox: sauceLabsLauncher({browserName: 'firefox', browserVersion: 'latest', platformName: 'Windows 10'}),
  // edge: sauceLabsLauncher({browserName: 'MicrosoftEdge', browserVersion: 'latest', platformName: 'Windows 10'}),
  // ie11: sauceLabsLauncher({browserName: 'internet explorer', browserVersion: '11.0', platformName: 'Windows 10'}),
  // safari: sauceLabsLauncher({browserName: 'safari', browserVersion: 'latest', platformName: 'macOS 10.15'}),

  // Uncomment example launchers for running on Sauce Labs
  // ===========
  // chromium: browserstackLauncher({browserName: 'Chrome', os: 'Windows', os_version: '10'}),
  // firefox: browserstackLauncher({browserName: 'Firefox', os: 'Windows', os_version: '10'}),
  // edge: browserstackLauncher({browserName: 'MicrosoftEdge', os: 'Windows', os_version: '10'}),
  // ie11: browserstackLauncher({browserName: 'IE', browser_version: '11.0', os: 'Windows', os_version: '10'}),
  // safari: browserstackLauncher({browserName: 'Safari', browser_version: '14.0', os: 'OS X', os_version: 'Big Sur'}),
}

// Prepend BROWSERS=x,y to `npm run test` to run a subset of browsers
// e.g. `BROWSERS=chromium,firefox npm run test`
const noBrowser = b => {
  throw new Error(`No browser configured named '${b}'; using defaults`)
}
let commandLineBrowsers
try {
  commandLineBrowsers = process.env.BROWSERS?.split(',').map(b => browsers[b] ?? noBrowser(b))
} catch (e) {
  console.warn(e)
}

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
export default {
  rootDir: './dist',
  // files: ['./dist/test/*_test.js'],
  // rootDir: './src',
  files: ['./src/test/*_test.ts'],
  // files: ['src/**/*.test.ts'],
  nodeResolve: true,
  // nodeResolve: {exportConditions: mode === 'dev' ? ['development'] : []},
  // preserveSymlinks: true,
  // browsers: commandLineBrowsers ?? Object.values(browsers),
  // testFramework: {
  //   // https://mochajs.org/api/mocha
  //   config: {
  //     ui: 'tdd',
  //     timeout: '60000'
  //   }
  // },
  plugins: [
    commonjs({
      include: [
        // Allows @testing-library/react-hooks to be consumed as an ES module
        'node_modules/@testing-library/**/*',
        'node_modules/react-dom/**/*',
        'node_modules/object-assign/**/*',
        'node_modules/scheduler/**/*',
        'node_modules/prop-types/**/*'
      ]
    }),
    esbuildPlugin({ts: true})
    // esbuildPlugin({ts: true, target: 'es2020', sourceMap: true})
    // Detect browsers without modules (e.g. IE11) and transform to SystemJS
    // (https://modern-web.dev/docs/dev-server/plugins/legacy/).
    // legacyPlugin({
    //   polyfills: {
    //     webcomponents: true,
    //     // Inject lit's polyfill-support module into test files, which is required
    //     // for interfacing with the webcomponents polyfills
    //     custom: [
    //       {
    //         name: 'lit-polyfill-support',
    //         path: 'node_modules/lit/polyfill-support.js',
    //         test: "!('attachShadow' in Element.prototype) || !('getRootNode' in Element.prototype) || window.ShadyDOM && window.ShadyDOM.force",
    //         module: false,
    //       },
    //     ],
    //   },
    // }),
  ]
}
