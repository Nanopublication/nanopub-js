import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataFactory } from 'n3';
import { generateKeyPairSync } from 'crypto';
import {
  Nanopub,
  NanopubClient,
  NPX,
  checkSigningKey,
  classifySigningKey,
  clearSigningKeyCheckCache,
  createIntroNanopub,
  declaresOwnSigningKey,
  enforceSigningKeyCheck,
  hasValidIntroduction,
  INTRODUCTIONS_REPO,
} from '../src/index';
import { getCryptoAdapter } from '../src/sign/crypto';

const { namedNode, literal, quad } = DataFactory;

const SIGNER = 'https://orcid.org/0000-0002-1825-0097';
const KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAdeclaredkey';
const OTHER_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAotherkey';
const NEW_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnewkey';
const INTRO_A = 'https://w3id.org/np/RAintroA';
const INTRO_B = 'https://w3id.org/np/RAintroB';
const ENDPOINT = 'https://query.example.org/';

/**
 * A declaration row as the introductions query returns it, self-signed unless a signing key is given.
 *
 * @param pubkey - the key declared
 * @param introPubkey - the key that signed the introduction
 * @param intronp - the introduction
 * @param user - the signer it is declared for
 * @returns the row
 */
function declared(pubkey: string, introPubkey = pubkey, intronp = INTRO_A, user = SIGNER) {
  return { user, pubkey, intronp, introPubkey };
}

/**
 * A SPARQL JSON response carrying the given introduction rows.
 *
 * @param rows - the rows, as column name to value
 * @returns a fetch response resolving to those rows
 */
function introductionsResponse(rows: Record<string, string>[]) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      head: { vars: ['user', 'pubkey', 'intronp', 'introPubkey'] },
      results: {
        bindings: rows.map((row) =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k, { type: 'literal', value: v }])),
        ),
      },
    }),
  };
}

/**
 * A fresh RSA private key in nanopub's own form, the base64 of the PKCS#8 DER.
 *
 * @returns the private key
 */
function newPrivateKey(): string {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return privateKey.replace(/-----(BEGIN|END) PRIVATE KEY-----|\s/g, '');
}

/**
 * A small unsigned nanopub for the given signer and key.
 *
 * @param privateKey - the key it is signed with
 * @returns the nanopub
 */
function nanopubFor(privateKey: string): Nanopub {
  return new Nanopub({
    assertion: [quad(namedNode('http://example.org/s'), namedNode('http://example.org/p'), literal('o'))],
    options: { privateKey, orcid: SIGNER, name: 'Test' },
  });
}

describe('classifySigningKey', () => {
  it('finds a key declared by a self-signed introduction', () => {
    expect(classifySigningKey([declared(KEY)], SIGNER, KEY)).toEqual({ status: 'declared', introductions: [INTRO_A] });
  });

  it('finds a new key declared by an introduction signed with an existing key it restates', () => {
    const rows = [declared(KEY), declared(KEY, KEY, INTRO_B), declared(NEW_KEY, KEY, INTRO_B)];
    expect(classifySigningKey(rows, SIGNER, NEW_KEY)).toEqual({ status: 'declared', introductions: [INTRO_B] });
  });

  it('does not accept a declaration in an introduction that does not declare its signing key', () => {
    const rows = [declared(KEY), declared(NEW_KEY, KEY, INTRO_B)];
    expect(classifySigningKey(rows, SIGNER, NEW_KEY)).toEqual({
      status: 'declared_without_authority',
      introductions: [INTRO_B],
    });
  });

  it('prefers a declaration with authority listed after one without', () => {
    const rows = [declared(KEY, OTHER_KEY, INTRO_B), declared(KEY)];
    expect(classifySigningKey(rows, SIGNER, KEY).status).toBe('declared');
  });

  it('returns every introduction declaring the key', () => {
    const rows = [declared(KEY), declared(KEY, KEY, INTRO_B)];
    expect(classifySigningKey(rows, SIGNER, KEY).introductions).toEqual([INTRO_A, INTRO_B]);
  });

  it('notices a signer introduced by another key', () => {
    expect(classifySigningKey([declared(OTHER_KEY)], SIGNER, KEY)).toEqual({ status: 'key_not_declared', introductions: [] });
  });

  it('notices a signer nothing introduces', () => {
    const someoneElse = declared(KEY, KEY, INTRO_A, 'https://orcid.org/0000-0000-0000-0001');
    expect(classifySigningKey([someoneElse], SIGNER, KEY).status).toBe('signer_not_introduced');
    expect(classifySigningKey([], SIGNER, KEY).status).toBe('signer_not_introduced');
  });

  it('matches keys the network stores with line breaks', () => {
    const wrapped = `${KEY.slice(0, 20)}\n${KEY.slice(20)}`;
    expect(classifySigningKey([declared(wrapped)], SIGNER, KEY).status).toBe('declared');
  });
});

