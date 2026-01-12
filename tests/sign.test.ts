import { describe, expect, it } from "vitest";
import { generateKeys, verifySignature } from "../src";

describe("sign()", () => {
  it("verifySignature returns false on invalid RDF", async () => {
    const ok = await verifySignature("not rdf");
    expect(ok).toBe(false);
  });

  it("generateKeys returns keypair", async () => {
    const keys = await generateKeys();
  
    expect(keys.privateKey).toBeDefined();
    expect(keys.publicKey).toBeDefined();
  });
  
});
