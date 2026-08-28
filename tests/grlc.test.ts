import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataFactory } from 'n3';
import { generateKeyPairSync } from 'crypto';
import {
  Nanopub,
  getInvalidSparql,
  GRLC_SPARQL,
  KPXL_GRLC,
  RDF,
} from '../src/index';

const { namedNode, quad, literal } = DataFactory;

const query = namedNode('http://purl.org/nanopub/temp/np/query');

const VALID_SPARQL = 'select ?np where { ?np ?p ?o }';
/** The same query with a no-break space where the parser expects a space. */
const BROKEN_SPARQL = 'select ?np\nwhere {\u00A0?np ?p ?o }';

function grlcQuery(sparql: string, privateKey: string): Nanopub {
  return new Nanopub({
    assertion: [
      quad(query, RDF('type'), KPXL_GRLC('grlc-query')),
      quad(query, KPXL_GRLC('sparql'), literal(sparql)),
    ],
    options: {
      name: 'Hello from nanopub-js test',
      orcid: 'https://orcid.org/0000-0000-0000-0000',
      privateKey,
    },
  });
}

describe('grlc query nanopublications', () => {
  let privateKey: string;

  beforeEach(() => {
    const generated = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    privateKey = generated.privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\r?\n|\r/g, '');
  });

  describe('getInvalidSparql', () => {
    it('accepts a query that parses', async () => {
      expect(
        await getInvalidSparql(grlcQuery(VALID_SPARQL, privateKey)),
      ).toEqual([]);
    });

    it('reports one that does not, naming the predicate and the character', async () => {
      const invalid = await getInvalidSparql(
        grlcQuery(BROKEN_SPARQL, privateKey),
      );

      expect(invalid).toHaveLength(1);
      expect(invalid[0].quad.predicate.value).toBe(GRLC_SPARQL.value);
      expect(invalid[0].description).toContain(
        'Invalid SPARQL as object of https://w3id.org/kpxl/grlc/sparql',
      );
      expect(invalid[0].description).toContain('U+00A0 (NO-BREAK SPACE)');
    });

    it('looks at every graph, not just the assertion', async () => {
      const np = new Nanopub({
        assertion: [
          quad(query, namedNode('http://example.org/p'), literal('o')),
        ],
        pubinfo: [quad(query, KPXL_GRLC('sparql'), literal(BROKEN_SPARQL))],
      });

      expect(await getInvalidSparql(np)).toHaveLength(1);
    });

    it('ignores a nanopub that carries no grlc query', async () => {
      const np = new Nanopub({
        assertion: [
          quad(
            query,
            namedNode('http://example.org/p'),
            literal('not a query at all'),
          ),
        ],
      });

      expect(await getInvalidSparql(np)).toEqual([]);
    });

    it('ignores the predicate when its object is not a literal', async () => {
      const np = new Nanopub({
        assertion: [
          quad(
            query,
            KPXL_GRLC('sparql'),
            namedNode('http://example.org/elsewhere'),
          ),
        ],
      });

      expect(await getInvalidSparql(np)).toEqual([]);
    });
  });

  describe('signing and publishing', () => {
    it('signs a nanopub whose query parses', async () => {
      const np = await grlcQuery(VALID_SPARQL, privateKey).sign();

      expect(np.signature).toBeDefined();
    });

    it('refuses to sign a nanopub whose query does not parse', async () => {
      const np = grlcQuery(BROKEN_SPARQL, privateKey);

      await expect(np.sign()).rejects.toThrow(
        /invalid SPARQL and cannot be signed[\s\S]*U\+00A0 \(NO-BREAK SPACE\)/,
      );
      expect(np.signature).toBeUndefined();
    });

    it('refuses to publish it before any server is contacted', async () => {
      const realFetch = global.fetch;
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      try {
        await expect(
          grlcQuery(BROKEN_SPARQL, privateKey).publish(
            'https://mock.registry/np/',
          ),
        ).rejects.toThrow(/invalid SPARQL and cannot be published/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        global.fetch = realFetch;
      }
    });

    it('refuses to publish a query broken before this check existed', async () => {
      // Such nanopubs exist in the wild, and still load and read as before.
      const signed = await grlcQuery(VALID_SPARQL, privateKey).sign();
      const broken = Nanopub.fromRdf(
        signed.rdf().replace('where {', 'where {\u00A0'),
        'trig',
      );

      const realFetch = global.fetch;
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      try {
        expect(broken.assertion.length).toBeGreaterThan(0);
        await expect(
          broken.publish('https://mock.registry/np/'),
        ).rejects.toThrow(/invalid SPARQL and cannot be published/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        global.fetch = realFetch;
      }
    });
  });
});
