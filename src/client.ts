import type { Nanopub, QueryOptions } from './types';
import { parse } from './serialize.js';

const ENDPOINT_UUIDS: Record<string, string> = {
  findNanopubsWithText: 'RAWruhiSmyzgZhVRs8QY8YQPAgHzTfl7anxII1de-yaCs/fulltext-search-on-labels',
  findValidNanopubsWithText: 'RAMJaSqIk4-qgCud7Kf-ltdE3i8DVP239uQv-BiTGvwUU/fulltext-search-on-labels-all',
  findNanopubsWithPattern: 'RAuE9jU8LLwco-iJHiNjzQgEHfx5j-XkbzlutT59cQYiU/find_nanopubs_with_pattern',
  findValidNanopubsWithPattern: 'RAIDPTdWRrYy-TOcdEVmGi7JHwn8fBriVphmsCy3mn4r0/find_valid_nanopubs_with_pattern',
  findThings: 'RA99xFu2qrCrpOYc1zc7h0SYV4m6Z4OE530dguEhYeoOM/find-things',
  findValidThings: 'RARqGauUpDMEA1o4KBSKC8AeP694qJjpbf7x7FOWHDfM8/find-valid-things',
};

export class NanopubClient {
  endpoints: string[];

  constructor(config?: { endpoints?: string[] }) {
    this.endpoints = config?.endpoints ?? ['https://query.knowledgepixels.com/'];
  }

  async publish(np: Nanopub): Promise<string> {
    // TODO: POST nanopub to server
    return `${this.endpoints}/`;
  }

  /** Fetch a nanopub by URI in the requested format */
  async fetchNanopub(uri: string, format: 'trig' | 'jsonld' = 'trig'): Promise<any> {
    const accept =
      format === 'trig'
        ? 'application/trig'
        : 'application/ld+json';

    const res = await fetch(uri, { headers: { Accept: accept } });
    if (!res.ok) {
      throw new Error(`Failed to fetch nanopub: ${res.status} ${res.statusText}`);
    }

    if (format === 'trig') {
      return await res.text();
    }

    if (format === 'jsonld') {
      return await res.json();
    }
  }
  
  /** Raw SPARQL query */
  async querySparql(query: string, returnFormat: 'json' | 'csv' = 'json'): Promise<any> {
    const endpoints = ['https://query.knowledgepixels.com/repo/full'] // Override for SPARQL queries
    let error;
    for (const endpoint of endpoints) {
      try {
        const url = new URL(endpoint);
        url.searchParams.append('query', query);

        const res = await fetch(url.toString(), {
          headers: {
            Accept: returnFormat === 'json'
              ? 'application/sparql-results+json'
              : 'text/csv'
          }
        });

        // if (!res.ok) throw new Error(`SPARQL query failed: ${res.status} ${res.statusText}`);
        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            return []; // Return empty result for 404
          }
          error = new Error(`SPARQL query failed: ${res.status} ${res.statusText}`);
          return error;
        }

        if (returnFormat === 'json') {
          const data = await res.json();
          return data.results.bindings.map((row: any) => {
            const obj: Record<string, string> = {};
            Object.entries(row).forEach(([k, v]: any) => obj[k] = v.value);
            return obj;
          });
        } else {
          return await res.text();
        }

      } catch (e) {
        console.warn(`SPARQL query failed on ${endpoint}: ${e}`);
      }
    }
    throw new Error('SPARQL query failed on all nanopub endpoints');
  }

  /** Text search */
  async *findNanopubsWithText(
    text: string,
    pubkey?: string,
    filterRetracted = true
  ) {
    if (!text) return;

    const endpoint = filterRetracted
      ? 'findValidNanopubsWithText'
      : 'findNanopubsWithText';

    const params: Record<string, string> = { query: text };
    if (pubkey) params.pubkey = pubkey;

    yield* this._search(endpoint, params);
  }

  /** Pattern search (subj, pred, obj) */
  async *findNanopubsWithPattern(
    subj?: string,
    pred?: string,
    obj?: string,
    pubkey?: string,
    filterRetracted = true
  ) {
    const endpoint = filterRetracted
      ? 'findValidNanopubsWithPattern'
      : 'findNanopubsWithPattern';

    const params: Record<string, string> = {};
    if (subj) params.subj = subj;
    if (pred) params.pred = pred;
    if (obj) params.obj = obj;
    if (pubkey) params.pubkey = pubkey;

    yield* this._search(endpoint, params);
  }

  /** Find "things" (concepts) */
  async *findThings(
    type: string,
    searchTerm = '*:*',
    pubkey?: string,
    filterRetracted = true
  ) {
    const endpoint = filterRetracted ? 'findValidThings' : 'findThings';
    const params: Record<string, string> = { type, query: searchTerm };
    if (pubkey) params.pubkey = pubkey;

    yield* this._search(endpoint, params);
  }

  /** Find retractions of a nanopub URI */
  async findRetractionsOf(uri: string): Promise<string[]> {
    const results: string[] = [];
    for await (const np of this.findNanopubsWithPattern(
      undefined,
      'http://www.nanopub.org/nschema#retracts',
      uri
    )) {
      results.push(np.np);
    }
    return results;
  }

  /** Internal generic search */
  private async *_search(endpointKey: string, params: Record<string, string>) {
    const uuidPath = ENDPOINT_UUIDS[endpointKey];
    if (!uuidPath) throw new Error(`Unknown endpoint key ${endpointKey}`);

    for (const baseUrl of this.endpoints) {
      const url = new URL(`api/${uuidPath}`, baseUrl);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

      try {
        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/sparql-results+json' },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const data = await res.json();
        for (const row of data.results.bindings) {
          const parsed: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) parsed[k] = (v as any).value;
          yield parsed;
        }
      } catch (e) {
        console.warn(`Search failed on ${url.toString()}: ${e}`);
      }
    }
  }
}
