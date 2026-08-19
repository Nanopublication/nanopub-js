import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { sign } from '../../src/sign/sign';
import { verifySignature } from '../../src/sign/verify';

// An agent's IRI should be a sub-IRI of its own introduction, so that the
// introduction can be self-signed with the agent's key in a single step. The
// signer IRI must therefore go through the same temp-URI replacement as every
// other term, both when normalizing (so it is hashed as a self-reference) and
// when emitting the final trusty URIs.
//
// See nanopub-java issue #127 / PR #128, where the signer statement was added
// after the temp-URI replacement pass and kept its raw temp URI.

const TEMP_PREFIX = 'http://purl.org/nanopub/temp/';
const BOT = `${TEMP_PREFIX}np/my-bot`;
const ORCID = 'https://orcid.org/0000-0002-1825-0097';

// A key declaration introducing `sub:my-bot`, the agent that also signs it.
const INTRO_TRIG = `\
@prefix sub: <http://purl.org/nanopub/temp/np/>.
@prefix np: <http://www.nanopub.org/nschema#>.
@prefix npx: <http://purl.org/nanopub/x/>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

sub:Head {
  <http://purl.org/nanopub/temp/np> a np:Nanopublication;
    np:hasAssertion sub:assertion;
    np:hasProvenance sub:provenance;
    np:hasPublicationInfo sub:pubinfo
}
sub:assertion {
  sub:keyDeclaration npx:declaredBy sub:my-bot;
    npx:hasAlgorithm "RSA".
  sub:my-bot foaf:name "My Bot"
}
sub:provenance {
  sub:assertion prov:wasAttributedTo sub:my-bot
}
sub:pubinfo {
  <http://purl.org/nanopub/temp/np> prov:wasAttributedTo sub:my-bot
}
`;

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

describe('sign() with a signer that is a sub-IRI of the signed nanopub', () => {
  it('replaces the temp signer IRI with the trusty sub-IRI', async () => {
    const { signedRdf, sourceUri } = await sign(INTRO_TRIG, privateKeyBase64, BOT);

    expect(signedRdf).not.toContain(TEMP_PREFIX);
    expect(signedRdf).toContain('npx:signedBy');
    expect(signedRdf).toContain(`${sourceUri}/`);
  });

  it('keeps the self-signed nanopub verifiable', async () => {
    // The signer IRI is part of the hash, so it must normalize to a
    // self-reference in exactly the same way when signing and when verifying.
    const { signedRdf } = await sign(INTRO_TRIG, privateKeyBase64, BOT);

    await expect(verifySignature(signedRdf)).resolves.toEqual({ valid: true });
  });

  it('leaves an external signer IRI untouched', async () => {
    const { signedRdf } = await sign(INTRO_TRIG, privateKeyBase64, ORCID);

    expect(signedRdf).toContain(ORCID);
    await expect(verifySignature(signedRdf)).resolves.toEqual({ valid: true });
  });
});
