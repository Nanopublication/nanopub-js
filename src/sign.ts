import { Nanopub, NpProfile, KeyPair } from "@nanopub/sign";
import { initSync } from "@nanopub/sign/web.js";
// Note: There is a tradeoff of much lower bundle size but extra run-time decoding overhead, when using base64
import wasmBuffer from "@nanopub/sign/web_bg.wasm?arraybuffer&base64";

let wasmInitialized = false;

/**
 * Singleton initializer for use of the `@nanopub/sign` WASM module in web-browser environments
 *
 */
export function initNanopubSignWasm(): void {
  if (wasmInitialized) return;

  initSync(wasmBuffer);
  wasmInitialized = true;
}

/**
 * Verify a Nanopub signature using `nanopub-rs` via `check()`.
 */
export async function verifySignature(rdf: string): Promise<boolean> {
  try {
    initNanopubSignWasm();

    const np = new Nanopub(rdf);
    console.log("Verifying nanopub signature for RDF:\n", np.rdf());
    np.check();

    return true;
  } catch (err) {
    console.error("signature verification failed:", err);
    return false;
  }
}

export async function sign(
  rdf: string,
  privateKey: string,
  orcid: string,
  name: string
): Promise<{ signedRdf: string; sourceUri: string; signature: string }> {
  initNanopubSignWasm();

  const wasmNp = new Nanopub(rdf);
  const signed = wasmNp.sign(new NpProfile(privateKey, orcid, name));

  return {
    signedRdf: signed.rdf(),
    sourceUri: signed.info().uri,
    signature: signed.info().signature,
  };
}

export async function generateKeys() {
  try {
    initNanopubSignWasm();

    const keypair = new KeyPair();
    const keys = keypair.toJs();
    
    return {
      privateKey: keys.private,
      publicKey: keys.public
    };
  } catch (error) {
    console.error('Key generation failed:', error);
    throw new Error('Failed to generate RSA keys');
  }
}
