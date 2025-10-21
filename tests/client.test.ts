import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NanopubClient } from '../src/client';

describe('NanopubClient querySparql (mocked)', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    // @ts-ignore
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and parse SPARQL results from endpoints', async () => {
    // Mock a SPARQL JSON response
    const sparqlResponse = {
      head: { vars: ['s', 'p', 'o'] },
      results: {
        bindings: [
          {
            s: { type: 'uri', value: 'http://example.org/s' },
            p: { type: 'uri', value: 'http://example.org/p' },
            o: { type: 'uri', value: 'http://example.org/o' },
          },
        ],
      },
    };

    fetchMock.mockResolvedValueOnce({
      json: async () => sparqlResponse,
      ok: true,
    });

    const client = new NanopubClient({ endpoints: ['https://mockserver.org/repo'] });

    const results = await client.querySparql('SELECT * WHERE {?s ?p ?o}');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.length).toBe(1);
    expect(results[0].s).toBe('http://example.org/s');
    expect(results[0].p).toBe('http://example.org/p');
    expect(results[0].o).toBe('http://example.org/o');
  });
});
