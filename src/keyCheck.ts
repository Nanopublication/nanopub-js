import type { Quad } from 'n3';
import { NanopubClient } from './client';
import { NPX } from './vocab';
import { SparqlBindingValue } from './types/types';

/**
 * What the network says about a signer and the key they sign with.
 *
 * - `declared`: an introduction declares this key for this signer and is signed by one of the
 *   keys it declares.
 * - `declared_without_authority`: an introduction declares it, but none that is signed by a key
 *   it declares.
 * - `key_not_declared`: the signer is introduced, but by some other key.
 * - `signer_not_introduced`: nothing on the network introduces this signer.
 * - `not_checked`: nothing is known either way, because the network could not be asked or
 *   there was nothing to ask about.
 */
export type SigningKeyStatus =
  | 'declared'
  | 'declared_without_authority'
  | 'key_not_declared'
  | 'signer_not_introduced'
  | 'not_checked';

/** The outcome of checking a signing key against the network. */
export interface SigningKeyCheckResult {
  status: SigningKeyStatus;
  /** True if signing may proceed without complaint, including when nothing could be checked. */
  acceptable: boolean;
  /** A sentence explaining the status, suitable for showing to the person signing. */
  message: string;
  /** The introductions declaring this key for this signer, when there are any. */
  introductions: string[];
}

/**
 * How `sign()` and `publish()` treat the signing-key check.
 *
 * - `warn`: check, and report a key the network cannot attribute through `console.warn`.
 * - `strict`: check, and refuse to sign or publish with a key the network cannot attribute.
 * - `off`: do not ask the network at all.
 */
export type KeyCheckMode = 'warn' | 'strict' | 'off';

/** Options for the signing-key check run by `sign()` and `publish()`. */
export interface KeyCheckOptions {
  /** Defaults to `warn`. */
  keyCheck?: KeyCheckMode;
  /** Receives every result, acceptable or not, so an application can show it in its own UI. */
  onKeyCheck?: (result: SigningKeyCheckResult) => void;
  /** The client whose query endpoints are asked; a default client when omitted. */
  client?: NanopubClient;
}

/** One declaration: the signer, the key declared, the introduction it is in, and the key that signed it. */
export type IntroductionRow = Record<string, string>;

/**
 * The repository the published `get-all-user-intros` query
 * (`RAjHh6P11QFUaoPiMRBavdAnTq4YMJW4PB85oVFSBfYjU`) runs against.
 */
export const INTRODUCTIONS_REPO =
  'repo/type/77757cabf6184c51c20b8b0fe5dc5e1365b7f628448335184ad54319a0affdfc';

/** How long the introductions fetched for a signer are reused. */
export const INTRODUCTIONS_MAX_AGE_MS = 5 * 60 * 1000;

const STATUS_ACCEPTABLE: Record<SigningKeyStatus, boolean> = {
  declared: true,
  declared_without_authority: false,
  key_not_declared: false,
  signer_not_introduced: false,
  not_checked: true,
};

const IRI_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s<>"{}|\\^`]+$/;

const introductionsCache = new Map<string, { rows: IntroductionRow[]; fetchedAt: number }>();

/**
 * The SPARQL of the published `get-all-user-intros` query, restricted to one signer and to the
 * columns the check reads. Asking about one signer returns a handful of rows in well under a
 * second, where the published query returns every introduction on the network.
 *
 * @param signer - IRI of the signer, already checked to be a safe IRI
 * @returns the SPARQL query
 */
export function introductionsQuery(signer: string): string {
  return `prefix np: <http://www.nanopub.org/nschema#>
prefix npx: <http://purl.org/nanopub/x/>
prefix npa: <http://purl.org/nanopub/admin/>

select ?user ?pubkey ?intronp ?introPubkey where {
  values ?user { <${signer}> }
  graph npa:graph {
    ?intronp npa:hasValidSignatureForPublicKey ?introPubkey .
    filter not exists { ?intronpx npx:invalidates ?intronp ; npa:hasValidSignatureForPublicKey ?introPubkey . }
    ?intronp np:hasAssertion ?a .
  }
  graph ?a {
    ?keydeclaration npx:declaredBy ?user .
    ?keydeclaration npx:hasPublicKey ?pubkey .
  }
}`;
}

