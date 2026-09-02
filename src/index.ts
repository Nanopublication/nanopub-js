// Browser entry point: eagerly register the Web Crypto adapter.
// This ensures no Node.js 'crypto' module is referenced in browser bundles.
import { setCryptoAdapter } from './sign/crypto/index.js';
import { browserCrypto } from './sign/crypto/browser.js';
setCryptoAdapter(browserCrypto);

export * from './nanopub.js';
export { NanopubClient } from './client.js';
export * from './sign/sign.js';
export { normalizePrivateKey, normalizePublicKey } from './sign/crypto/keys.js';
export * from './sign/trusty.js';
export * from './sign/verify.js';
export * from './sign/utils.js';
export * from './validate.js';
export * from './sparql.js';
export * from './grlc.js';
export { serialize, parse } from './serialize.js';
export * from './types/types.js';
export * from './constants.js';
export * from './vocab.js';
