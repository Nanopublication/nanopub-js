## 🧬 A Web Component to visualize RDF with Cytoscape

A [Web Component](https://www.webcomponents.org/introduction) to easily display [RDF](https://www.w3.org/RDF/) quads data as a [Cytoscape JS](https://js.cytoscape.org/) network in any HTML file without any dependency.

This component has been built specifically to visualize [Nanopublications](https://nanopub.net/), but can be used with any RDF quads data (composed of subject, predicate, object, graph).

> ⚠️ Currently the component only supports RDF in the `trig` format

## Getting started

`<nanopub-display>` can be easily used in any HTML file to generate a cytoscape visualization for RDF available at a specific URL, just import the JS module first:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Cytoscape RDF</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/nanopub-display@0.0.11/dist/nanopub-display.min.js"
    ></script>
  </head>

  <body style="font-family: Arial, sans-serif;">
    <main style="display: flex; flex-direction: column; align-items: center;">
      <h2>Visualize RDF quads with Cytoscape</h2>
      <div style="height: 100vh; width: 70%;">
        <nanopub-display
          url="https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU.trig"
          id="cytoscapeNanopub"
        />
      </div>
    </main>
  </body>
</html>
```

It can be also installed in your project using `npm` or `yarn`:

```bash
npm install --save nanopub-display
# or
yarn add nanopub-display
```

Then import it with `import "nanopub-display";`

Attributes available on `<nanopub-display>` are:

- `url`: to pass a URL to retrieve the RDF to display
- `rdf`: to pass the RDF directly as a string in the `trig` format
- `elements`: to pass directly the cytoscape elements generated from the RDF
- `cytoscapeStyle`: to pass the style object for cytoscape
- `layout`: to pass the layout object for cytoscape

## Development

Requirements: [Node.js](https://nodejs.org/) version >=12.2.0

```shell
git clone https://github.com/vemonet/nanopub-display.git
cd nanopub-display
```

Install:

```shell
yarn
```

Run in development:

```bash
yarn dev
```

Build:

```bash
yarn build
```

## Aknowledgments

Built with:

- [FAST design elements](https://www.fast.design/)

- [TypeScript](https://www.typescriptlang.org/)

- [Vite](https://vitejs.dev/)
