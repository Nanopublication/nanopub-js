# nanopub-js

A TypeScript library for creating, signing, publishing, and querying nanopublications.

## Installation

```bash
# Using npm
npm install @nanopub/nanopub-js

# Using yarn
yarn add @nanopub/nanopub-js
```

## Usage

See [`examples/`](examples/) for demo apps for browser and node usage.

## Using NanopubClass

```ts
import { NanopubClass, serialize } from '@nanopub/nanopub-js';
import { NamedNode, Quad, Literal } from 'n3';

// Create a nanopub from an RDF string
const npFromRdf = NanopubClass.fromRdf(rdfString, 'trig', {
  privateKey,
  name: 'Hello from nanopub-js',
  orcid: 'https://orcid.org/0000-0000-0000-0000',
});

// Or create a nanopub from an assertion
const assertion = [
  new Quad(
    new NamedNode('https://example.org/subject'),
    new NamedNode('https://example.org/predicate'),
    new Literal('Example object')
  )
];

const np = new NanopubClass({
  assertion,
  options: {
    privateKey: process.env.MY_PRIVATE_KEY!,
    name: 'Hello from nanopub-js',
    orcid: 'https://orcid.org/0000-0000-0000-0000',
  }
});

// Serialize (default: trig)
console.log(np.rdf());

// Or use the serialize helper
console.log(await serialize(np, 'turtle'));
console.log(await serialize(np, 'json-ld'));
```

### Signing and publishing

Nanopublications must be signed before publishing.

Calling `publish()` will automatically sign the nanopublication if it has not been signed yet.

```ts
// Sign the nanopublication
await np.sign();

// Check signature validity
const valid = await np.hasValidSignature();
console.log('Signature valid:', valid);

// Publish to a nanopub server (in this example, we use the test server)
const { uri, server } = await np.publish('https://test.registry.knowledgepixels.com/np/');
console.log(`Published at ${uri} on ${server}`);
```

## Using `NanopubClient`

```ts
import { NanopubClient } from '@nanopub/nanopub-js';

const client = new NanopubClient({
  endpoints: ['https://query.knowledgepixels.com/'],
});

// Fetch a nanopublication in Trig format
const trig = await client.fetchNanopub(
  'https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U'
);
console.log(trig);

// Fetch a nanopublication in JSON-LD
const jsonld = await client.fetchNanopub(
  'https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U',
  'jsonld'
);
console.log(jsonld);

// Run a text search
for await (const np of client.findNanopubsWithText('example search')) {
  console.log(np);
}

// Run a pattern search
for await (const np of client.findNanopubsWithPattern(
  'http://www.w3.org/2002/07/owl#Thing',
  undefined,
  undefined
)) {
  console.log(np);
}

// Find "things" (concepts)
for await (const thing of client.findThings(
  'http://www.w3.org/2002/07/owl#Class'
)) {
  console.log(thing);
}

// Run a query template
for await (const row of client.runQueryTemplate(
  'RAOGCU2nQzZ0aE2iXwJ20jJtnZsjVR0pfFg0qlSxYtBIA/get-news-content',
  { resource: 'https://w3id.org/spaces/knowledgepixels' }
)) {
  console.log(row);
}
```

## License

This project is licensed under the [MIT License](./LICENSE).