describe('checkSigningKey', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const realFetch = global.fetch;
  const client = new NanopubClient({ endpoints: [ENDPOINT, 'https://query2.example.org/'] });

  beforeEach(() => {
    clearSigningKeyCheckCache();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('asks the introductions repository about the signer only', async () => {
    fetchMock.mockResolvedValueOnce(introductionsResponse([declared(KEY)]));
    const result = await checkSigningKey(SIGNER, KEY, client);
    expect(result).toMatchObject({ status: 'declared', acceptable: true });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(new URL(INTRODUCTIONS_REPO, ENDPOINT).toString());
    expect(url.searchParams.get('query')).toContain(`values ?user { <${SIGNER}> }`);
  });

  it('names the introductions declaring the key', async () => {
    fetchMock.mockResolvedValueOnce(introductionsResponse([declared(KEY), declared(KEY, KEY, INTRO_B)]));
    expect((await checkSigningKey(SIGNER, KEY, client)).introductions).toEqual([INTRO_A, INTRO_B]);
  });

  it('answers yes or no with hasValidIntroduction', async () => {
    fetchMock.mockResolvedValue(introductionsResponse([declared(KEY)]));
    expect(await hasValidIntroduction(SIGNER, KEY, client)).toBe(true);
    expect(await hasValidIntroduction(SIGNER, OTHER_KEY, client)).toBe(false);
  });

  it('explains a key the network cannot attribute', async () => {
    fetchMock.mockResolvedValueOnce(introductionsResponse([declared(OTHER_KEY)]));
    const result = await checkSigningKey(SIGNER, KEY, client);
    expect(result.status).toBe('key_not_declared');
    expect(result.acceptable).toBe(false);
    expect(result.message).toMatch(/introduced on the network, but by a different key/);
  });

  it('tries the next endpoint when one fails', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable' })
      .mockResolvedValueOnce(introductionsResponse([declared(KEY)]));
    expect((await checkSigningKey(SIGNER, KEY, client)).status).toBe('declared');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails open when no endpoint answers', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await checkSigningKey(SIGNER, KEY, client);
    expect(result).toMatchObject({ status: 'not_checked', acceptable: true });
    expect(result.message).toMatch(/network down/);
  });

  it('reuses the introductions fetched for a signer until the cache is cleared', async () => {
    fetchMock.mockResolvedValue(introductionsResponse([declared(KEY)]));
    await checkSigningKey(SIGNER, KEY, client);
    await checkSigningKey(SIGNER, OTHER_KEY, client);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clearSigningKeyCheckCache();
    await checkSigningKey(SIGNER, KEY, client);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed lookup', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('down'));
    expect((await checkSigningKey(SIGNER, KEY, client)).status).toBe('not_checked');
    fetchMock.mockResolvedValueOnce(introductionsResponse([declared(KEY)]));
    expect((await checkSigningKey(SIGNER, KEY, client)).status).toBe('declared');
  });

  it('asks nothing about a missing signer or key, or a signer that is not a safe IRI', async () => {
    expect((await checkSigningKey(undefined, KEY, client)).status).toBe('not_checked');
    expect((await checkSigningKey(SIGNER, undefined, client)).status).toBe('not_checked');
    expect((await checkSigningKey('https://example.org/a> } drop all { <b', KEY, client)).status).toBe('not_checked');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('declaresOwnSigningKey', () => {
  const node = namedNode('http://purl.org/nanopub/temp/np/keyDeclaration');

  it('recognizes an assertion declaring the signing key for the signer', () => {
    const assertion = [
      quad(node, NPX('declaredBy'), namedNode(SIGNER)),
      quad(node, NPX('hasPublicKey'), literal(KEY)),
    ];
    expect(declaresOwnSigningKey(assertion, SIGNER, KEY)).toBe(true);
  });

  it('does not accept a declaration of another key or for another signer', () => {
    const assertion = [
      quad(node, NPX('declaredBy'), namedNode(SIGNER)),
      quad(node, NPX('hasPublicKey'), literal(OTHER_KEY)),
    ];
    expect(declaresOwnSigningKey(assertion, SIGNER, KEY)).toBe(false);
    expect(declaresOwnSigningKey(assertion, 'https://orcid.org/0000-0000-0000-0001', OTHER_KEY)).toBe(false);
  });
});

describe('enforceSigningKeyCheck', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const realFetch = global.fetch;
  const client = new NanopubClient({ endpoints: [ENDPOINT] });

  beforeEach(() => {
    clearSigningKeyCheckCache();
    fetchMock = vi.fn().mockResolvedValue(introductionsResponse([]));
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('asks nothing when off', async () => {
    expect(await enforceSigningKeyCheck(SIGNER, KEY, [], 'signed', { keyCheck: 'off', client })).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('warns by default and hands the result to onKeyCheck', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onKeyCheck = vi.fn();
    const result = await enforceSigningKeyCheck(SIGNER, KEY, [], 'signed', { onKeyCheck, client });
    expect(result?.status).toBe('signer_not_introduced');
    expect(onKeyCheck).toHaveBeenCalledWith(result);
    expect(warn).toHaveBeenCalledWith(result?.message);
  });

  it('refuses in strict mode', async () => {
    await expect(
      enforceSigningKeyCheck(SIGNER, KEY, [], 'published', { keyCheck: 'strict', client }),
    ).rejects.toThrow(/Nanopub cannot be published with this key: Nothing on the network introduces/);
  });

  it('stays quiet about an attributable key', async () => {
    fetchMock.mockResolvedValue(introductionsResponse([declared(KEY)]));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await enforceSigningKeyCheck(SIGNER, KEY, [], 'signed', { keyCheck: 'strict', client });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('Nanopub signing-key check', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const realFetch = global.fetch;
  const client = new NanopubClient({ endpoints: [ENDPOINT] });

  beforeEach(() => {
    clearSigningKeyCheckCache();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('refuses to sign in strict mode with a key the network cannot attribute', async () => {
    fetchMock.mockResolvedValue(introductionsResponse([]));
    const np = nanopubFor(newPrivateKey());
    await expect(np.sign({ keyCheck: 'strict', client })).rejects.toThrow(/cannot be signed with this key/);
    expect(np.signature).toBeUndefined();
  });

  it('signs in strict mode with a declared key', async () => {
    const privateKey = newPrivateKey();
    const publicKey = await (await getCryptoAdapter()).extractPublicKey(privateKey);
    fetchMock.mockResolvedValue(introductionsResponse([declared(publicKey)]));
    const np = await nanopubFor(privateKey).sign({ keyCheck: 'strict', client });
    expect(np.signature).toBeDefined();
  });

  it('signs with a warning by default', async () => {
    fetchMock.mockResolvedValue(introductionsResponse([]));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const np = await nanopubFor(newPrivateKey()).sign({ client });
    expect(np.signature).toBeDefined();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/Nothing on the network introduces/));
  });

  it('checks the key of a nanopub signed elsewhere before publishing it', async () => {
    const signed = await nanopubFor(newPrivateKey()).sign({ keyCheck: 'off' });
    const reloaded = Nanopub.fromRdf(signed.rdf(), 'trig');
    fetchMock.mockResolvedValue(introductionsResponse([]));
    const onKeyCheck = vi.fn();
    await expect(
      reloaded.publish('https://mock.registry/np/', { keyCheck: 'strict', onKeyCheck, client }),
    ).rejects.toThrow(/cannot be published with this key/);
    expect(onKeyCheck).toHaveBeenCalledWith(expect.objectContaining({ status: 'signer_not_introduced' }));
    expect(fetchMock.mock.calls.every(([url]) => !String(url).startsWith('https://mock.registry'))).toBe(true);
  });

  it('checks only once when publish signs the nanopub itself', async () => {
    const privateKey = newPrivateKey();
    const publicKey = await (await getCryptoAdapter()).extractPublicKey(privateKey);
    fetchMock
      .mockResolvedValueOnce(introductionsResponse([declared(publicKey)]))
      .mockResolvedValueOnce({ ok: true, status: 201, statusText: 'Created', text: async () => '' });
    const onKeyCheck = vi.fn();
    await nanopubFor(privateKey).publish('https://mock.registry/np/', { keyCheck: 'strict', onKeyCheck, client });
    expect(onKeyCheck).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('signs and publishes an introduction of a key the network does not know yet', async () => {
    const intro = await createIntroNanopub({ agent: SIGNER, privateKey: newPrivateKey(), name: 'Test' });
    fetchMock.mockResolvedValue({ ok: true, status: 201, statusText: 'Created', text: async () => '' });
    await intro.publish('https://mock.registry/np/', { keyCheck: 'strict', client });
    expect(intro.signature).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://mock.registry/np/');
  });
});
