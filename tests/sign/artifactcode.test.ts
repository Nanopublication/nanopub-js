/**
 * Unit tests for `~~~ARTIFACTCODE~~~` placeholder handling.
 *
 * The placeholder may appear in ANY URI, not just the nanopub's own base URI:
 * a nanopub keeping the default `w3id.org/np` URI can still mint a concept in
 * its own namespace (`https://example.org/ns/~~~ARTIFACTCODE~~~`).
 *
 * Covers:
 *  - replaceArtifactCodePlaceholder(): substitution after the code is known
 *  - detectNanopubBaseUri(): base detection / placeholder stripping (expandBaseUri)
 *  - normalizeDataset(): blanking the placeholder (signing) and this nanopub's
 *    own artifact code (verification) so the hash never depends on itself
 *
 * The end-to-end substitution is pinned against the reference implementation by
 * the `artifactcode-1` transform case in tests/sign/testsuite.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { DataFactory, Store } from 'n3';

import {
  detectNanopubBaseUri,
  ensureTrailingSlash,
  replaceArtifactCodePlaceholder,
} from '../../src/sign/sign';
import { normalizeDataset } from '../../src/sign/utils';
import { DEFAULT_NANOPUB_URI, TRUSTY_BASE } from '../../src/constants';
import { NP, RDF } from '../../src/vocab';

const { namedNode, literal, quad, defaultGraph } = DataFactory;

const PLACEHOLDER = '~~~ARTIFACTCODE~~~';
const DEPRECATED_PLACEHOLDER = 'ARTIFACTCODE-PLACEHOLDER';

/** Artifact code of the nanopub under test (RA + 43 base64url chars). */
const CODE = 'RAO8Bidt02PViTDmvylhId8vx6ZzBkFeY728tiHZqFTyM';
/** A reference to some OTHER trusty nanopub — must never be touched. */
const OTHER_CODE = 'RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123';

/** Build a single-quad store, for the common "one URI in one position" cases. */
function storeOf(...quads: ReturnType<typeof quad>[]): Store {
  const store = new Store();
  for (const q of quads) store.addQuad(q);
  return store;
}

