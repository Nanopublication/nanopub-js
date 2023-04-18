import {defineConfig} from 'vitest/config'

// https://vitest.dev/guide/browser.html
// https://github.com/vitest-dev/vitest/blob/main/examples/lit/package.json
export default defineConfig({
  test: {
    // globals: true,
    // environment: 'jsdom'
    // browser: {
    //   enabled: true,
    //   headless: true,
    //   name: 'chrome' // browser name is required
    // }
    testTimeout: 60_000,
    hookTimeout: 60_000
  }
})
