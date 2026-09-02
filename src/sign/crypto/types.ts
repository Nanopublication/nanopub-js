export interface CryptoAdapter {
  /**
   * Derives the public key of `privateKey`, as the base64 of its
   * SubjectPublicKeyInfo DER — the form recorded as `npx:hasPublicKey`.
   *
   * @param privateKey - An RSA private key in any form `normalizePrivateKey`
   * accepts: PEM (PKCS#8 or PKCS#1) or bare base64 of the DER.
   */
  extractPublicKey(privateKey: string): Promise<string>;

  /**
   * Signs `data` with SHA-256 and RSASSA-PKCS1-v1_5, returning base64.
   *
   * @param privateKey - An RSA private key in any form `normalizePrivateKey`
   * accepts: PEM (PKCS#8 or PKCS#1) or bare base64 of the DER.
   */
  sign(
    data: string,
    privateKey: string
  ): Promise<string>;

  /**
   * @param publicKey - An RSA public key in any form `normalizePublicKey`
   * accepts: PEM (SubjectPublicKeyInfo or PKCS#1) or bare base64 of the DER.
   */
  verify(
    data: string,
    signatureBase64: string,
    publicKey: string
  ): Promise<boolean>;

  sha256Base64Url(data: string): Promise<string>;
}
