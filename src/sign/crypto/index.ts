import type { CryptoAdapter } from './types';

let _adapter: CryptoAdapter | null = null;

export async function getCryptoAdapter(): Promise<CryptoAdapter> {
  if (_adapter) return _adapter;

  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const { browserCrypto } = await import('./browser');
    _adapter = browserCrypto;
  } else {
    // Fallback for Node.js < 18 (no globalThis.crypto.subtle)
    const { nodeCrypto } = await import('./node');
    _adapter = nodeCrypto;
  }

  return _adapter;
}
