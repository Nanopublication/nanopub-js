export const DEFAULT_NANOPUB_URI = 'http://purl.org/nanopub/temp/np/';

export const TRUSTY_BASE = 'https://w3id.org/np/';

export const TEST_NANOPUB_REGISTRY_URL =
  'https://test.registry.knowledgepixels.com/np/';

export const NANOPUB_REGISTRY_URLS = [
  'https://registry.petapico.org/np/',
  'https://registry.knowledgepixels.com/np/',
  'https://registry.nanodash.net/np/',
];

// bootstrap only, replaced at runtime by refreshEndpoints()
export const NANOPUB_QUERY_URLS = [
  'https://query.knowledgepixels.com/',
  'https://query.petapico.org/',
  'https://query.nanodash.net/',
];

export const QUERY_SERVICE_TYPE =
  'https://w3id.org/np/o/service/terms/nanopub-query-1.1';

// per-request, so a hanging instance doesn't block the next one
export const QUERY_TIMEOUT_MS = 5000;
