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
  <http://purl.org/nanopub/temp/np> <http://purl.org/dc/terms/creator> <https://orcid.org/0000-0000-0000-0000>;
    <http://purl.org/dc/terms/created> "2024-01-01T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>
}
`;

// Standard placeholder URI nanopub. dct:created is pre-stamped for deterministic hashes.
// No dct:creator (our code adds it when orcid is provided) and no signedBy.
const INPUT_TRIG_STANDARD = `<http://purl.org/nanopub/temp/np/Head> {
<http://purl.org/nanopub/temp/np/> a <http://www.nanopub.org/nschema#Nanopublication>;
<http://www.nanopub.org/nschema#hasAssertion> <http://purl.org/nanopub/temp/np/assertion>;
<http://www.nanopub.org/nschema#hasProvenance> <http://purl.org/nanopub/temp/np/provenance>;
<http://www.nanopub.org/nschema#hasPublicationInfo> <http://purl.org/nanopub/temp/np/pubinfo>
}
<http://purl.org/nanopub/temp/np/assertion> {
<https://doi.org/10.1016/j.joclim.2025.100573> a <http://purl.org/spar/fabio/ScholarlyWork>;
<http://purl.org/spar/cito/usesDataFrom> <https://doi.org/10.1126/science.aar3646>
}
<http://purl.org/nanopub/temp/np/provenance> {
<http://purl.org/nanopub/temp/np/assertion> <http://www.w3.org/ns/prov#wasAttributedTo> <https://orcid.org/0000-9999-1234-9999>
}
<http://purl.org/nanopub/temp/np/pubinfo> {
<http://purl.org/nanopub/temp/np/> <http://purl.org/dc/terms/created> "2025-01-01T00:00:00.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>
}
`;

// Custom placeholder URI nanopub. Same content as above but using a custom base URI.
const INPUT_TRIG_CUSTOM = `<https://w3id.org/sciencelive/np/Head> {
<https://w3id.org/sciencelive/np/> a <http://www.nanopub.org/nschema#Nanopublication>;
<http://www.nanopub.org/nschema#hasAssertion> <https://w3id.org/sciencelive/np/assertion>;
<http://www.nanopub.org/nschema#hasProvenance> <https://w3id.org/sciencelive/np/provenance>;
<http://www.nanopub.org/nschema#hasPublicationInfo> <https://w3id.org/sciencelive/np/pubinfo>
}
<https://w3id.org/sciencelive/np/assertion> {
<https://doi.org/10.1016/j.joclim.2025.100573> a <http://purl.org/spar/fabio/ScholarlyWork>;
<http://purl.org/spar/cito/usesDataFrom> <https://doi.org/10.1126/science.aar3646>
}
<https://w3id.org/sciencelive/np/provenance> {
<https://w3id.org/sciencelive/np/assertion> <http://www.w3.org/ns/prov#wasAttributedTo> <https://orcid.org/0000-9999-1234-9999>
}
<https://w3id.org/sciencelive/np/pubinfo> {
<https://w3id.org/sciencelive/np/> <http://purl.org/dc/terms/created> "2025-01-01T00:00:00.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>
}
`;

const ORCID = 'https://orcid.org/0000-0000-0000-0000';
const ORCID_CUSTOM = 'https://orcid.org/0000-9999-1234-9999';

// Fixed key for deterministic hash tests
const FIXED_PRIVATE_KEY =
  'MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNQEcoXXchdpTm71Tidhyr1BMJp8jYeVg7/oLbmE5WOJ0hilSH/bmivywB+HoTOr6/3tpinw0Bws2M2m/7LLnDaaeYB5RC2DoD2BKBa499yOHa3rGMGOh/viyCGOJbjFPINlMhsIzsr+wvktHw0JclfW508lHmudjzR1/6B3OPdbj6Xw292VHIRt2WdyCmPEc8/3zvzuycQ3xsURnMxRoAdFqIf5iP30pn9uqP+Ex1rUaZ4lbrU8AuNPys3fiIPDVTYgsh4alY/IcYvd5OCvn2uw4LoXd/JZb9EJuS1KYK9v/DRirCdlvSNh4hy5UE7/nNgmXDt3xYjDfzOYN/8N9hAgMBAAECggEANbec5/OOOjPOxKHelWZUGqRmVyCScBVSAmGZ3d7+oZIvjZemh/DfpLhjzCA70syNH6ozfZwiy1MweKyyogoSlBISyrcxFk2A4YCrVzPPWhw5AA9IaGIcd1JOU74vf8Y6JywQlcCfIVLpfYnvaBcvd6BcSD8jMD9ziDgl5koM9H5iVDAr/J7XTm7iRxT3keCmfwBSs1rI0HB156e/QvG8eX/XX4hqrTJsRzC9S6wwkD/KSxan+ZHqN5d5eRI/3g9AYXNRqj0Nq2GOR2m4yC4UbL3ua7gEGxueErbKIm6uzWnCZSSV5fWXAALCmgILHeMpMMTej9+nd9ha2D3gJAoAAQKBgQDPV2sXW97OaL7jnTKd6tFbPgjrZ4YdkP917XTpOkhldJmiwhCDWo5BUSeo0aihB0rYwDNpGNgyBA9BNM5lBSCWrpAT3FMWrsUX6Y5Lg9UBaY5eXATmqf29YZPrWHG5b0vuU4MB59GzMPzAnzlysxLarzPbQBvXSeCNwLXtTKukcQKBgQD9a0Yb7FMNNHQlG8lOkftGRRIBejt+KPpg4cLF57nZJ5xgYaky+aiJLzZaof2Tmo7tsB3tlHv59opA9BCjB6iJ23OXTuO1Z5nqwH/PLe3m9QUd3syRgJ9a04is/GdxcUWUFG8shIBn1Gv0AYvZPwYXLduvdU5mnfTwKJfClvCh8QKBgQCfG3Mniq1QcZrCadf0zMP5I4KOunN1btZKNXz4mGwDxtU6y3cGhVASmWc4qiKf50utRthsts74mprmK9KSPLwERVJ0myb7igPe1LAIDNNA8TJ6AF0WcK4xTJbJC6bBaMG40kb/CFioDFh4q/bWqMo4HChMAEcdDykNPiudPK+eUQKBgQCWKuIxm7mfIo0MjEme0Gx4uGcyDu+AE+JCVKVpRqZfYtSMXHK57S0Mlbh8vm8X70dw26LwbMOGXKySTs4o/VnGzw7RA4N1tH2FmSpjZ5EJAfpVN/g65GAJnz3nW+4kT/3uAKncVGwOmtaZke0AABOo2pjKgRXDQyiowzUirvTK0QKBgQDOKqcTGGphC1pIpF/SUtdya0YXNoNoPtFBG5YmWjW0X7MonCisR0ffMsbqJWD00q2rzNG9kTU6u/3lKHrFFVktFQRYj4DJcLBxowt2j/WNiUOekFFw/xFbTCq7Sb2IoYUnQQPETKkrSq1WaAJ30rQRjhbXlpTPBOXj+tUrZ/BS+w==';

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

  it('includes dct:creator and npx:signedBy when orcid is provided', async () => {
    const { signedRdf } = await sign(MINIMAL_TRIG, privateKeyBase64, ORCID);
    expect(signedRdf).toContain('dc:creator');
    expect(signedRdf).toContain('npx:signedBy');
    expect(signedRdf).toContain(ORCID);
  });

  it('omits npx:signedBy when orcid is not provided', async () => {
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

describe('sign() with standard placeholder URI (fixed key)', () => {
  it('sourceUri is remapped to TRUSTY_BASE (w3id.org/np)', async () => {
    const { sourceUri } = await sign(INPUT_TRIG_STANDARD, FIXED_PRIVATE_KEY, ORCID_CUSTOM);
    expect(sourceUri).toMatch(/^https:\/\/w3id\.org\/np\/RA/);
  });

  // nanopub-rs adds foaf:name from the profile; our code does not.
  // A fixture with foaf:name pre-populated is needed for exact hash equality.
  it.todo('sourceUri matches the hash of nanopub-rs (needs foaf:name pre-populated in fixture)');
});

describe('sign() with custom URI prefix', () => {
  it('returns signedRdf, sourceUri, and signature', async () => {
    const result = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY);
    expect(result).toHaveProperty('signedRdf');
    expect(result).toHaveProperty('sourceUri');
    expect(result).toHaveProperty('signature');
    expect(typeof result.signedRdf).toBe('string');
    expect(typeof result.sourceUri).toBe('string');
    expect(typeof result.signature).toBe('string');
  });

  it('sourceUri uses the custom base URI (not w3id.org/np)', async () => {
    const { sourceUri } = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY, ORCID_CUSTOM);
    expect(sourceUri).toMatch(/^https:\/\/w3id\.org\/sciencelive\/np\/RA/);
  });

  // nanopub-rs adds foaf:name from the profile; our code does not.
  // A fixture with foaf:name pre-populated is needed for exact hash equality.
  it.todo('sourceUri matches the hash of nanopub-rs (needs foaf:name pre-populated in fixture)');

  it('signedRdf contains the trusty sourceUri', async () => {
    const { signedRdf, sourceUri } = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY);
    expect(signedRdf).toContain(sourceUri);
  });

  it('signedRdf contains hasPublicKey and hasSignature triples', async () => {
    const { signedRdf } = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY);
    expect(signedRdf).toContain('hasPublicKey');
    expect(signedRdf).toContain('hasSignature');
  });

  it('signedRdf does not contain the custom placeholder URI', async () => {
    const { signedRdf } = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY);
    expect(signedRdf).not.toContain('https://w3id.org/sciencelive/np/Head>');
  });

  it('includes npx:signedBy when orcid is provided', async () => {
    const { signedRdf } = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY, ORCID_CUSTOM);
    expect(signedRdf).toContain('npx:signedBy');
    expect(signedRdf).toContain(ORCID_CUSTOM);
  });

  it('omits npx:signedBy when orcid is not provided', async () => {
    const { signedRdf } = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY);
    expect(signedRdf).not.toContain('dc:creator');
    expect(signedRdf).not.toContain('npx:signedBy');
  });

  it('signature is a non-empty base64 string', async () => {
    const { signature } = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY);
    expect(signature.length).toBeGreaterThan(0);
    expect(() => atob(signature)).not.toThrow();
  });

  it('two calls with the same key produce the same trusty hash', async () => {
    const r1 = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY);
    const r2 = await sign(INPUT_TRIG_CUSTOM, FIXED_PRIVATE_KEY);
    expect(r1.sourceUri).toBe(r2.sourceUri);
    expect(r1.signature).toBe(r2.signature);
  });
});
