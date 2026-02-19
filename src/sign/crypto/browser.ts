import { CryptoAdapter } from "./types";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const browserCrypto: CryptoAdapter = {
  async extractPublicKey(privateKeyBase64: string) {
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      base64ToArrayBuffer(privateKeyBase64),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      true,
      ["sign"]
    );

    // Web Crypto has no direct "derive public from private" — export as JWK to
    // get the public components (n, e), reconstruct a public-only key, then
    // export that as SPKI.
    const jwk = await crypto.subtle.exportKey("jwk", privateKey) as JsonWebKey;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e,
        alg: jwk.alg,
        ext: true,
        key_ops: ["verify"],
      },
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      true,
      ["verify"]
    );

    const spki = await crypto.subtle.exportKey("spki", publicKey);
    return arrayBufferToBase64(spki);
  },

  async sign(data, privateKeyBase64) {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      base64ToArrayBuffer(privateKeyBase64),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(data)
    );

    return arrayBufferToBase64(signature);
  },

  async verify(data, signatureBase64, publicKeyBase64) {
    const key = await crypto.subtle.importKey(
      "spki",
      base64ToArrayBuffer(publicKeyBase64),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

    return crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64ToArrayBuffer(signatureBase64),
      new TextEncoder().encode(data)
    );
  },

  async sha256Base64Url(data) {
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const bytes = new Uint8Array(hashBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },
};
