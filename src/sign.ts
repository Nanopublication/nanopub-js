import { getNanopubSignModule } from "./wasm";

/**
 * Eagerly initialize `@nanopub/sign` for browser usage.
 *
 * Safe to call multiple times; it will only initialize once.
 * It's also safe to never call it, since it is lazy-loaded when required.
 */
export async function initNanopubSignWasm(): Promise<void> {
  await getNanopubSignModule();
}

/**
 * Verify a Nanopub signature using `nanopub-rs` via `check()`.
 */
export async function verifySignature(rdf: string): Promise<boolean> {
  try {
    const { Nanopub } = (await getNanopubSignModule()) as any;

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
  const { Nanopub, NpProfile } = (await getNanopubSignModule()) as any;

  const wasmNp = new Nanopub(rdf);
  const signed = wasmNp.sign(new NpProfile(privateKey, orcid, name));

  return {
    signedRdf: signed.rdf(),
    sourceUri: signed.info().uri,
    signature: signed.info().signature,
  };
}

export async function publish(
  signedRdf: string,
  privateKey: string,
  orcid: string,
  name: string,
  server?: string
): Promise<string> {
  const { Nanopub, NpProfile } = (await getNanopubSignModule()) as any;

  const signedWasmNp = new Nanopub(signedRdf);
  const result = await signedWasmNp.publish(
    new NpProfile(privateKey, orcid, name),
    server ?? "https://np.knowledgepixels.com/"
  );
  return result;
}

export async function generateKeys() {
  try {
    const { KeyPair } = (await getNanopubSignModule()) as any;

    const keypair = new KeyPair();
    const keys = keypair.toJs();

    return {
      privateKey: keys.private,
      publicKey: keys.public,
    };
  } catch (error) {
    console.error("Key generation failed:", error);
    throw new Error("Failed to generate RSA keys");
  }
}
