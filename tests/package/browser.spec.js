import { test, expect } from '@playwright/test';

// How a browser app can load the package. `network` pages fetch dependencies
// from esm.sh; set SKIP_NETWORK=1 to skip them.
const PAGES = [
  { name: 'Vite build', path: '/out/vite/index.html', e2e: true },
  { name: 'webpack build', path: '/pages/webpack.html' },
  { name: 'bundle loaded without a bundler', path: '/pages/bundle.html', e2e: true },
  { name: 'browser build with dependencies from esm.sh', path: '/pages/esm-sh.html', network: true },
];

// End-to-end checks against the live network and the test registry, run in one
// bundler setup and one without a bundler
const E2E = [
  { check: 'fetchAndVerify', title: 'fetches a published nanopub and verifies its signature' },
  { check: 'query', title: 'queries the network' },
  { check: 'publish', title: 'signs, publishes to the test registry and reads it back' },
];

async function runCheck(page, path, check) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto(path);
  await page.waitForFunction(() => typeof globalThis.runCheck === 'function');
  const result = await page.evaluate((name) => globalThis.runCheck(name), check);

  expect(errors).toEqual([]);
  return result;
}

for (const { name, path, e2e, network } of PAGES) {
  test.describe(name, () => {
    test.skip(!!network && !!process.env.SKIP_NETWORK, 'SKIP_NETWORK is set');

    test('loads, signs and verifies offline', async ({ page }) => {
      const { sourceUri } = await runCheck(page, path, 'smoke');
      expect(sourceUri).toMatch(/^https:\/\/w3id\.org\/np\/RA/);
    });

    if (!e2e) return;

    test.describe('e2e', () => {
      test.skip(!!process.env.SKIP_NETWORK, 'SKIP_NETWORK is set');
      test.describe.configure({ timeout: 60_000 });

      for (const { check, title } of E2E) {
        test(title, async ({ page }) => {
          await runCheck(page, path, check);
        });
      }
    });
  });
}
