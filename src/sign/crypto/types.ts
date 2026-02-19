export interface CryptoAdapter {
  extractPublicKey(privateKeyBase64: string): Promise<string>;

  sign(
    data: string,
    privateKeyBase64: string
  ): Promise<string>;

  verify(
    data: string,
    signatureBase64: string,
    publicKeyBase64: string
  ): Promise<boolean>;

  sha256Base64Url(data: string): Promise<string>;
}
