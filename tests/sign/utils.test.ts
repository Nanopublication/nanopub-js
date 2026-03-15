import { describe, it, expect } from 'vitest';
import { DataFactory, Store } from 'n3';
import {
  replaceBnodes,
  normalizeDataset,
  replaceUriInDataset,
  stripTrigComments,
  rewriteNanopubUri,
  datasetToNanopub,
  NpError,
} from '../../src/sign/utils';

const { namedNode, blankNode, literal, quad, defaultGraph } = DataFactory;

const BASE = 'http://example.org/np/';
const NORM = 'https://w3id.org/np/';

// ---------------------------------------------------------------------------
// replaceUriInDataset
// ---------------------------------------------------------------------------

describe('replaceUriInDataset()', () => {
  it('replaces URIs that start with oldUri in subject, predicate, object, graph', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode('http://old.org/s'),
      namedNode('http://old.org/p'),
      namedNode('http://old.org/o'),
      namedNode('http://old.org/g'),
    ));

    replaceUriInDataset(store, 'http://old.org/', 'http://new.org/');
    const [q] = [...store];

    expect(q.subject.value).toBe('http://new.org/s');
    expect(q.predicate.value).toBe('http://new.org/p');
    expect(q.object.value).toBe('http://new.org/o');
    expect(q.graph.value).toBe('http://new.org/g');
  });

  it('leaves URIs that do not start with oldUri untouched', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode('http://other.org/s'),
      namedNode('http://other.org/p'),
      namedNode('http://other.org/o'),
      defaultGraph(),
    ));

    replaceUriInDataset(store, 'http://old.org/', 'http://new.org/');
    const [q] = [...store];

    expect(q.subject.value).toBe('http://other.org/s');
  });

  it('mutates the dataset in place', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode('http://old.org/s'),
      namedNode('http://old.org/p'),
      literal('keep me'),
      defaultGraph(),
    ));

    replaceUriInDataset(store, 'http://old.org/', 'http://new.org/');

    expect(store.size).toBe(1);
    const [q] = [...store];
    expect(q.object.value).toBe('keep me'); // literal untouched
  });
});

// ---------------------------------------------------------------------------
// replaceBnodes
// ---------------------------------------------------------------------------

describe('replaceBnodes()', () => {
  it('replaces blank nodes in subject and object with named nodes', () => {
    const store = new Store();
    store.addQuad(quad(
      blankNode('b1'),
      namedNode('http://example.org/p'),
      blankNode('b2'),
      namedNode('http://example.org/g'),
    ));

    const result = replaceBnodes(store, BASE);
    const [q] = [...result];

    expect(q.subject.termType).toBe('NamedNode');
    expect(q.object.termType).toBe('NamedNode');
    expect(q.subject.value).toMatch(/^http:\/\/example\.org\/np\/_/);
    expect(q.object.value).toMatch(/^http:\/\/example\.org\/np\/_/);
  });

  it('assigns different URIs to different blank nodes', () => {
    const store = new Store();
    store.addQuad(quad(
      blankNode('x'),
      namedNode('http://example.org/p'),
      blankNode('y'),
      namedNode('http://example.org/g'),
    ));

    const result = replaceBnodes(store, BASE);
    const [q] = [...result];

    expect(q.subject.value).not.toBe(q.object.value);
  });

  it('assigns the same URI to the same blank node appearing multiple times', () => {
    const store = new Store();
    store.addQuad(quad(
      blankNode('same'),
      namedNode('http://example.org/p1'),
      namedNode('http://example.org/o1'),
      namedNode('http://example.org/g'),
    ));
    store.addQuad(quad(
      blankNode('same'),
      namedNode('http://example.org/p2'),
      namedNode('http://example.org/o2'),
      namedNode('http://example.org/g'),
    ));

    const result = replaceBnodes(store, BASE);
    const quads = [...result];

    expect(quads[0].subject.value).toBe(quads[1].subject.value);
  });

  it('preserves named nodes unchanged', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode('http://example.org/s'),
      namedNode('http://example.org/p'),
      namedNode('http://example.org/o'),
      namedNode('http://example.org/g'),
    ));

    const result = replaceBnodes(store, BASE);
    const [q] = [...result];

    expect(q.subject.value).toBe('http://example.org/s');
  });

  it('preserves literal objects unchanged', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode('http://example.org/s'),
      namedNode('http://example.org/p'),
      literal('hello'),
      namedNode('http://example.org/g'),
    ));

    const result = replaceBnodes(store, BASE);
    const [q] = [...result];

    expect(q.object.termType).toBe('Literal');
    expect(q.object.value).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// normalizeDataset
// ---------------------------------------------------------------------------

