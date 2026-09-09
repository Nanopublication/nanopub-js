import {
  createPrivateKey,
  createPublicKey,
  createHash,
  sign as cryptoSign,
  verify as cryptoVerify
} from "crypto";
import { CryptoAdapter } from "./types";
import { normalizePrivateKey, normalizePublicKey } from "./keys";

/** Reads a private key in any of the forms `normalizePrivateKey` accepts. */
function loadPrivateKey(privateKey: string) {
  return createPrivateKey({
    key: Buffer.from(normalizePrivateKey(privateKey), "base64"),
    format: "der",
    type: "pkcs8",
  });
}

export const nodeCrypto: CryptoAdapter = {
  async extractPublicKey(privateKey: string) {
    const publicKeyObj = createPublicKey(loadPrivateKey(privateKey));

    const publicKeyDer = publicKeyObj.export({ format: "der", type: "spki" });
    return Buffer.from(publicKeyDer).toString("base64");
  },

  async sign(data, privateKey) {
    return cryptoSign("sha256", Buffer.from(data, "utf8"), loadPrivateKey(privateKey))
      .toString("base64");
  },

  async verify(data, signatureBase64, publicKey) {
    const publicKeyDer = Buffer.from(normalizePublicKey(publicKey), "base64");

    const publicKeyObj = createPublicKey({
      key: publicKeyDer,
      format: "der",
      type: "spki",
    });

    return cryptoVerify(
      "sha256",
      Buffer.from(data, "utf8"),
      publicKeyObj,
      Buffer.from(signatureBase64, "base64"),
    );
  },

  async sha256Base64Url(data) {
    const hash = createHash("sha256").update(data, "utf8").digest();
    return hash.toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },
};
