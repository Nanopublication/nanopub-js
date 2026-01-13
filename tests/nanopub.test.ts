import { describe, it, expect, beforeEach, vi } from "vitest";
import { NanopubClass, serialize, parse } from "../src/index";
import { NamedNode, Quad, Literal } from "n3";
import { generateKeyPairSync } from "crypto";
import { makeNamedGraphNode } from "../src/utils/utils";
import { DEFAULT_NANOPUB_URI } from "../src/constants";

describe("Nanopub class", () => {
  let assertionQuads: Quad[];
  let provQuads: Quad[];
  let pubinfoQuads: Quad[];

  let np: NanopubClass;

  const nanopubUri = DEFAULT_NANOPUB_URI;
  const npNode = makeNamedGraphNode(nanopubUri, "");
  const assertionGraph = makeNamedGraphNode(nanopubUri, "assertion");
  const provGraph = makeNamedGraphNode(nanopubUri, "provenance");
  const pubinfoGraph = makeNamedGraphNode(nanopubUri, "pubinfo");

  beforeEach(() => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const privateKeyBase64 = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\r?\n|\r/g, "");

    assertionQuads = [
      new Quad(
        new NamedNode("http://example.org/s"),
        new NamedNode("http://example.org/p"),
        new NamedNode("http://example.org/o"),
        assertionGraph
      ),
    ];

    provQuads = [
      new Quad(
        assertionGraph,
        new NamedNode("http://purl.org/dc/terms/created"),
        new Literal("2024-01-01T00:00:00Z"),
        provGraph
      ),
    ];

    pubinfoQuads = [
      new Quad(
        npNode,
        new NamedNode("http://purl.org/dc/terms/creator"),
        new NamedNode("https://orcid.org/0000-0000-0000-0000"),
        pubinfoGraph
      ),
    ];

    np = new NanopubClass({
      assertion: assertionQuads,
      provenance: provQuads,
      pubinfo: pubinfoQuads,
      options: {
        name: "Hello from nanopub-js test",
        orcid: "https://orcid.org/0000-0000-0000-0000",
        privateKey: privateKeyBase64,
      },
    });
  });

  it("constructs a nanopub with 4 graphs", () => {
    expect(np.head.length).toBeGreaterThan(0);
    expect(np.assertion.length).toBe(1);
    expect(np.provenance.length).toBe(1);
    expect(np.pubinfo.length).toBe(1);
  });

  it("serializes all required graphs", async () => {
    const trig = await serialize(np, "trig", nanopubUri);

    expect(trig).toContain("Head");
    expect(trig).toContain("assertion");
    expect(trig).toContain("provenance");
    expect(trig).toContain("pubinfo");
  });

  it("parses trig back to quads", async () => {
    const trig = await serialize(np, "trig", nanopubUri);
    const parsed = parse(trig, "trig");
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("signs the nanopub", async () => {
    await np.sign();
    expect(np.signature).toBeDefined();
  });

  it("validates signature", async () => {
    const signed = await np.sign();
    const ok = await signed.hasValidSignature();
    expect(ok).toBeTruthy();
  });

  it("hasValidSignature returns false if not signed", async () => {
    const np = new NanopubClass({
      assertion: assertionQuads,
    });
  
    const ok = await np.hasValidSignature();
    expect(ok).toBe(false);
  });

  it("throws when signing without profile params", async () => {
    const np = new NanopubClass({
      assertion: assertionQuads,
    });
  
    await expect(np.sign()).rejects.toThrow(/Profile not set/);
  });
  
  it("publishes the nanopub", async () => {
    const TEST_ENDPOINT = "https://test.registry.knowledgepixels.com/np/";

    await np.sign();

    const result = await np.publish(TEST_ENDPOINT);

    expect(result.uri).toBeDefined();
    expect(result.server).toBe(TEST_ENDPOINT);
    expect(result.response.ok).toBeTruthy();
    expect(np.signature).toBeDefined();
  }, 20000);

  it("publish throws on server error", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "invalid nanopub",
    });
  
    await np.sign();
  
    await expect(
      np.publish("https://mock.registry/np/")
    ).rejects.toThrow(/Nanopub publish failed/);
  });  

  it("auto-generates provenance when none is provided", () => {
    const np = new NanopubClass({
      assertion: assertionQuads,
    });
  
    expect(np.provenance.length).toBe(1);
    expect(np.provenance[0].predicate.value)
      .toContain("generatedAtTime");
  });

  it("auto-generates pubinfo when none is provided", () => {
    const np = new NanopubClass({
      assertion: assertionQuads,
    });
  
    expect(np.pubinfo.length).toBe(1);
  });

  describe("NanopubClass.fromRdf", () => {
    let signedNp: NanopubClass;
    let trigRdf: string;

    beforeEach(async () => {
      signedNp = await np.sign();
      trigRdf = signedNp.rdf();
    });

    it("loads nanopub from RDF without losing graphs", () => {
      const npFromRdf = NanopubClass.fromRdf(trigRdf);

      expect(npFromRdf.head.length).toBeGreaterThan(0);
      expect(npFromRdf.assertion.length).toBe(np.assertion.length);
      expect(npFromRdf.provenance.length).toBe(np.provenance.length);
      expect(npFromRdf.pubinfo.length).toBe(np.pubinfo.length);

      expect(npFromRdf.rdf()).toBe(trigRdf);
    });

    it("can be re-signed after loading", async () => {
      const npFromRdf = NanopubClass.fromRdf(trigRdf);

      npFromRdf["_profileParams"] = {
        privateKey: np["_profileParams"]!.privateKey,
        orcid: np["_profileParams"]!.orcid,
        name: np["_profileParams"]!.name,
        email: np["_profileParams"]!.email,
      };

      const signed = await npFromRdf.sign();
      expect(signed.signature).toBeDefined();
      expect(signed.sourceUri).toBeDefined();
    });

    it("works for unsigned RDF", async () => {
      const unsignedTrig = await serialize(np, "trig");
      const npFromUnsigned = NanopubClass.fromRdf(unsignedTrig);

      expect(npFromUnsigned.assertion.length).toBe(np.assertion.length);
      expect(npFromUnsigned.provenance.length).toBe(np.provenance.length);
      expect(npFromUnsigned.pubinfo.length).toBe(np.pubinfo.length);

      expect(npFromUnsigned.rdf()).toBe(unsignedTrig);
    });
    
    it("handles invalid RDF gracefully", () => {
      const np = NanopubClass.fromRdf("this is not rdf");
    
      expect(np.assertion).toEqual([]);
      expect(np.provenance).toEqual([]);
      expect(np.pubinfo).toEqual([]);
    });
    
  });
});
