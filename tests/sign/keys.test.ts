import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync, KeyObject } from 'crypto';
import { normalizePrivateKey, normalizePublicKey } from '../../src/sign/crypto/keys';
import { nodeCrypto } from '../../src/sign/crypto/node';
import { browserCrypto } from '../../src/sign/crypto/browser';
import { sign } from '../../src/sign/sign';

const MINIMAL_TRIG = `\
@prefix this: <http://purl.org/nanopub/temp/np/>.
@prefix sub: <http://purl.org/nanopub/temp/np/>.
@prefix np: <http://www.nanopub.org/nschema#>.
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
  <http://purl.org/nanopub/temp/np> <http://purl.org/dc/terms/created> "2024-01-01T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>
}
`;

let privateKeyObj: KeyObject;
let publicKeyObj: KeyObject;

/** The canonical forms: single-line base64 of the PKCS#8 / SPKI DER. */
let privateBase64: string;
let publicBase64: string;

beforeAll(() => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  privateKeyObj = pair.privateKey;
  publicKeyObj = pair.publicKey;

  privateBase64 = privateKeyObj.export({ format: 'der', type: 'pkcs8' }).toString('base64');
  publicBase64 = publicKeyObj.export({ format: 'der', type: 'spki' }).toString('base64');
});

describe('normalizePrivateKey', () => {
  it('leaves the canonical single-line base64 untouched', () => {
    expect(normalizePrivateKey(privateBase64)).toBe(privateBase64);
  });

  it('is idempotent', () => {
    const pem = privateKeyObj.export({ format: 'pem', type: 'pkcs8' }).toString();
    expect(normalizePrivateKey(normalizePrivateKey(pem))).toBe(privateBase64);
  });

  it('accepts base64 broken over lines, and surrounding whitespace', () => {
    const wrapped = privateBase64.match(/.{1,64}/g)!.join('\n');
    expect(normalizePrivateKey(wrapped)).toBe(privateBase64);
    expect(normalizePrivateKey(`\n  ${privateBase64}  \n`)).toBe(privateBase64);
  });

  it('accepts PKCS#8 PEM armor', () => {
    const pem = privateKeyObj.export({ format: 'pem', type: 'pkcs8' }).toString();
    expect(normalizePrivateKey(pem)).toBe(privateBase64);
  });

  it('accepts PKCS#8 PEM with CRLF line endings', () => {
    const pem = privateKeyObj
      .export({ format: 'pem', type: 'pkcs8' })
      .toString()
      .replace(/\n/g, '\r\n');
    expect(normalizePrivateKey(pem)).toBe(privateBase64);
  });

  it('converts PKCS#1 PEM to PKCS#8', () => {
    const pem = privateKeyObj.export({ format: 'pem', type: 'pkcs1' }).toString();
    expect(normalizePrivateKey(pem)).toBe(privateBase64);
  });

  it('converts bare base64 of a PKCS#1 DER to PKCS#8', () => {
    const pkcs1 = privateKeyObj.export({ format: 'der', type: 'pkcs1' }).toString('base64');
    expect(normalizePrivateKey(pkcs1)).toBe(privateBase64);
  });

  it('rejects a public key with a message naming the problem', () => {
    const pem = publicKeyObj.export({ format: 'pem', type: 'spki' }).toString();
    expect(() => normalizePrivateKey(pem)).toThrow(/public key was provided where a private key/i);
  });

  it('rejects a passphrase-protected key, naming openssl pkcs8 as the fix', () => {
    const encrypted = privateKeyObj
      .export({ format: 'pem', type: 'pkcs8', cipher: 'aes-256-cbc', passphrase: 'secret' })
      .toString();
    expect(() => normalizePrivateKey(encrypted)).toThrow(/passphrase-protected/i);
    expect(() => normalizePrivateKey(encrypted)).toThrow(/openssl pkcs8/);
  });

  it('rejects an OpenSSH private key, naming ssh-keygen as the fix', () => {
    const openssh = '-----BEGIN OPENSSH PRIVATE KEY-----\nAAAA\n-----END OPENSSH PRIVATE KEY-----';
    expect(() => normalizePrivateKey(openssh)).toThrow(/ssh-keygen/);
  });

  it('rejects truncated PEM armor', () => {
    const pem = privateKeyObj.export({ format: 'pem', type: 'pkcs8' }).toString();
    expect(() => normalizePrivateKey(pem.replace(/-----END PRIVATE KEY-----\n?/, ''))).toThrow(
      /-----END/,
    );
  });

  it('rejects a key that is not base64 at all', () => {
    expect(() => normalizePrivateKey('this is not a key!')).toThrow(/not valid base64/i);
  });

  it('rejects base64 that is not an RSA key', () => {
    expect(() => normalizePrivateKey('aGVsbG8gd29ybGQ=')).toThrow(/recognizable RSA key/i);
  });

  it('rejects an empty key', () => {
    expect(() => normalizePrivateKey('   ')).toThrow(/No RSA private key was provided/i);
  });
});

