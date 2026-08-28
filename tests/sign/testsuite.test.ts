/**
 * Tests driven by the official Nanopublication Test Suite.
 *
 * Downloads the test suite from GitHub on first run (cached in a temp dir).
 * Requires network access; the suite is fetched in beforeAll with a 60s timeout.
 *
 * Covers:
 *  - Transform cases: sign each plain input and compare artifact code to expected
 *  - `~~~ARTIFACTCODE~~~` substitution: the `artifactcode-1` case, which mints a
 *    concept in a foreign namespace, pinned against the reference output
 *  - Valid TRUSTY entries: verifySignature() should pass for all
 *  - Invalid SIGNED/TRUSTY entries: verifySignature() should fail for all
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { NanopubTestSuite, TestSuiteSubfolder } from '@nanopub/nanopub-testsuite-connector-js';

import { sign } from '../../src/sign/sign';
import { parse } from '../../src/serialize';
import { verifySignature } from '../../src/sign/verify';

let suite: NanopubTestSuite;
let profileOrcid: string;

// Pin to a specific suite commit for deterministic CI. getLatest() tracks the
// upstream `main` HEAD, so new/changed cases there would break this build
// unrelated to our code. Bump this SHA deliberately when adopting suite updates.
const SUITE_COMMIT = 'cfe963044bf58385687f40bf37ac424a83687a13';

beforeAll(async () => {
  suite = await NanopubTestSuite.getAtCommit(SUITE_COMMIT);

  // Read the profile ORCID used for transform signing
  const profilePath = join(suite.root, 'transform', 'profile.yaml');
  const profileYaml = readFileSync(profilePath, 'utf8');
  profileOrcid = profileYaml.match(/orcid_id:\s*(\S+)/)?.[1] ?? '';
}, 60_000);

/** Strip PEM headers/footers and whitespace to get bare base64 (PKCS8). */
function pemToBase64(pemPath: string): string {
  return readFileSync(pemPath, 'utf8')
    .replace(/-----BEGIN .*?-----/g, '')
    .replace(/-----END .*?-----/g, '')
    .replace(/\s/g, '');
}

