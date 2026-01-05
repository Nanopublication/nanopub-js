import { describe, it, expect, beforeEach } from "vitest";
import { NanopubClass, serialize, parse } from "../src/index";
import { NamedNode, Quad, DefaultGraph, Literal } from "n3";
import { generateKeyPairSync } from "crypto";
import { makeNamedGraphNode } from "../src/utils";
import { Nanopub as WasmNanopub } from "@nanopub/sign";
import { DEFAULT_NANOPUB_URI } from '../src/constants';

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
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
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
      }
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
  it("publishes the nanopub", async () => {
    const TEST_ENDPOINT = "https://test.registry.knowledgepixels.com/np/";

    await np.sign();

    const result = await np.publish(TEST_ENDPOINT);

    expect(result.uri).toBeDefined();
    expect(result.server).toBe(TEST_ENDPOINT);
    expect(result.response.ok).toBeTruthy();
    expect(np.signature).toBeDefined();
  }, 20000); 
});