/**
 * A public key in the form keys are compared in: the base64 with all whitespace removed, since
 * some introductions on the network carry their key with line breaks.
 *
 * @param publicKey - the public key as found in a nanopublication or introduction
 * @returns the key without whitespace
 */
export function comparableKey(publicKey: string): string {
  return publicKey.replace(/\s+/g, '');
}

/**
 * Classifies a signer and key against the introductions the network returned for that signer.
 * An introduction carries authority when it is signed by one of the keys it declares, so a first
 * introduction is self-signed, and one adding a key is signed by an existing key it restates.
 *
 * @param introductions - declaration rows with `user`, `pubkey`, `intronp` and `introPubkey` columns
 * @param signer - IRI of the signer
 * @param publicKey - the public key the signer signs with
 * @returns the status the rows establish, and the introductions declaring the key
 */
export function classifySigningKey(
  introductions: IntroductionRow[],
  signer: string,
  publicKey: string,
): { status: SigningKeyStatus; introductions: string[] } {
  const key = comparableKey(publicKey);
  const declarations = introductions.filter((row) => row.user === signer);
  const declaring = declarations.filter((row) => comparableKey(row.pubkey ?? '') === key);
  const signedByDeclaredKey = (row: IntroductionRow) =>
    declarations.some(
      (other) =>
        other.intronp === row.intronp &&
        comparableKey(other.pubkey ?? '') === comparableKey(row.introPubkey ?? ''),
    );
  const intros = [...new Set(declaring.map((row) => row.intronp).filter((iri): iri is string => !!iri))];

  const status: SigningKeyStatus = declaring.some(signedByDeclaredKey)
    ? 'declared'
    : declaring.length
      ? 'declared_without_authority'
      : declarations.length
        ? 'key_not_declared'
        : 'signer_not_introduced';
  return { status, introductions: intros };
}

/**
 * Explains a status to the person signing.
 *
 * @param status - the status to describe
 * @param signer - IRI of the signer the status is about
 * @param introductions - the introductions declaring the key, when there are any
 * @returns the result carrying the status, whether it is acceptable, and the explanation
 */
export function describeSigningKeyStatus(
  status: SigningKeyStatus,
  signer: string,
  introductions: string[] = [],
): SigningKeyCheckResult {
  const messages: Record<SigningKeyStatus, string> = {
    declared: `The signing key is one the network knows ${signer} by.`,
    declared_without_authority:
      `The signing key is declared for ${signer}, but only by an introduction not signed with a key ` +
      'it declares. Nanopublications signed with it may show as coming from an unapproved agent.',
    key_not_declared:
      `${signer} is introduced on the network, but by a different key than the one about to sign. ` +
      'Nanopublications signed with this key cannot be attributed, and will show as coming from an ' +
      'unapproved agent. Publish an introduction declaring this key, or sign with the declared one.',
    signer_not_introduced:
      `Nothing on the network introduces ${signer}. Nanopublications signed for them cannot be ` +
      'attributed, and will show as coming from an unapproved agent. Publish an introduction first.',
    not_checked: 'The signing key was not checked against the network.',
  };
  return { status, acceptable: STATUS_ACCEPTABLE[status], message: messages[status], introductions };
}

/**
 * Asks the query endpoints of the given client, in turn, for the introductions of one signer.
 *
 * @param signer - IRI of the signer
 * @param client - the client whose endpoints and timeout are used
 * @returns the introduction rows
 * @throws if no endpoint answered
 */
