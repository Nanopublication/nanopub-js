// Checks run against the built package in each environment. `lib` is the
// imported package entry; `constants` is the `./constants` entry, when the
// environment loads it separately.
//
// `smoke` is offline. The others are end-to-end: they use the live nanopub
// network and the test registry, the way an app would.

const ORCID = 'https://orcid.org/0000-0000-0000-0000';
const ASSERTION = '<https://example.org/subject> <https://example.org/predicate> "Example object" .';

// A nanopub known to be on the network
const PUBLISHED_URI = 'https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U';
const QUERY_ENDPOINT = 'https://query.knowledgepixels.com/';

async function generatePrivateKey() {
  const { privateKey } = await globalThis.crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const pkcs8 = new Uint8Array(await globalThis.crypto.subtle.exportKey('pkcs8', privateKey));
  let binary = '';
  for (const byte of pkcs8) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function smoke(lib, constants) {
  assert(constants.NANOPUB_QUERY_URLS.length > 0, 'NANOPUB_QUERY_URLS is empty');

  const assertion = lib.parse(ASSERTION, 'turtle');
  assert(assertion.length === 1, 'turtle assertion did not parse to one quad');

  const nanopub = new lib.Nanopub({ assertion });
  const trig = await lib.serialize(nanopub, 'trig');

  const { signedRdf, sourceUri } = await lib.sign(trig, await generatePrivateKey(), ORCID);
  assert(sourceUri.startsWith(constants.TRUSTY_BASE), `unexpected trusty URI ${sourceUri}`);

  const verified = await lib.verifySignature(signedRdf);
  assert(verified.valid, 'signature does not verify');

  const tampered = await lib.verifySignature(signedRdf.replace('Example object', 'Changed object'));
  assert(!tampered.valid, 'tampered nanopub verifies');

  // Loads the SPARQL parser, which is imported lazily
  assert(await lib.isValidSparql('SELECT * WHERE { ?s ?p ?o }'), 'valid SPARQL rejected');
  assert(!(await lib.isValidSparql('SELEC nope')), 'invalid SPARQL accepted');

  return { sourceUri };
}

async function fetchAndVerify(lib) {
  const client = new lib.NanopubClient({ endpoints: [QUERY_ENDPOINT] });
  const trig = await client.fetchNanopub(PUBLISHED_URI);

  const { valid } = await lib.verifySignature(trig);
  assert(valid, `signature of ${PUBLISHED_URI} does not verify`);

  return { uri: PUBLISHED_URI };
}

async function query(lib) {
  const client = new lib.NanopubClient({ endpoints: [QUERY_ENDPOINT] });
  const results = await client.querySparql('SELECT ?np WHERE { ?np ?p ?o } LIMIT 1');
  assert(results.length > 0, 'query returned no results');

  return { results: results.length };
}

async function publish(lib, constants) {
  const nanopub = new lib.Nanopub({
    assertion: lib.parse(ASSERTION, 'turtle'),
    options: { privateKey: await generatePrivateKey(), orcid: ORCID, name: 'nanopub-js package test' },
  });

  // The key is new, so no introduction declares it on the network
  const { uri } = await nanopub.publish(constants.TEST_NANOPUB_REGISTRY_URL, { keyCheck: 'off' });
  assert(uri.startsWith(constants.TRUSTY_BASE), `unexpected trusty URI ${uri}`);

  // Read it back from the registry; it can take a moment to become available
  const url = constants.TEST_NANOPUB_REGISTRY_URL + uri.slice(constants.TRUSTY_BASE.length);
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await fetch(url, { headers: { Accept: 'application/trig' } });
    if (response.ok) {
      const { valid } = await lib.verifySignature(await response.text());
      assert(valid, `signature of ${uri} as read back does not verify`);
      return { uri };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${uri} was not available from ${url}`);
}

export const checks = { smoke, fetchAndVerify, query, publish };

// Lets the test runner call each check by name: in a page,
// `await runCheck('smoke')` resolves with its result or rejects with its error.
export function expose(lib, constants = lib) {
  globalThis.runCheck = (name) => checks[name](lib, constants);
}
