# 🛠️ Utilities for Nanopublications

`@nanopub/utils` is a JavaScript library providing utility functions and objects to work with [Nanopublications](https://nanopub.net): search, fetch, parse...

You can easily import `@nanopub/utils` from a npm CDN and use it in your HTML page, or JavaScript project:

```html
<html lang="en">
  <head>
    <script type="module" src="https://unpkg.com/@nanopub/utils"></script>
  </head>

  <body>
    <h1>Check the console</h1>
  </body>

  <script type="module">
    const {getUpdateStatus, Nanopub} = NanopubUtils

    const np = await Nanopub.fetch('https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU')
    console.log('Parsed nanopub:', np)

    const status = getUpdateStatus('npUpdate', 'https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU')
    console.log(status)
  </script>
</html>
```

You can instantiate the `Nanopub` object using various approaches:

- **Fetch** from a URI:

  ```typescript
  import {Nanopub} from '@nanopub/utils'

  const np = await Nanopub.fetch('https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU')
  ```

- **Parse** a RDF string in TRiG format:

  ```typescript
  import {Nanopub} from '@nanopub/utils'

  const np = await Nanopub.parse('ADD NP RDF')
  ```

- Providing an already parsed **RDF/JS store**:

  ```typescript
  import {Nanopub} from '@nanopub/utils'
  import {Parser, Store} from 'n3'

  const parser = new Parser()
  const store = new Store(parser.parse('ADD NP RDF'))

  const np = await Nanopub.parse(store)
  ```

# 📥️ Install

`@nanopub/utils` is distributed on npm, so you can install it in your project, or use it via npm CDNs like [unpkg.com](https://unpkg.com).

If you want to improve this library, please refer to the [contribute page](/pages/CONTRIBUTING.html) which details how to use the library in development.

## 📦️ Install with a package manager

The most convenient way to install a package in your project, using either `npm` or `yarn`:

```bash
npm i --save @nanopub/utils
# or
yarn add @nanopub/utils
# or
pnpm add @nanopub/utils
```

Then import it in your JavaScript/TypeScript:

```typescript
import {Nanopub} from '@nanopub/utils'

const np = await Nanopub.fetch('https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU')
```

## 🌐 Import from a CDN

npm CDNs like [unpkg.com](https://unpkg.com) or [jsdelivr.com](https://www.jsdelivr.com) can directly serve files that have been published to npm. This works great for standard JavaScript modules that the browser can load natively, or minified bundles.

```html
<script type="module" src="https://unpkg.com/@nanopub/utils"></script>
```

We also distribute Nanopub Display as a minified bundle with all dependencies pre-included, to import the latest version:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@nanopub/utils/dist/index.min.js"></script>
```

In production we recommend to use a specific version:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@nanopub/utils@1.0.7/dist/index.min.js"></script>
```
