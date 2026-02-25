// Node.js entry point: eagerly register the Node.js crypto adapter.
// Consumer bundlers that resolve the "node" export condition get this file,
// which imports from the built-in 'crypto' module (externalized in the bundle).
import { setCryptoAdapter } from './sign/crypto/index.js';
import { nodeCrypto } from './sign/crypto/node.js';
setCryptoAdapter(nodeCrypto);

export * from './nanopub.js';
export { NanopubClient } from './client.js';
export * from './sign/sign.js';
export * from './sign/trusty.js';
export * from './sign/verify.js';
export * from './sign/utils.js';
export * from './validate.js';
export { serialize, parse } from './serialize.js';
export * from './types/types.js';
export * from './constants.js';
export * from './vocab.js';
