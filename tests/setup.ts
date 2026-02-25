// Vitest runs test files in isolated VM contexts that don't expose
// globalThis.crypto by default. Inject the Node.js WebCrypto implementation
// so that browserCrypto (which uses globalThis.crypto.subtle) works in tests.
import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}
