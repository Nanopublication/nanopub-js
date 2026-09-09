import { describe, it, expect, beforeEach } from 'vitest';
import { createIntroNanopub, serialize } from '../src/index';
import { generateKeyPairSync } from 'crypto';
import { NPX, FOAF, DCT, PROV } from '../src/vocab';

const AGENT = 'https://orcid.org/0000-0002-1267-0234';

function generatePrivateKey(): string {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\r?\n|\r/g, '');
}

describe('createIntroNanopub', () => {
  let privateKey: string;

  beforeEach(() => {
    privateKey = generatePrivateKey();
  });

  it('declares the key for the agent', async () => {
    const np = await createIntroNanopub({ agent: AGENT, privateKey });

    const declaredBy = np.assertion.find(
      (q) => q.predicate.value === NPX('declaredBy').value,
    );
    expect(declaredBy?.object.value).toBe(AGENT);

    const algorithm = np.assertion.find(
      (q) => q.predicate.value === NPX('hasAlgorithm').value,
    );
    expect(algorithm?.object.value).toBe('RSA');

    const publicKey = np.assertion.find(
      (q) => q.predicate.value === NPX('hasPublicKey').value,
    );
    expect(publicKey?.object.value.length).toBeGreaterThan(0);
  });

  it('derives the public key from the private key', async () => {
    const np = await createIntroNanopub({ agent: AGENT, privateKey });
    const derived = np.assertion.find(
      (q) => q.predicate.value === NPX('hasPublicKey').value,
    )?.object.value;

    const given = await createIntroNanopub({
      agent: AGENT,
      privateKey,
      publicKey: 'AAAA',
    });
    const explicit = given.assertion.find(
      (q) => q.predicate.value === NPX('hasPublicKey').value,
    )?.object.value;

    expect(derived).not.toBe('AAAA');
    expect(explicit).toBe('AAAA');
  });

  it('introduces the agent rather than the key declaration', async () => {
    const np = await createIntroNanopub({ agent: AGENT, privateKey });

    const introduces = np.pubinfo.find(
      (q) => q.predicate.value === NPX('introduces').value,
    );
    expect(introduces?.object.value).toBe(AGENT);

    const type = np.pubinfo.find(
      (q) => q.predicate.value === NPX('hasNanopubType').value,
    );
    expect(type?.object.value).toBe(NPX('declaredBy').value);
  });

  it('attributes the assertion to the agent', async () => {
    const np = await createIntroNanopub({ agent: AGENT, privateKey });

    const attributed = np.provenance.find(
      (q) => q.predicate.value === PROV('wasAttributedTo').value,
    );
    expect(attributed?.object.value).toBe(AGENT);
  });

  it('records the name when given, and omits it otherwise', async () => {
    const withName = await createIntroNanopub({
      agent: AGENT,
      privateKey,
      name: 'Tobias Kuhn',
    });
    expect(
      withName.assertion.find((q) => q.predicate.value === FOAF('name').value)
        ?.object.value,
    ).toBe('Tobias Kuhn');
    expect(
      withName.pubinfo.find((q) => q.predicate.value === FOAF('name').value)
        ?.object.value,
    ).toBe('Tobias Kuhn');

    const withoutName = await createIntroNanopub({ agent: AGENT, privateKey });
    expect(
      withoutName.assertion.some(
        (q) => q.predicate.value === FOAF('name').value,
      ),
    ).toBe(false);
  });

  it('declares several keys under distinct subjects', async () => {
    const np = await createIntroNanopub({
      agent: AGENT,
      privateKey,
      keys: [
        { publicKey: 'AAAA' },
        { publicKey: 'BBBB', keyLocation: 'https://nanodash.net/' },
      ],
    });

    const subjects = new Set(
      np.assertion
        .filter((q) => q.predicate.value === NPX('hasPublicKey').value)
        .map((q) => q.subject.value),
    );
    expect(subjects.size).toBe(2);

    const location = np.assertion.find(
      (q) => q.predicate.value === NPX('hasKeyLocation').value,
    );
    expect(location?.object.value).toBe('https://nanodash.net/');
  });

  it('omits the key location unless given', async () => {
    const np = await createIntroNanopub({ agent: AGENT, privateKey });
    expect(
      np.assertion.some(
        (q) => q.predicate.value === NPX('hasKeyLocation').value,
      ),
    ).toBe(false);
  });

  it('defaults the license to CC0', async () => {
    const np = await createIntroNanopub({ agent: AGENT, privateKey });
    const license = np.pubinfo.find(
      (q) => q.predicate.value === DCT('license').value,
    );
    expect(license?.object.value).toBe(
      'https://creativecommons.org/publicdomain/zero/1.0/',
    );
  });

  it('signs with the key it declares', async () => {
    const np = await createIntroNanopub({ agent: AGENT, privateKey });
    await np.sign();

    expect(await np.hasValidSignature()).toBe(true);

    const signedBy = np.pubinfo.find(
      (q) => q.predicate.value === NPX('signedBy').value,
    );
    expect(signedBy?.object.value).toBe(AGENT);

    const declared = np.assertion.find(
      (q) => q.predicate.value === NPX('hasPublicKey').value,
    )?.object.value;
    const signing = np.pubinfo.find(
      (q) => q.predicate.value === NPX('hasPublicKey').value,
    )?.object.value;
    expect(declared).toBe(signing);
  });

  it('serializes to trig', async () => {
    const np = await createIntroNanopub({ agent: AGENT, privateKey, name: 'A' });
    const trig = await serialize(np, 'trig');

    expect(trig).toContain('declaredBy');
    expect(trig).toContain('introduces');
  });

  it('requires an agent and a private key', async () => {
    await expect(
      createIntroNanopub({ agent: '', privateKey }),
    ).rejects.toThrow(/agent/i);
    await expect(
      createIntroNanopub({ agent: AGENT, privateKey: '' }),
    ).rejects.toThrow(/private key/i);
  });
});
