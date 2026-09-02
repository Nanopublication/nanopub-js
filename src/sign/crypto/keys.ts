/**
 * Key normalization shared by the Node and browser crypto adapters.
 *
 * Nanopublications carry keys in a canonical form: the single-line base64 of the
 * DER, PKCS#8 for private keys and SubjectPublicKeyInfo for public keys, with no
 * PEM armor and no newlines. That is what the adapters below `./types` expect,
 * but it is almost never what a user has on disk: `openssl genrsa`, Node's
 * `export({format: 'pem'})` and pycryptodome's `export_key('PEM')` all produce
 * PEM armor instead, and PKCS#1 (`BEGIN RSA PRIVATE KEY`) as often as PKCS#8.
 *
 * These helpers accept any of those forms and return the canonical one, so the
 * adapters can go on assuming it. PKCS#1 is converted rather than rejected: the
 * ASN.1 wrapping is a fixed prefix, and doing it here keeps Node and the browser
 * on the same code path (Web Crypto imports PKCS#8 only).
 */

/**
 * `AlgorithmIdentifier` for rsaEncryption (OID 1.2.840.113549.1.1.1) with the
 * NULL parameters PKCS#1 requires: `SEQUENCE { OID, NULL }`.
 */
const RSA_ALGORITHM_IDENTIFIER = Uint8Array.of(
  0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
  0x05, 0x00,
);

const PEM_RE = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/;

const PRIVATE_KEY_FORMS =
  "a PEM key ('-----BEGIN PRIVATE KEY-----' or '-----BEGIN RSA PRIVATE KEY-----') " +
  "or nanopub's own form, the base64 of the PKCS#8 DER with no armor";

const PUBLIC_KEY_FORMS =
  "a PEM key ('-----BEGIN PUBLIC KEY-----' or '-----BEGIN RSA PUBLIC KEY-----') " +
  "or nanopub's own form, the base64 of the SubjectPublicKeyInfo DER with no armor";

/** The shapes of RSA key DER this module knows how to read. */
type DerKind = 'pkcs8' | 'pkcs1-private' | 'spki' | 'pkcs1-public' | 'unknown';

interface Tlv {
  tag: number;
  /** Offset of the first content byte. */
  start: number;
  /** Offset just past the last content byte. */
  end: number;
}

/** Reads one DER tag-length-value at `offset`, or null if it is malformed. */
function readTlv(der: Uint8Array, offset: number): Tlv | null {
  if (offset + 2 > der.length) return null;

  const tag = der[offset];
  let length = der[offset + 1];
  let cursor = offset + 2;

  if (length & 0x80) {
    const lengthBytes = length & 0x7f;
    // 0 is the indefinite form, which DER forbids; more than 4 bytes is a key
    // far larger than anything we could be looking at.
    if (lengthBytes === 0 || lengthBytes > 4 || cursor + lengthBytes > der.length) return null;
    length = 0;
    for (let i = 0; i < lengthBytes; i++) length = length * 256 + der[cursor + i];
    cursor += lengthBytes;
  }

  const end = cursor + length;
  if (end > der.length) return null;
  return { tag, start: cursor, end };
}

/** Encodes a DER length in the short or long form, as the length requires. */
function encodeLength(length: number): number[] {
  if (length < 0x80) return [length];
  const bytes: number[] = [];
  for (let n = length; n > 0; n = Math.floor(n / 256)) bytes.unshift(n % 256);
  return [0x80 | bytes.length, ...bytes];
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Wraps `content` in a DER tag-length-value. */
function derTlv(tag: number, content: Uint8Array): Uint8Array {
  return concat([Uint8Array.of(tag, ...encodeLength(content.length)), content]);
}

/**
 * Identifies an RSA key DER by its outermost structure alone, which is enough to
 * tell the four encodings apart:
 *
 * - `PrivateKeyInfo` (PKCS#8): INTEGER version, then the AlgorithmIdentifier SEQUENCE
 * - `RSAPrivateKey` (PKCS#1): INTEGER version, then INTEGER modulus, then more
 * - `SubjectPublicKeyInfo`: the AlgorithmIdentifier SEQUENCE, then a BIT STRING
 * - `RSAPublicKey` (PKCS#1): exactly two INTEGERs, modulus and exponent
 */
function detectDerKind(der: Uint8Array): DerKind {
  const outer = readTlv(der, 0);
  if (!outer || outer.tag !== 0x30) return 'unknown';

  const first = readTlv(der, outer.start);
  if (!first) return 'unknown';

  if (first.tag === 0x30) {
    const second = readTlv(der, first.end);
    return second && second.tag === 0x03 ? 'spki' : 'unknown';
  }
  if (first.tag !== 0x02) return 'unknown';

  const second = readTlv(der, first.end);
  if (!second) return 'unknown';
  if (second.tag === 0x30) return 'pkcs8';
  if (second.tag !== 0x02) return 'unknown';

  // Two INTEGERs and nothing else is RSAPublicKey {n, e}; anything following
  // them means this is an RSAPrivateKey, whose next field is the exponent d.
  return second.end < outer.end ? 'pkcs1-private' : 'pkcs1-public';
}

/** `PrivateKeyInfo { version 0, rsaEncryption, OCTET STRING(RSAPrivateKey) }` */
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  return derTlv(
    0x30,
    concat([
      Uint8Array.of(0x02, 0x01, 0x00),
      RSA_ALGORITHM_IDENTIFIER,
      derTlv(0x04, pkcs1),
    ]),
  );
}