/** All URIs occurring in the store, in insertion order, as flat strings. */
function uris(store: Store): string[] {
  const out: string[] = [];
  for (const q of store) {
    for (const term of [q.graph, q.subject, q.predicate, q.object]) {
      if (term.termType === 'NamedNode') out.push(term.value);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// replaceArtifactCodePlaceholder
// ---------------------------------------------------------------------------

describe('replaceArtifactCodePlaceholder()', () => {
  it('substitutes the placeholder in every term position, in any namespace', () => {
    const store = storeOf(quad(
      namedNode(`https://example.org/ns/${PLACEHOLDER}`),
      namedNode(`https://example.org/p/${PLACEHOLDER}`),
      namedNode(`https://other.example/${PLACEHOLDER}#o`),
      namedNode(`https://example.org/g/${PLACEHOLDER}`),
    ));

    const result = replaceArtifactCodePlaceholder(store, CODE);

    expect(uris(result)).toEqual([
      `https://example.org/g/${CODE}`,
      `https://example.org/ns/${CODE}`,
      `https://example.org/p/${CODE}`,
      `https://other.example/${CODE}#o`,
    ]);
  });

  it('substitutes the deprecated ARTIFACTCODE-PLACEHOLDER', () => {
    const store = storeOf(quad(
      namedNode(`https://example.org/ns/${DEPRECATED_PLACEHOLDER}`),
      RDF('type'),
      namedNode('http://www.w3.org/2004/02/skos/core#Concept'),
      defaultGraph(),
    ));

    const result = replaceArtifactCodePlaceholder(store, CODE);

    expect([...result][0].subject.value).toBe(`https://example.org/ns/${CODE}`);
  });

  it('substitutes every occurrence within a single URI', () => {
    const store = storeOf(quad(
      namedNode(`https://example.org/${PLACEHOLDER}/${PLACEHOLDER}#x`),
      RDF('type'),
      namedNode('http://example.org/T'),
      defaultGraph(),
    ));

    const result = replaceArtifactCodePlaceholder(store, CODE);

    expect([...result][0].subject.value).toBe(`https://example.org/${CODE}/${CODE}#x`);
  });

  it('leaves URIs without a placeholder untouched, including other trusty URIs', () => {
    const other = `https://w3id.org/np/${OTHER_CODE}`;
    const store = storeOf(quad(
      namedNode('https://example.org/ns/concept'),
      namedNode('http://www.w3.org/2004/02/skos/core#related'),
      namedNode(other),
      defaultGraph(),
    ));

    const result = replaceArtifactCodePlaceholder(store, CODE);

    expect(uris(result)).toEqual([
      'https://example.org/ns/concept',
      'http://www.w3.org/2004/02/skos/core#related',
      other,
    ]);
  });

  it('leaves literals untouched — only IRIs carry artifact codes', () => {
    const store = storeOf(quad(
      namedNode(`https://example.org/ns/${PLACEHOLDER}`),
      namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
      literal(`a term named ${PLACEHOLDER}`),
      defaultGraph(),
    ));

    const result = replaceArtifactCodePlaceholder(store, CODE);
    const [q] = [...result];

    expect(q.subject.value).toBe(`https://example.org/ns/${CODE}`);
    expect(q.object.value).toBe(`a term named ${PLACEHOLDER}`);
  });

  it('returns a new store and leaves the input dataset unchanged', () => {
    const store = storeOf(quad(
      namedNode(`https://example.org/ns/${PLACEHOLDER}`),
      RDF('type'),
      namedNode('http://example.org/T'),
      defaultGraph(),
    ));

    const result = replaceArtifactCodePlaceholder(store, CODE);

    expect(result).not.toBe(store);
    expect([...store][0].subject.value).toBe(`https://example.org/ns/${PLACEHOLDER}`);
  });
});

// ---------------------------------------------------------------------------
// detectNanopubBaseUri (and the placeholder stripping in expandBaseUri)
// ---------------------------------------------------------------------------

/** Minimal store declaring `uri` as the nanopub. */
function nanopubStore(uri: string): Store {
  const head = `${uri.replace(/\/$/, '')}/Head`;
  return storeOf(quad(namedNode(uri), RDF('type'), NP('Nanopublication'), namedNode(head)));
}

describe('detectNanopubBaseUri()', () => {
  it('maps the default temp URI to the standard trusty base', () => {
    const { placeholder, trustyBase, existingTrustyUri } =
      detectNanopubBaseUri(nanopubStore('http://purl.org/nanopub/temp/np'));

    expect(placeholder).toBe(DEFAULT_NANOPUB_URI);
    expect(trustyBase).toBe(TRUSTY_BASE);
    expect(existingTrustyUri).toBeUndefined();
  });

  it('maps any other purl.org/nanopub/temp/ URI to the standard trusty base', () => {
    const { placeholder, trustyBase } =
      detectNanopubBaseUri(nanopubStore('http://purl.org/nanopub/temp/1029384756'));

    expect(placeholder).toBe('http://purl.org/nanopub/temp/1029384756/');
    expect(trustyBase).toBe(TRUSTY_BASE);
  });

  it('strips a `~~~ARTIFACTCODE~~~` segment from a custom base URI', () => {
    const { placeholder, trustyBase, existingTrustyUri } =
      detectNanopubBaseUri(nanopubStore(`https://w3id.org/sciencelive/np/${PLACEHOLDER}/`));

    expect(placeholder).toBe(`https://w3id.org/sciencelive/np/${PLACEHOLDER}/`);
    expect(trustyBase).toBe('https://w3id.org/sciencelive/np/');
    expect(existingTrustyUri).toBeUndefined();
  });

  it('strips a `~~~ARTIFACTCODE~~~` segment written without a trailing separator', () => {
    const { placeholder, trustyBase } =
      detectNanopubBaseUri(nanopubStore(`https://w3id.org/sciencelive/np/${PLACEHOLDER}`));

    // `~` is not a word character, so ensureTrailingSlash() adds no separator here.
    expect(placeholder).toBe(`https://w3id.org/sciencelive/np/${PLACEHOLDER}`);
    expect(trustyBase).toBe('https://w3id.org/sciencelive/np/');
  });

  it('strips the deprecated ARTIFACTCODE-PLACEHOLDER from a custom base URI', () => {
    const { trustyBase } =
      detectNanopubBaseUri(nanopubStore(`https://w3id.org/sciencelive/np/${DEPRECATED_PLACEHOLDER}`));

    expect(trustyBase).toBe('https://w3id.org/sciencelive/np/');
  });

  it('keeps a custom base URI without a placeholder as the trusty base', () => {
    const { placeholder, trustyBase } =
      detectNanopubBaseUri(nanopubStore('https://w3id.org/sciencelive/np'));

    expect(placeholder).toBe('https://w3id.org/sciencelive/np/');
    expect(trustyBase).toBe('https://w3id.org/sciencelive/np/');
  });

  it('detects an existing trusty URI and returns its base prefix', () => {
    const { placeholder, trustyBase, existingTrustyUri } =
      detectNanopubBaseUri(nanopubStore(`https://w3id.org/np/${CODE}`));

    expect(placeholder).toBe('https://w3id.org/np/');
    expect(trustyBase).toBe('https://w3id.org/np/');
    expect(existingTrustyUri).toBe(`https://w3id.org/np/${CODE}/`);
  });
});

describe('ensureTrailingSlash()', () => {
  it('appends a slash after an alphanumeric, hyphen or underscore', () => {
    expect(ensureTrailingSlash('https://example.org/np')).toBe('https://example.org/np/');
    expect(ensureTrailingSlash('https://example.org/np-1')).toBe('https://example.org/np-1/');
    expect(ensureTrailingSlash('https://example.org/np_1')).toBe('https://example.org/np_1/');
  });

  it('leaves an existing / or # separator alone', () => {
    expect(ensureTrailingSlash('https://example.org/np/')).toBe('https://example.org/np/');
    expect(ensureTrailingSlash('https://example.org/np#')).toBe('https://example.org/np#');
  });
});

// ---------------------------------------------------------------------------
// normalizeDataset: artifact-code blanking outside the nanopub's namespace
// ---------------------------------------------------------------------------

/**
 * A nanopub that introduces a concept in its own foreign namespace.
 * `code` is the placeholder while signing, the real artifact code afterwards.
 */
function introducingNanopub(base: string, code: string): Store {
  const store = new Store();
  const concept = namedNode(`https://example.org/ns/${code}`);
  const head = namedNode(`${base}Head`);
  const assertion = namedNode(`${base}assertion`);
  const pubinfo = namedNode(`${base}pubinfo`);

  store.addQuad(quad(namedNode(base.replace(/\/$/, '')), RDF('type'), NP('Nanopublication'), head));
  store.addQuad(quad(concept, RDF('type'), namedNode('http://www.w3.org/2004/02/skos/core#Concept'), assertion));
  store.addQuad(quad(concept, namedNode('http://www.w3.org/2004/02/skos/core#related'),
    namedNode(`https://w3id.org/np/${OTHER_CODE}`), assertion));
  store.addQuad(quad(namedNode(base.replace(/\/$/, '')),
    namedNode('http://purl.org/nanopub/x/introduces'), concept, pubinfo));
  return store;
}

describe('normalizeDataset() artifact-code blanking', () => {
  it('blanks the placeholder in foreign-namespace URIs while signing', () => {
    const normalized = normalizeDataset(
      introducingNanopub(DEFAULT_NANOPUB_URI, PLACEHOLDER),
      DEFAULT_NANOPUB_URI,
      TRUSTY_BASE,
    );

    expect(normalized).not.toContain(PLACEHOLDER);
    expect(normalized).toContain('https://example.org/ns/ ');
  });

  it('blanks the deprecated placeholder the same way', () => {
    const normalized = normalizeDataset(
      introducingNanopub(DEFAULT_NANOPUB_URI, DEPRECATED_PLACEHOLDER),
      DEFAULT_NANOPUB_URI,
      TRUSTY_BASE,
    );

    expect(normalized).not.toContain(DEPRECATED_PLACEHOLDER);
    expect(normalized).toContain('https://example.org/ns/ ');
  });

  it("blanks this nanopub's own artifact code in foreign-namespace URIs while verifying", () => {
    const trustyUri = `${TRUSTY_BASE}${CODE}`;
    const normalized = normalizeDataset(
      introducingNanopub(`${trustyUri}/`, CODE),
      trustyUri,
      TRUSTY_BASE,
    );

    expect(normalized).not.toContain(CODE);
    expect(normalized).toContain('https://example.org/ns/ ');
  });

  it('normalizes identically before signing and on verification', () => {
    const trustyUri = `${TRUSTY_BASE}${CODE}`;

    const signing = normalizeDataset(
      introducingNanopub(DEFAULT_NANOPUB_URI, PLACEHOLDER),
      DEFAULT_NANOPUB_URI,
      TRUSTY_BASE,
    );
    const verifying = normalizeDataset(
      introducingNanopub(`${trustyUri}/`, CODE),
      trustyUri,
      TRUSTY_BASE,
    );

    expect(verifying).toBe(signing);
  });

  it('leaves references to other trusty nanopubs untouched', () => {
    const normalized = normalizeDataset(
      introducingNanopub(DEFAULT_NANOPUB_URI, PLACEHOLDER),
      DEFAULT_NANOPUB_URI,
      TRUSTY_BASE,
    );

    expect(normalized).toContain(`https://w3id.org/np/${OTHER_CODE}`);
  });
});