describe('normalizeDataset()', () => {
  it('produces a non-empty string ending with a newline', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode(`${BASE}s`),
      namedNode('http://example.org/p'),
      namedNode('http://example.org/o'),
      namedNode(`${BASE}Head`),
    ));

    const result = normalizeDataset(store, BASE, NORM, '/');

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result.endsWith('\n')).toBe(true);
  });

  it('replaces baseNs URIs with the normNs form', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode(`${BASE}s`),
      namedNode('http://example.org/p'),
      namedNode(`${BASE}o`),
      namedNode(`${BASE}Head`),
    ));

    const result = normalizeDataset(store, BASE, NORM, '/');

    expect(result).toContain(NORM);
    expect(result).not.toContain(BASE);
  });

  it('is deterministic — same dataset produces same string', () => {
    const build = () => {
      const s = new Store();
      s.addQuad(quad(namedNode(`${BASE}s`), namedNode('http://ex.org/p'), namedNode('http://ex.org/o'), namedNode(`${BASE}g`)));
      return s;
    };
    expect(normalizeDataset(build(), BASE, NORM, '/')).toBe(normalizeDataset(build(), BASE, NORM, '/'));
  });

  it('throws NpError when blank nodes are still present', () => {
    const store = new Store();
    store.addQuad(quad(
      blankNode('b1'),
      namedNode('http://example.org/p'),
      namedNode('http://example.org/o'),
      namedNode(`${BASE}Head`),
    ));

    expect(() => normalizeDataset(store, BASE, NORM, '/')).toThrow(NpError);
  });

  it('produces 4 lines per quad (graph, subject, predicate, object)', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode(`${BASE}s`),
      namedNode('http://example.org/p'),
      namedNode('http://example.org/o'),
      namedNode(`${BASE}Head`),
    ));

    const lines = normalizeDataset(store, BASE, NORM, '/').trimEnd().split('\n');
    expect(lines.length).toBe(4);
  });

  it('includes language tag for language-tagged literals', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode(`${BASE}s`),
      namedNode('http://example.org/p'),
      literal('hello', 'en'),
      namedNode(`${BASE}g`),
    ));

    const result = normalizeDataset(store, BASE, NORM, '/');
    expect(result).toContain('@en hello');
  });
});

// ---------------------------------------------------------------------------
// stripTrigComments
// ---------------------------------------------------------------------------

describe('stripTrigComments()', () => {
  it('removes line-ending # comments', () => {
    const input = '<s> <p> <o> . # this is a comment\n<s2> <p2> <o2> .';
    expect(stripTrigComments(input)).toBe('<s> <p> <o> . \n<s2> <p2> <o2> .');
  });

  it('removes full-line comments', () => {
    const input = '# full line\n<s> <p> <o> .';
    expect(stripTrigComments(input)).toBe('\n<s> <p> <o> .');
  });

  it('leaves lines without comments unchanged', () => {
    const input = '<s> <p> <o> .\n<s2> <p2> <o2> .';
    expect(stripTrigComments(input)).toBe(input);
  });

  it('handles empty string', () => {
    expect(stripTrigComments('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// rewriteNanopubUri
// ---------------------------------------------------------------------------

describe('rewriteNanopubUri()', () => {
  it('rewrites all URIs from old base to new base', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode('http://old.org/np/Head'),
      namedNode('http://old.org/np/pred'),
      namedNode('http://old.org/np/assertion'),
      namedNode('http://old.org/np/Head'),
    ));

    const result = rewriteNanopubUri(store, 'http://old.org/np/', 'https://w3id.org/np/RAhash/');
    const [q] = [...result];

    expect(q.subject.value).toBe('https://w3id.org/np/RAhash/Head');
    expect(q.predicate.value).toBe('https://w3id.org/np/RAhash/pred');
    expect(q.object.value).toBe('https://w3id.org/np/RAhash/assertion');
    expect(q.graph.value).toBe('https://w3id.org/np/RAhash/Head');
  });

  it('leaves URIs not starting with oldBase unchanged', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode('http://other.org/s'),
      namedNode('http://other.org/p'),
      namedNode('http://other.org/o'),
      namedNode('http://old.org/np/g'),
    ));

    const result = rewriteNanopubUri(store, 'http://old.org/np/', 'https://w3id.org/np/RAhash/');
    const [q] = [...result];

    expect(q.subject.value).toBe('http://other.org/s');
    expect(q.graph.value).toBe('https://w3id.org/np/RAhash/g');
  });

  it('returns a new dataset (non-mutating)', () => {
    const store = new Store();
    store.addQuad(quad(
      namedNode('http://old.org/np/s'),
      namedNode('http://old.org/np/p'),
      namedNode('http://old.org/np/o'),
      namedNode('http://old.org/np/g'),
    ));

    rewriteNanopubUri(store, 'http://old.org/np/', 'https://new.org/');
    // original store should be unchanged
    const [q] = [...store];
    expect(q.subject.value).toBe('http://old.org/np/s');
  });
});

// ---------------------------------------------------------------------------
// datasetToNanopub
// ---------------------------------------------------------------------------

describe('datasetToNanopub()', () => {
  const NP_URI = 'http://example.org/np';

  it('routes quads to the correct graph arrays', () => {
    const store = new Store();
    store.addQuad(quad(namedNode('http://s'), namedNode('http://p'), namedNode('http://o'), namedNode(`${NP_URI}#Head`)));
    store.addQuad(quad(namedNode('http://s'), namedNode('http://p'), namedNode('http://o'), namedNode(`${NP_URI}#assertion`)));
    store.addQuad(quad(namedNode('http://s'), namedNode('http://p'), namedNode('http://o'), namedNode(`${NP_URI}#provenance`)));
    store.addQuad(quad(namedNode('http://s'), namedNode('http://p'), namedNode('http://o'), namedNode(`${NP_URI}#pubinfo`)));

    const np = datasetToNanopub(store, NP_URI);

    expect(np.head.length).toBe(1);
    expect(np.assertion.length).toBe(1);
    expect(np.provenance.length).toBe(1);
    expect(np.pubinfo.length).toBe(1);
    expect(np.sourceUri).toBe(NP_URI);
  });

  it('ignores quads in unrecognised named graphs', () => {
    const store = new Store();
    store.addQuad(quad(namedNode('http://s'), namedNode('http://p'), namedNode('http://o'), namedNode('http://other.org/g')));

    const np = datasetToNanopub(store, NP_URI);

    expect(np.head.length).toBe(0);
    expect(np.assertion.length).toBe(0);
  });

  it('ignores quads in the default graph', () => {
    const store = new Store();
    store.addQuad(quad(namedNode('http://s'), namedNode('http://p'), namedNode('http://o'), defaultGraph()));

    const np = datasetToNanopub(store, NP_URI);

    expect(np.head.length).toBe(0);
  });
});
