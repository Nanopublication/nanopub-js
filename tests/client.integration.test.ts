import { describe, it, expect } from 'vitest';
import { NanopubClient } from '../src/client';

describe('NanopubClient querySparql (integration)', () => {
  it('should query a real server and return nanopubs', async () => {
    const client = new NanopubClient({ endpoints: [
      'https://query.knowledgepixels.com/repo/full',
    ]} );

    const query = `
      SELECT ?s ?p ?o WHERE {
        ?s ?p ?o .
        FILTER(CONTAINS(LCASE(STR(?o)), "example"))
      } LIMIT 5
    `;

    const results = await client.querySparql(query);
    expect(results.length).toBeGreaterThan(0);

    for (const row of results) {
      expect(row.s).toBeDefined();
      expect(row.p).toBeDefined();
      expect(row.o).toBeDefined();
    }

    console.log(`Fetched ${results.length} rows from server.`);
  }, 20000); // 20s timeout for network

  it('return no results for gibberish search', async () => {
    const client = new NanopubClient({ endpoints: [
      'https://query.knowledgepixels.com/repo/full',
    ]} );

    const query = `
      SELECT ?s ?p ?o WHERE {
        ?s ?p ?o .
        FILTER(CONTAINS(LCASE(STR(?o)), "/n ajicbiuebigcayucs"))
      } LIMIT 5
    `;

    const results = await client.querySparql(query);
    expect(results.length).toBe(0);

    for (const row of results) {
      expect(row.s).toBeDefined();
      expect(row.p).toBeDefined();
      expect(row.o).toBeDefined();
    }

    console.log(`Fetched ${results.length} rows from server.`);
  }, 20000); // 20s timeout for network
});
