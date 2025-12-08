import { Nanopub } from "@nanopub/sign";
import type { Quad } from "n3";

/**
 * Verify a Nanopub signature using `nanopub-rs` via `check()`.
 */
export async function verifySignature(quads: Quad[]): Promise<boolean> {
  try {
    const np = new Nanopub(quads);

    np.check();

    return true;
  } catch (err) {
    console.error("signature verification failed:", err);
    return false;
  }
}
