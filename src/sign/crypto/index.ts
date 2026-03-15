import type { CryptoAdapter } from './types';
import { browserCrypto } from './browser';

let _adapter: CryptoAdapter | null = null;

export function setCryptoAdapter(adapter: CryptoAdapter): void {
  _adapter = adapter;
}

export async function getCryptoAdapter(): Promise<CryptoAdapter> {
  if (_adapter) return _adapter;
  // Fallback: Web Crypto API is available in all modern browsers and Node 18+.
  // The entry points (src/index.ts for browser, src/node.ts for Node) call
  // setCryptoAdapter() eagerly, so this path is only hit in tests or direct usage.
  _adapter = browserCrypto;
  return _adapter;
}
