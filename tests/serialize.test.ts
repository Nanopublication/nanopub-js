import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import {
  DEFAULT_NANOPUB_URI,
  NanopubClass as Nanopub,
  parse,
  serialize,
  verifySignature,
} from "../src";
import { generateKeyPairSync } from "crypto";
import { DataFactory, Literal, NamedNode, Quad } from "n3";
import { makeNamedGraphNode } from "../src/utils";

describe("serialize()", () => {
  let assertionQuads: Quad[];
  let provQuads: Quad[];
  let pubinfoQuads: Quad[];

  let np: Nanopub;
  let privateKeyBase64: string;

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

    privateKeyBase64 = privateKey
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
    expect(trig).toContain("this: dct:creator");
  });

  describe("extra prefixes", () => {
    const EX = "http://example.org/";

    it("takes prefixes from the options", () => {
      const withPrefixes = new Nanopub({ assertion: assertionQuads, options: { prefixes: { ex: EX } } });
      expect(withPrefixes.prefixes).toEqual({ ex: EX });
    });

    it("declares and uses them", async () => {
      np.prefixes = { ex: EX };
      const trig = await serialize(np, "trig");
      expect(trig).toContain(`@prefix ex: <${EX}>`);
      expect(trig).toContain("ex:s ex:p ex:o");
    });

    it("leaves out prefixes no term uses", async () => {
      np.prefixes = { unused: "http://unused.example/" };
      expect(await serialize(np, "trig")).not.toContain("@prefix unused:");
    });

    it("does not let them replace this or sub", async () => {
      np.prefixes = { this: EX, sub: EX };
      const trig = await serialize(np, "trig");
      expect(trig).toContain(`@prefix this: <${DEFAULT_NANOPUB_URI}>`);
      expect(trig).not.toContain(`@prefix sub: <${EX}>`);
    });

    it("keeps the prefixes declared in fromRdf() input", async () => {
      np.prefixes = { ex: EX };
      const parsed = Nanopub.fromRdf(await serialize(np, "trig"));
      expect(parsed.prefixes.ex).toBe(EX);
      expect(parsed.prefixes).not.toHaveProperty("this");
    });

    it("keeps them through signing, with the same trusty URI", async () => {
      vi.useFakeTimers({ toFake: ["Date"], now: new Date("2025-01-01T00:00:00Z") });
      onTestFinished(() => vi.useRealTimers());

      const plainUri = (await np.sign()).sourceUri;

      const withPrefixes = new Nanopub({
        assertion: assertionQuads,
        provenance: provQuads,
        pubinfo: pubinfoQuads,
        options: {
          name: "Hello from nanopub-js test",
          orcid: "https://orcid.org/0000-0000-0000-0000",
          privateKey: privateKeyBase64,
          prefixes: { ex: EX },
        },
      });
      await withPrefixes.sign();

      expect(withPrefixes.sourceUri).toBe(plainUri);
      expect(withPrefixes.rdf()).toContain("ex:s ex:p ex:o");
      expect(await verifySignature(withPrefixes.rdf())).toEqual({ valid: true });
    });
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

  it("throws for JSON-LD without a parser", () => {
    expect(() => parse('{"@id":"http://example.org/a"}', "jsonld")).toThrow(
      /needs a parser/,
    );
  });

  it("uses the given parser for JSON-LD", () => {
    const { namedNode, quad } = DataFactory;
    const parser = () => [
      quad(
        namedNode("http://example.org/a"),
        namedNode("http://example.org/p"),
        namedNode("http://example.org/o"),
      ),
    ];

    const quads = parse('{"@id":"http://example.org/a"}', "jsonld", { parser });

    expect(quads).toHaveLength(1);
    expect(quads[0].subject.value).toBe("http://example.org/a");
  });

  it("returns empty array when the given parser fails", () => {
    const parser = () => {
      throw new Error("bad JSON-LD");
    };

    expect(parse("{", "jsonld", { parser })).toEqual([]);
  });
});
