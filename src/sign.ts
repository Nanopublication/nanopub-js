import { Nanopub, NpProfile } from "@nanopub/sign";
import type { Quad } from "n3";

/**
 * Verify a Nanopub signature using `nanopub-rs` via `check()`.
 */
export async function verifySignature(rdf: string): Promise<boolean> {
  try {
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
  const wasmNp = new Nanopub(rdf);
  const signed = wasmNp.sign(new NpProfile(privateKey, orcid, name));

  return {
    signedRdf: signed.rdf(),
    sourceUri: signed.info().uri,
    signature: signed.info().signature,
  };
}