/** `SubjectPublicKeyInfo { rsaEncryption, BIT STRING(RSAPublicKey) }` */
function pkcs1ToSpki(pkcs1: Uint8Array): Uint8Array {
  return derTlv(
    0x30,
    concat([
      RSA_ALGORITHM_IDENTIFIER,
      // The leading 0x00 is the BIT STRING's count of unused trailing bits.
      derTlv(0x03, concat([Uint8Array.of(0x00), pkcs1])),
    ]),
  );
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Strips PEM armor if present and decodes the base64 body, rejecting the forms
 * we cannot use with a message that names the fix rather than leaving an opaque
 * error to surface from the crypto library later.
 */
function decodeKey(key: string, kind: 'private' | 'public'): Uint8Array {
  const forms = kind === 'private' ? PRIVATE_KEY_FORMS : PUBLIC_KEY_FORMS;
  const trimmed = key?.trim() ?? '';

  if (!trimmed) {
    throw new Error(`No RSA ${kind} key was provided. Provide ${forms}.`);
  }
  if (/^ssh-rsa\s/.test(trimmed)) {
    throw new Error(
      'OpenSSH public keys are not supported. Convert the key first: ' +
        '`ssh-keygen -e -m PKCS8 -f id_rsa.pub`.',
    );
  }

  let body = trimmed;
  const pem = PEM_RE.exec(trimmed);
  if (pem) {
    const label = pem[1];
    if (label === 'ENCRYPTED PRIVATE KEY') {
      throw new Error(
        'The RSA private key is passphrase-protected and cannot be used as is. ' +
          'Decrypt it first: `openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-decrypted.pem`.',
      );
    }
    if (label === 'OPENSSH PRIVATE KEY') {
      throw new Error(
        'OpenSSH-format private keys are not supported. Convert the key first: ' +
          '`ssh-keygen -p -m PKCS8 -f id_rsa`.',
      );
    }
    body = pem[2];
  } else if (trimmed.includes('-----BEGIN')) {
    throw new Error(
      `Could not parse the RSA ${kind} key: it starts with PEM armor but has no matching ` +
        `'-----END ...-----' footer. Provide ${forms}.`,
    );
  }

  body = body.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) {
    throw new Error(
      `Could not parse the RSA ${kind} key: it is not valid base64. Provide ${forms}.`,
    );
  }

  try {
    return base64ToBytes(body);
  } catch (error) {
    throw new Error(
      `Could not parse the RSA ${kind} key: its base64 body could not be decoded ` +
        `(${(error as Error).message}). Provide ${forms}.`,
    );
  }
}

/**
 * Normalizes an RSA private key to the base64 of its PKCS#8 DER, single line and
 * without PEM armor.
 *
 * Accepts that canonical form (so it is idempotent), the same base64 broken over
 * lines, and PEM armor around either PKCS#8 (`BEGIN PRIVATE KEY`) or PKCS#1
 * (`BEGIN RSA PRIVATE KEY`), with any line endings.
 *
 * @throws If the key is unreadable, encrypted, or a public key. The message says
 * which form was found and what to do about it.
 */
export function normalizePrivateKey(key: string): string {
  const der = decodeKey(key, 'private');

  switch (detectDerKind(der)) {
    case 'pkcs8':
      return bytesToBase64(der);
    case 'pkcs1-private':
      return bytesToBase64(pkcs1ToPkcs8(der));
    case 'spki':
    case 'pkcs1-public':
      throw new Error(
        'An RSA public key was provided where a private key was expected. ' +
          'Signing needs the private key of the pair.',
      );
    default:
      throw new Error(
        'Could not parse the RSA private key: it decodes to base64 but not to a ' +
          `recognizable RSA key. Provide ${PRIVATE_KEY_FORMS}.`,
      );
  }
}

/**
 * Normalizes an RSA public key to the base64 of its SubjectPublicKeyInfo DER,
 * single line and without PEM armor.
 *
 * Accepts that canonical form (so it is idempotent), the same base64 broken over
 * lines, and PEM armor around either SubjectPublicKeyInfo (`BEGIN PUBLIC KEY`)
 * or PKCS#1 (`BEGIN RSA PUBLIC KEY`), with any line endings.
 *
 * @throws If the key is unreadable or is a private key. Deriving the public key
 * from a private one is `CryptoAdapter.extractPublicKey`'s job, not this one's.
 */
export function normalizePublicKey(key: string): string {
  const der = decodeKey(key, 'public');

  switch (detectDerKind(der)) {
    case 'spki':
      return bytesToBase64(der);
    case 'pkcs1-public':
      return bytesToBase64(pkcs1ToSpki(der));
    case 'pkcs8':
    case 'pkcs1-private':
      throw new Error(
        'An RSA private key was provided where a public key was expected. ' +
          'Use extractPublicKey() to derive the public key from it.',
      );
    default:
      throw new Error(
        'Could not parse the RSA public key: it decodes to base64 but not to a ' +
          `recognizable RSA key. Provide ${PUBLIC_KEY_FORMS}.`,
      );
  }
}
