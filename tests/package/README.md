# Package tests

Tests the packed `@nanopub/nanopub-js` the way consumers get it from npm, in every supported environment. The checks are in [checks.js](checks.js):

- `smoke`, offline, in every environment: parse, serialize, sign, verify, and the lazily loaded SPARQL parser
- end-to-end, in the browser, against the live network: fetch a published nanopub and verify it, run a query, and sign, publish to the test registry and read it back

| Environment | How | Checks |
|---|---|---|
| Node | [node.js](node.js) imports the default, `./bundle` and `./constants` entries | smoke |
| Vite | [consumer.js](consumer.js) built with Vite's default configuration | smoke, e2e |
| webpack | [consumer.js](consumer.js) built with webpack's default configuration, no polyfills | smoke |
| Browser, no bundler | [pages/bundle.html](pages/bundle.html) loads `dist/nanopub.bundle.js` directly | smoke, e2e |
| Browser, esm.sh | [pages/esm-sh.html](pages/esm-sh.html) loads `dist/index.js` with its dependencies from esm.sh | smoke |
| Package metadata | `publint` and `arethetypeswrong` on the tarball | |

Browser checks run in Chromium, Firefox and WebKit with Playwright.

## Running locally

From the repository root:

```bash
yarn test:package
```

This builds and packs the library into `tests/package/nanopub-js.tgz`, installs it here with npm, and runs the tests. The first time, install the browsers in this directory with `npx playwright install --with-deps`.

`SKIP_NETWORK=1` skips everything that needs the network: the e2e checks and the esm.sh page. To see a page in a browser, run `node serve.js`, open e.g. http://localhost:4173/pages/bundle.html, and run `await runCheck('smoke')` in the console.