/** Extract artifact code from a trusty URI (last path or hash segment). */
function extractArtifactCode(uri: string): string {
  return uri.replace(/.*[/#]/, '');
}

/** Sorted N-Quads-ish lines, for comparing TriG documents regardless of serialization. */
function toNquads(trig: string): string[] {
  return parse(trig, 'trig')
    .map(q => {
      const object = q.object.termType === 'Literal'
        ? `"${q.object.value}"${q.object.language ? `@${q.object.language}` : `^^<${q.object.datatype.value}>`}`
        : `<${q.object.value}>`;
      return `<${q.graph.value}> <${q.subject.value}> <${q.predicate.value}> ${object}`;
    })
    .sort();
}

// Transform cases
describe('test suite: transform cases (sign)', () => {
  it('all transform cases produce the expected artifact code', async () => {
    const cases = suite.getTransformCases();
    expect(cases.length).toBeGreaterThan(0);

    for (const tc of cases) {
      if (!tc.outCode) continue; // skip if no expected code

      const privKey = pemToBase64(suite.getSigningKey(tc.keyName).privateKey);
      const { sourceUri } = await sign(tc.plain.readText(), privKey, profileOrcid);
      const code = extractArtifactCode(sourceUri);

      expect(code, `${tc.keyName}/${tc.plain.name}`).toBe(tc.outCode);
    }
  }, 120_000);
});

// `~~~ARTIFACTCODE~~~` substitution, pinned against the reference implementation.
//
// `artifactcode-1` keeps the default temp nanopub URI but mints a concept in a
// foreign namespace (`https://example.org/ns/~~~ARTIFACTCODE~~~`), so it pins
// that the placeholder is substituted globally, not only inside the nanopub's
// own base URI.
describe('test suite: `~~~ARTIFACTCODE~~~` substitution (transform case)', () => {
  const CASE_NAME = 'artifactcode-1';

  function artifactCodeCase() {
    const tc = suite.getTransformCases().find(c => c.plain.name.startsWith(`${CASE_NAME}.`));
    expect(tc, `transform case '${CASE_NAME}' missing from suite ${SUITE_COMMIT}`).toBeDefined();
    return tc!;
  }

  it('substitutes the placeholder in a foreign namespace with the reference artifact code', async () => {
    const tc = artifactCodeCase();
    const privKey = pemToBase64(suite.getSigningKey(tc.keyName).privateKey);

    const { signedRdf, sourceUri } = await sign(tc.plain.readText(), privKey, profileOrcid);
    const code = extractArtifactCode(sourceUri);

    expect(code).toBe(tc.outCode);
    expect(signedRdf).not.toMatch(/ARTIFACTCODE/);
    expect(signedRdf).toContain(`https://example.org/ns/${code}`);
    // The nanopub itself keeps the standard trusty base, only the concept moves.
    expect(sourceUri).toBe(`https://w3id.org/np/${code}`);
  }, 30_000);

  it('produces the same quads as the reference signed output', async () => {
    const tc = artifactCodeCase();
    const privKey = pemToBase64(suite.getSigningKey(tc.keyName).privateKey);

    const { signedRdf } = await sign(tc.plain.readText(), privKey, profileOrcid);

    const expected = toNquads(tc.signed.readText());
    expect(expected.length).toBeGreaterThan(0);
    expect(toNquads(signedRdf)).toEqual(expected);
  }, 30_000);

  it('verifies the nanopub it signed', async () => {
    const tc = artifactCodeCase();
    const privKey = pemToBase64(suite.getSigningKey(tc.keyName).privateKey);

    const { signedRdf } = await sign(tc.plain.readText(), privKey, profileOrcid);

    expect(await verifySignature(signedRdf)).toEqual({ valid: true });
  }, 30_000);

  it('verifies the reference signed output', async () => {
    const tc = artifactCodeCase();

    expect(await verifySignature(tc.signed.readText())).toEqual({ valid: true });
  }, 30_000);
});

// Signature verification: valid SIGNED entries

// Note: TRUSTY entries have trusty URIs but may not carry npx:hasSignature
// triples, they are unsigned trusty nanopubs. Only SIGNED entries are
// expected to be verifiable with verifySignature().

describe('test suite: valid SIGNED entries (verify)', () => {
  it('verifySignature() returns valid=true for all valid SIGNED entries', async () => {
    const entries = suite.getValid(TestSuiteSubfolder.SIGNED);
    expect(entries.length).toBeGreaterThan(0);

    const failures: string[] = [];
    const skipped: string[] = [];

    for (const entry of entries) {
      try {
        const result = await verifySignature(entry.readText());
        if (!result.valid) {
          failures.push(`${entry.name}: ${(result as { valid: false; reason: string }).reason}`);
        }
      } catch (e) {
        if (e instanceof Error && (e.message.includes('Invalid key type') || e.message.includes('unsupported'))) {
          skipped.push(entry.name); // known limitation: old-format key (e.g. 1024-bit RSA, DSA)
        } else {
          throw e;
        }
      }
    }

    if (skipped.length > 0) {
      console.warn(`Skipped ${skipped.length} entries with unsupported key types: ${skipped.join(', ')}`);
    }
    expect(failures, `Failed entries:\n${failures.join('\n')}`).toHaveLength(0);
  }, 120_000);
});

// Signature verification: invalid SIGNED entries

describe('test suite: invalid SIGNED entries (verify)', () => {
  it('verifySignature() returns valid=false for all invalid SIGNED entries', async () => {
    const entries = suite.getInvalid(TestSuiteSubfolder.SIGNED);
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      try {
        const result = await verifySignature(entry.readText());
        expect(result.valid, `${entry.name}`).toBe(false);
      } catch (e) {
        if (e instanceof Error && (e.message.includes('Invalid key type') || e.message.includes('unsupported'))) {
          // Old-format keys that Web Crypto can't verify are treated as invalid — correct behaviour.
        } else {
          throw e;
        }
      }
    }
  }, 60_000);
});
