# 🧬 Web Components to display Nanopublications

`@nanopub/display` is a library of standard web components to easily display [Nanopublications](https://nanopub.net) in applications built using any web framework (pure HTML, React, Angular, Vue, Svelte):

- `<nanopub-display>` displays a nanopublication content nicely, and enable users to hide specific graphs
- `<nanopub-status>` displays the status of a nanopublication (has it been supersed?)

If you want to improve this library, please refer to the [contribute page](/pages/CONTRIBUTING.html) which details how to use the library in development.

## 🏷️ As easy as HTML

`<nanopub-display>` and `<nanopub-status>` are just HTML elements, you can use them anywhere you can use HTML:

```html
<html lang="en">
  <head>
    <script type="module" src="https://unpkg.com/@nanopub/display"></script>
  </head>

  <body>
    <div style="min-height: 100vh; width: 100%;">
      <div>
        <nanopub-status url="https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" />
      </div>
      <nanopub-display url="https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" />
    </div>
  </body>
</html>
```

> `<nanopub-display>` enables developers and users to control which graphs from the nanopublication are displayed.

<div>
  <nanopub-status url="https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" />
</div>
<nanopub-display url="https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU"></nanopub-display>

## 💫 Declarative rendering

`@nanopub/display` can be used with popular declarative rendering libraries like **React**, **Angular**, **Vue**, Svelte, and lit-html

```js
import {html, render} from 'lit-html'
import '@nanopub/display'

const np = 'https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU'

render(
  html`
    <h4>This is a &lt;nanopub-display&gt;</h4>
    <nanopub-display url=${np} />
  `,
  document.body
)
```

## 🧶 Cytoscape configuration

`@nanopub/display` can also be used to generate a cytoscape configuration to nicely display your nanopublication with [CytoscapeJS](https://js.cytoscape.org).

⚠️ Cytoscape is not imported by `@nanopub/display`, you will need to make sure to install the following packages first:

```bash
npm i --save cytoscape cytoscape-cose-bilkent cytoscape-popper
# or
yarn add cytoscape cytoscape-cose-bilkent cytoscape-popper
```

The code below shows how to easily generate the cytoscape configuration, please refer to the [cytoscape documentation](https://js.cytoscape.org/#getting-started) to see how to setup your cytoscape container.

```ts
import {cyGetConfig, cyShowNodeOnClick, cyHighlightConnectedEdges} from '@nanopub/display';
import cytoscape, { Core } from 'cytoscape';
import popper from 'cytoscape-popper';
import COSEBilkent from 'cytoscape-cose-bilkent';

// Get the cytoscape div container, and nanopub RDF
const cyContainer?: HTMLDivElement;
const nanopubTrigRdfString?: string;

// Generate the cytoscape config for a given nanopub RDF
const cytoscapeConfig = cyGetConfig(nanopubTrigRdfString),

// Provide the generated config and cytoscape container to the cytoscape builder
const cy = cytoscape({
    ...cytoscapeConfig,
    container: cyContainer
})

// Hightlight connected and show a card with the content of the node on click
cy.on('tap', "node", (e: any) => cytoscapeHighlightConnectedEdges(e, cy))
cy.on('tap', 'node', cytoscapeShowNodeOnClick);
```

# 📥️ Install

`<nanopub-display>` is distributed on npm, so you can install it in your project, or use it via npm CDNs like [unpkg.com](https://unpkg.com).

## 📦️ Install with a package manager

The most convenient way to install a package in your project, using either `npm` or `yarn`:

```bash
npm i --save @nanopub/display
# or
yarn add @nanopub/display
```

### ⚛️ Define types for React apps

To fix JSX types, for example when used in a React app, you will need to add this declaration to one of your project `.d.ts` file:

```ts
declare namespace JSX {
  interface NanopubDisplay {
    url?: string
    rdf?: string
  }
  interface NanopubStatus {
    url?: string
  }
  interface IntrinsicElements {
    'nanopub-display': NanopubDisplay
    'nanopub-status': NanopubStatus
  }
}
```

## 🌐 Import from a CDN

npm CDNs like [unpkg.com](https://unpkg.com) or [jsdelivr.com](https://www.jsdelivr.com) can directly serve files that have been published to npm. This works great for standard JavaScript modules that the browser can load natively, or minified bundles.

```html
<script type="module" src="https://unpkg.com/@nanopub/display"></script>
```

We also distribute Nanopub Display as a minified bundle with all dependencies pre-included. Import the latest version:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@nanopub/display/dist/nanopub-display.min.js"></script>
```

In production we recommend to use a specific version:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@nanopub/display@0.0.6/dist/nanopub-display.min.js"></script>
```
