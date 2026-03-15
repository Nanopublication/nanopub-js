import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_NANOPUB_URI,
  NanopubClass as Nanopub,
  parse,
  serialize,
} from "../src";
import { generateKeyPairSync } from "crypto";
import { Literal, NamedNode, Quad } from "n3";
import { makeNamedGraphNode } from "../src/utils";

describe("serialize()", () => {
  let assertionQuads: Quad[];
  let provQuads: Quad[];
  let pubinfoQuads: Quad[];

  let np: Nanopub;

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

    np = new Nanopub({
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
  it("serializes all graphs into trig", async () => {
    const trig = await serialize(np, "trig");

    expect(trig).toContain("Head");
    expect(trig).toContain("assertion");
    expect(trig).toContain("provenance");
    expect(trig).toContain("pubinfo");
  });

  it("uses DEFAULT_NANOPUB_URI when none provided", async () => {
    const trig = await serialize(np, "trig");
    expect(trig).toContain(DEFAULT_NANOPUB_URI);
  });
  it("uses 'this:' prefix for nanopub URI subjects", async () => {
    const trig = await serialize(np, "trig");
    expect(trig).toContain("@prefix this:");
    expect(trig).toMatch(/this:\s+<[^>]+>/);
    expect(trig).toContain("this: dc:creator");
  });

  describe("signed nanopub serialization", () => {
    let signedTrig: string;
    let trustyUri: string;

    beforeEach(async () => {
      await np.sign();
      trustyUri = np.sourceUri!;
      signedTrig = await serialize(np, "trig");
    });

    it("declares 'this:' prefix with the trusty URI", () => {
      expect(signedTrig).toContain(`@prefix this: <${trustyUri}>`);
    });

    it("declares 'sub:' prefix with the trusty URI + slash", () => {
      expect(signedTrig).toContain(`@prefix sub: <${trustyUri}/>`);
    });

    it("uses 'this:' shorthand for the nanopub subject (not a bare URI)", () => {
      // N3.js may order predicates arbitrarily; check that 'this:' is used as subject
      // and that the bare URI does not appear in subject position in the graph content
      expect(signedTrig).toContain("this: np:hasAssertion sub:assertion");
      expect(signedTrig).toContain("a np:Nanopublication");
      expect(signedTrig).not.toContain(`<${trustyUri}> `);
    });

    it("uses 'sub:' shorthand for graph names", () => {
      expect(signedTrig).toContain("sub:Head");
      expect(signedTrig).toContain("sub:assertion");
      expect(signedTrig).toContain("sub:provenance");
      expect(signedTrig).toContain("sub:pubinfo");
    });

    it("trusty URI starts with https://w3id.org/np/RA", () => {
      expect(trustyUri).toMatch(/^https:\/\/w3id\.org\/np\/RA/);
    });

    it("signed trig does not contain the temp placeholder URI", () => {
      expect(signedTrig).not.toContain("purl.org/nanopub/temp");
    });
  });
});

describe("parse()", () => {
  it("parses trig into quads", () => {
    const quads = parse(
      `
      @prefix ex: <http://example.org/> .
      ex:s ex:p ex:o .
    `,
      "turtle"
    );

    expect(Array.isArray(quads)).toBe(true);
  });

  it("returns empty array on parse error", () => {
    const quads = parse("<<< broken >>>", "trig");
    expect(quads).toEqual([]);
  });
});
