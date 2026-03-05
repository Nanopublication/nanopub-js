import { getCryptoAdapter } from './crypto';
import { parse } from '../serialize';
import { Store } from 'n3';
import { normalizeDataset } from './utils';
import { makeTrusty } from './trusty';
import { NPX } from '../vocab';
import { detectNanopubBaseUri } from './sign';

export type VerificationResult =
  | { valid: true }
  | { valid: false; reason: 'hash_mismatch' | 'signature_invalid' };

export async function verifySignature(trig: string): Promise<VerificationResult> {
  const quads = parse(trig, 'trig');
  const dataset = new Store(quads);

  const sigQuad = dataset.getQuads(null, NPX('hasSignature'), null, null)[0];
  if (!sigQuad) throw new Error('No signature found');

  const sigNode = sigQuad.subject;
  const signature = sigQuad.object.value;

  const pubKeyQuad = dataset.getQuads(sigNode, NPX('hasPublicKey'), null, null)[0];
  if (!pubKeyQuad) throw new Error('No public key found');
  const publicKeyBase64 = pubKeyQuad.object.value;

  const targetQuad = dataset.getQuads(sigNode, NPX('hasSignatureTarget'), null, null)[0];
  if (!targetQuad) throw new Error('No signature target found');
  const nanopubUri = targetQuad.object.value;

  const { baseUri } = detectNanopubBaseUri(dataset);

  // Check 1: trusty hash
  const normalizedForHash = normalizeDataset(dataset, nanopubUri, baseUri);
  const computedHash = await makeTrusty(normalizedForHash);
  if (!nanopubUri.endsWith(computedHash)) {
    return { valid: false, reason: 'hash_mismatch' };
  }

  // Check 2: cryptographic signature
  dataset.removeQuad(sigQuad);
  const normalized = normalizeDataset(dataset, nanopubUri, baseUri);
  const adapter = await getCryptoAdapter();
  const sigValid = await adapter.verify(normalized, signature, publicKeyBase64);
  if (!sigValid) {
    return { valid: false, reason: 'signature_invalid' };
  }

  return { valid: true };
}
