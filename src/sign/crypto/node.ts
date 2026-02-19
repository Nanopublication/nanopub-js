import {
  createPrivateKey,
  createPublicKey,
  createHash,
  sign as cryptoSign,
  verify as cryptoVerify
} from "crypto";
import { CryptoAdapter } from "./types";

export const nodeCrypto: CryptoAdapter = {
  async extractPublicKey(privateKeyBase64: string) {
    const privateKeyPem =
      `-----BEGIN PRIVATE KEY-----\n` +
      privateKeyBase64.match(/.{1,64}/g)?.join("\n") +
      `\n-----END PRIVATE KEY-----`;

    const privateKeyObj = createPrivateKey({ key: privateKeyPem, format: "pem" });
    const publicKeyObj = createPublicKey(privateKeyObj);

    const publicKeyDer = publicKeyObj.export({ format: "der", type: "spki" });
    return Buffer.from(publicKeyDer).toString("base64");
  },

  async sign(data, privateKeyBase64) {
    const privateKeyPem =
      `-----BEGIN PRIVATE KEY-----\n` +
      privateKeyBase64.match(/.{1,64}/g)?.join("\n") +
      `\n-----END PRIVATE KEY-----`;

    const keyObj = createPrivateKey({ key: privateKeyPem, format: "pem" });

    return cryptoSign("sha256", Buffer.from(data, "utf8"), keyObj)
      .toString("base64");
  },

  async verify(data, signatureBase64, publicKeyBase64) {
    const publicKeyDer = Buffer.from(publicKeyBase64, "base64");

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