describe('normalizePublicKey', () => {
  it('leaves the canonical single-line base64 untouched', () => {
    expect(normalizePublicKey(publicBase64)).toBe(publicBase64);
  });

  it('accepts SubjectPublicKeyInfo PEM armor', () => {
    const pem = publicKeyObj.export({ format: 'pem', type: 'spki' }).toString();
    expect(normalizePublicKey(pem)).toBe(publicBase64);
  });

  it('converts PKCS#1 PEM to SubjectPublicKeyInfo', () => {
    const pem = publicKeyObj.export({ format: 'pem', type: 'pkcs1' }).toString();
    expect(normalizePublicKey(pem)).toBe(publicBase64);
  });

  it('converts bare base64 of a PKCS#1 DER to SubjectPublicKeyInfo', () => {
    const pkcs1 = publicKeyObj.export({ format: 'der', type: 'pkcs1' }).toString('base64');
    expect(normalizePublicKey(pkcs1)).toBe(publicBase64);
  });

  it('accepts an SSH public key only with a message naming the conversion', () => {
    expect(() => normalizePublicKey('ssh-rsa AAAAB3NzaC1yc2E user@host')).toThrow(/ssh-keygen/);
  });

  it('rejects a private key with a message naming the problem', () => {
    expect(() => normalizePublicKey(privateBase64)).toThrow(
      /private key was provided where a public key/i,
    );
  });
});

// Both adapters must accept the same key forms: a nanopub signed in the browser
// and one signed in Node have to come out identical.
describe.each([
  ['nodeCrypto', nodeCrypto],
  ['browserCrypto', browserCrypto],
])('%s accepts every key form', (_name, adapter) => {
  it('derives the same public key from PEM as from bare base64', async () => {
    const pkcs8Pem = privateKeyObj.export({ format: 'pem', type: 'pkcs8' }).toString();
    const pkcs1Pem = privateKeyObj.export({ format: 'pem', type: 'pkcs1' }).toString();

    const fromBase64 = await adapter.extractPublicKey(privateBase64);
    expect(await adapter.extractPublicKey(pkcs8Pem)).toBe(fromBase64);
    expect(await adapter.extractPublicKey(pkcs1Pem)).toBe(fromBase64);
    expect(fromBase64).toBe(publicBase64);
  });

  it('signs identically whatever form the key came in', async () => {
    const pkcs8Pem = privateKeyObj.export({ format: 'pem', type: 'pkcs8' }).toString();
    const pkcs1Pem = privateKeyObj.export({ format: 'pem', type: 'pkcs1' }).toString();

    const expected = await adapter.sign('hello', privateBase64);
    expect(await adapter.sign('hello', pkcs8Pem)).toBe(expected);
    expect(await adapter.sign('hello', pkcs1Pem)).toBe(expected);
  });

  it('verifies with a PEM-armored public key', async () => {
    const signature = await adapter.sign('hello', privateBase64);
    const pem = publicKeyObj.export({ format: 'pem', type: 'spki' }).toString();

    expect(await adapter.verify('hello', signature, pem)).toBe(true);
    expect(await adapter.verify('goodbye', signature, pem)).toBe(false);
  });

  it('reports an unusable key by its format, not with an opaque crypto error', async () => {
    await expect(adapter.sign('hello', 'this is not a key!')).rejects.toThrow(
      /not valid base64/i,
    );
  });
});

// The end-to-end path from the issue: signing a nanopub with a PEM key.
describe('sign() with a PEM-armored key', () => {
  it('produces the same nanopub as the bare base64 key', async () => {
    const pem = privateKeyObj.export({ format: 'pem', type: 'pkcs8' }).toString();

    const fromPem = await sign(MINIMAL_TRIG, pem);
    const fromBase64 = await sign(MINIMAL_TRIG, privateBase64);

    expect(fromPem.sourceUri).toBe(fromBase64.sourceUri);
    expect(fromPem.signedRdf).toBe(fromBase64.signedRdf);
  });
});
