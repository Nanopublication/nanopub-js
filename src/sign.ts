import type { Nanopub, Profile } from "./types";

function formatRsaPublicKey(pem: string): string {
  // Add headers and line breaks if missing
  if (!pem.includes("-----BEGIN PUBLIC KEY-----")) {
    const keyBase64 = pem.replace(/\s+/g, "");
    const formatted = keyBase64.match(/.{1,64}/g)?.join("\n") ?? keyBase64;
    return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
  }
  return pem;
}

import { Quad, NamedNode } from "n3";
import crypto from "crypto";
// @ts-ignore
import rdfCanonize from "rdf-canonize";

/**
 * Verify a Nanopub signature using canonicalization.
 * Assumes the quads include signature and public key in the pubinfo graph.
 */
export async function verifySignature(quads: Quad[]): Promise<boolean> {
  const sigQuad = quads.find((q) => q.predicate.value.endsWith("hasSignature"));
  const pubKeyQuad = quads.find((q) =>
    q.predicate.value.endsWith("hasPublicKey")
  );

  if (!sigQuad || !pubKeyQuad) return false;

  const signature = Buffer.from(sigQuad.object.value, "base64");
  const publicKeyPem = pubKeyQuad.object.value;

  const quadsToSign = quads.filter(
    (q) =>
      !q.predicate.value.endsWith("hasSignature") &&
      !q.predicate.value.endsWith("hasPublicKey")
  );

  const validQuads = quadsToSign.filter(
    (q) =>
      q &&
      q.subject?.termType &&
      q.predicate?.termType &&
      q.object?.termType &&
      q.graph?.termType
  );

  const normalized = await rdfCanonize.canonize(validQuads, {
    algorithm: "URDNA2015",
  });
  const dataToVerify = Buffer.from(normalized, "utf8");

  // const verify = crypto.createVerify('SHA256');
  // verify.update(dataToVerify);
  // verify.end();

  const publicKeyPemFormatted = formatRsaPublicKey(pubKeyQuad.object.value);

  const verify = crypto.createVerify("SHA256");
  verify.update(normalized);
  verify.end();

  // return verify.verify(publicKeyPemFormatted, signature);

  try {
    return verify.verify(publicKeyPemFormatted, signature);
  } catch (err) {
    console.error("Error verifying signature:", err);
    return false;
  }
}