async function fetchIntroductions(signer: string, client: NanopubClient): Promise<IntroductionRow[]> {
  const cached = introductionsCache.get(signer);
  if (cached && Date.now() - cached.fetchedAt < INTRODUCTIONS_MAX_AGE_MS) {
    return cached.rows;
  }
  let lastError: unknown = new Error('No nanopub query endpoints configured');
  for (const base of client.endpoints) {
    try {
      const url = new URL(INTRODUCTIONS_REPO, base);
      url.searchParams.append('query', introductionsQuery(signer));
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/sparql-results+json' },
        signal: AbortSignal.timeout(client.timeoutMs),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      const rows: IntroductionRow[] = data.results.bindings.map(
        (binding: Record<string, SparqlBindingValue>) =>
          Object.fromEntries(Object.entries(binding).map(([name, value]) => [name, value.value])),
      );
      introductionsCache.set(signer, { rows, fetchedAt: Date.now() });
      return rows;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Checks a signer and key against the introductions published on the network. The check fails
 * open: when no query endpoint answers, the result is `not_checked`, which is acceptable.
 *
 * @param signer - IRI of the signer
 * @param publicKey - the public key the signer signs with
 * @param client - the client whose query endpoints are asked
 * @returns the result of the check
 */
export async function checkSigningKey(
  signer: string | undefined,
  publicKey: string | undefined,
  client: NanopubClient = new NanopubClient(),
): Promise<SigningKeyCheckResult> {
  if (!signer || !publicKey) {
    return { ...describeSigningKeyStatus('not_checked', ''), message: 'No signer or key to check.' };
  }
  if (!IRI_RE.test(signer)) {
    return {
      ...describeSigningKeyStatus('not_checked', signer),
      message: `The signer ${signer} is not an IRI the network could be asked about, so its key was not checked.`,
    };
  }
  try {
    const rows = await fetchIntroductions(signer, client);
    const { status, introductions } = classifySigningKey(rows, signer, publicKey);
    return describeSigningKeyStatus(status, signer, introductions);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      ...describeSigningKeyStatus('not_checked', signer),
      message: `Could not check the signing key against the network: ${reason}. Signing goes ahead unchecked.`,
    };
  }
}

/**
 * Whether an introduction the network accepts declares this key for this signer.
 *
 * @param signer - IRI of the signer
 * @param publicKey - the public key the signer signs with
 * @param client - the client whose query endpoints are asked
 * @returns true only when the status is `declared`
 */
export async function hasValidIntroduction(
  signer: string | undefined,
  publicKey: string | undefined,
  client?: NanopubClient,
): Promise<boolean> {
  return (await checkSigningKey(signer, publicKey, client)).status === 'declared';
}

/** Forgets the introductions fetched so far, so the next check asks the network again. */
export function clearSigningKeyCheckCache(): void {
  introductionsCache.clear();
}

/**
 * Whether an assertion itself declares the given key for the given signer, as an introduction
 * does. Such a nanopublication is what makes the key known in the first place, so the network
 * cannot be expected to know it yet.
 *
 * @param assertion - the assertion quads of the nanopublication
 * @param signer - IRI of the signer
 * @param publicKey - the public key the signer signs with
 * @returns true if the assertion declares that key for that signer
 */
export function declaresOwnSigningKey(assertion: Quad[], signer: string, publicKey: string): boolean {
  const key = comparableKey(publicKey);
  return assertion.some(
    (declaredBy) =>
      declaredBy.predicate.value === NPX('declaredBy').value &&
      declaredBy.object.value === signer &&
      assertion.some(
        (hasPublicKey) =>
          hasPublicKey.subject.value === declaredBy.subject.value &&
          hasPublicKey.predicate.value === NPX('hasPublicKey').value &&
          comparableKey(hasPublicKey.object.value) === key,
      ),
  );
}

/**
 * Runs the signing-key check the way `sign()` and `publish()` do: skipped when the mode is
 * `off`, and for a nanopublication that declares its own signing key; reported to `onKeyCheck`;
 * warned about or refused when the key cannot be attributed.
 *
 * @param signer - IRI of the signer
 * @param publicKey - the public key the signer signs with
 * @param assertion - the assertion quads of the nanopublication being signed or published
 * @param action - what is about to happen, for the refusal message
 * @param options - the check options
 * @returns the result of the check, or undefined when the mode is `off`
 * @throws if the mode is `strict` and the key cannot be attributed
 */
export async function enforceSigningKeyCheck(
  signer: string | undefined,
  publicKey: string | undefined,
  assertion: Quad[],
  action: 'signed' | 'published',
  options: KeyCheckOptions = {},
): Promise<SigningKeyCheckResult | undefined> {
  const mode = options.keyCheck ?? 'warn';
  if (mode === 'off') return undefined;
  const result =
    signer && publicKey && declaresOwnSigningKey(assertion, signer, publicKey)
      ? {
          ...describeSigningKeyStatus('not_checked', signer),
          message: 'The nanopublication declares its own signing key, so the key was not checked against the network.',
        }
      : await checkSigningKey(signer, publicKey, options.client);
  options.onKeyCheck?.(result);
  if (!result.acceptable) {
    if (mode === 'strict') {
      throw new Error(`Nanopub cannot be ${action} with this key: ${result.message}`);
    }
    console.warn(result.message);
  }
  return result;
}
