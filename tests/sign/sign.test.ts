import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { sign } from '../../src/sign/sign';

// A minimal valid unsigned nanopub in TriG (uses the temp placeholder URI)
const MINIMAL_TRIG = `\
@prefix this: <http://purl.org/nanopub/temp/np/>.
@prefix sub: <http://purl.org/nanopub/temp/np/>.
@prefix np: <http://www.nanopub.org/nschema#>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix npx: <http://purl.org/nanopub/x/>.

sub:Head {
  <http://purl.org/nanopub/temp/np> a np:Nanopublication;
    np:hasAssertion sub:assertion;
    np:hasProvenance sub:provenance;
    np:hasPublicationInfo sub:pubinfo
}
sub:assertion {
  <http://example.org/s> <http://example.org/p> <http://example.org/o>
}
sub:provenance {
  sub:assertion <http://purl.org/dc/terms/created> "2024-01-01T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>
}
sub:pubinfo {
  <http://purl.org/nanopub/temp/np> <http://purl.org/dc/terms/creator> <https://orcid.org/0000-0000-0000-0000>
}
`;

const ORCID = 'https://orcid.org/0000-0000-0000-0000';

let privateKeyBase64: string;

beforeAll(() => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  privateKeyBase64 = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\r?\n|\r/g, '');
});

describe('sign()', () => {
  it('returns signedRdf, sourceUri, and signature', async () => {
    const result = await sign(MINIMAL_TRIG, privateKeyBase64);

    expect(result).toHaveProperty('signedRdf');
    expect(result).toHaveProperty('sourceUri');
    expect(result).toHaveProperty('signature');
    expect(typeof result.signedRdf).toBe('string');
    expect(typeof result.sourceUri).toBe('string');
    expect(typeof result.signature).toBe('string');
  });

  it('sourceUri is a trusty nanopub URI starting with https://w3id.org/np/RA', async () => {
    const { sourceUri } = await sign(MINIMAL_TRIG, privateKeyBase64);
    expect(sourceUri).toMatch(/^https:\/\/w3id\.org\/np\/RA[A-Za-z0-9\-_]+$/);
  });

  it('signedRdf contains the trusty sourceUri', async () => {
    const { signedRdf, sourceUri } = await sign(MINIMAL_TRIG, privateKeyBase64);
    expect(signedRdf).toContain(sourceUri);
  });

  it('signedRdf contains hasPublicKey and hasSignature triples', async () => {
    const { signedRdf } = await sign(MINIMAL_TRIG, privateKeyBase64);
    expect(signedRdf).toContain('hasPublicKey');
    expect(signedRdf).toContain('hasSignature');
  });

  it('signedRdf no longer contains the temp placeholder URI', async () => {
    const { signedRdf } = await sign(MINIMAL_TRIG, privateKeyBase64);
    expect(signedRdf).not.toContain('http://purl.org/nanopub/temp/np');
  });

  it('includes signedBy triple when orcid is provided', async () => {
    const { signedRdf } = await sign(MINIMAL_TRIG, privateKeyBase64, ORCID);
    expect(signedRdf).toContain('signedBy');
    expect(signedRdf).toContain(ORCID);
  });

  it('omits signedBy triple when orcid is not provided', async () => {
    const { signedRdf } = await sign(MINIMAL_TRIG, privateKeyBase64);
    expect(signedRdf).not.toContain('signedBy');
  });

  it('signature is a non-empty base64 string', async () => {
    const { signature } = await sign(MINIMAL_TRIG, privateKeyBase64);
    expect(signature.length).toBeGreaterThan(0);
    expect(() => atob(signature)).not.toThrow();
  });

  it('two calls with the same key produce the same trusty hash (RSASSA-PKCS1-v1_5 is deterministic)', async () => {
    const r1 = await sign(MINIMAL_TRIG, privateKeyBase64);
    const r2 = await sign(MINIMAL_TRIG, privateKeyBase64);
    expect(r1.sourceUri).toBe(r2.sourceUri);
    expect(r1.signature).toBe(r2.signature);
  });
});
