import { DataFactory } from "n3";
import { describe, it, expect, beforeEach } from "vitest";
import { NanopubClass } from "../src/nanopub";
import { NanopubClient } from "../src/client";
import { NamedNode, Quad, Literal } from "n3";
import { generateKeyPairSync } from "crypto";
import { makeNamedGraphNode } from "../src/utils";
import { DEFAULT_NANOPUB_URI } from "../src/constants";

const { namedNode, literal, quad } = DataFactory;
const ENDPOINT = "https://query.knowledgepixels.com/";

describe("NanopubClient (integration)", () => {
  it("querySparql queries a real server", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });
    const query = `
      SELECT ?a WHERE {
        ?a ?b ?c
      } LIMIT 1
    `;
    const results = await client.querySparql(query);
    expect(results.length).toBeGreaterThan(0);
  }, 20000);

  it("fetchNanopub returns raw trig text", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });
    const uri =
      "https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U";
    const trig = await client.fetchNanopub(uri); // default = 'trig'

    expect(typeof trig).toBe("string");
    expect(trig.length).toBeGreaterThan(0);
    expect(trig).toMatch(/sub:Head\s*\{/);
    expect(trig).toMatch(/sub:assertion\s*\{/);
    expect(trig).toMatch(/sub:provenance\s*\{/);
    expect(trig).toMatch(/sub:pubinfo\s*\{/);

    expect(trig).toMatch(/this: a npx:ExampleNanopub;/);
  }, 20000);

  it("fetchNanopub returns json-ld", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });
    const uri =
      "https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U";
    const json = await client.fetchNanopub(uri, "jsonld");

    expect(typeof json).toBe("object");
    expect(json).not.toBeNull();
    expect(JSON.stringify(json)).toContain(
      "RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U"
    );
  }, 20000);

  it("findNanopubsWithText returns results", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });
    const results: Record<string, string>[] = [];
    for await (const np of client.findNanopubsWithText("test")) {
      results.push(np);
      break;
    }
    expect(results.length).toBeGreaterThan(0);
  }, 20000);

  it("findNanopubsWithPattern returns results or empty", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });
    const results: Record<string, string>[] = [];
    for await (const np of client.findNanopubsWithPattern(
      "http://www.w3.org/2002/07/owl#Thing",
      "",
      undefined
    )) {
      results.push(np);
      break;
    }
    expect(Array.isArray(results)).toBe(true);
  }, 20000);

  it("findThings returns results or empty", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });
    const results: Record<string, string>[] = [];
    for await (const t of client.findThings(
      "http://www.w3.org/2002/07/owl#Class"
    )) {
      results.push(t);
      break;
    }
    expect(Array.isArray(results)).toBe(true);
  }, 20000);

  it("findRetractionsOf returns an array", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });
    const retractions = await client.findRetractionsOf(
      "https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U"
    );
    expect(Array.isArray(retractions)).toBe(true);
  }, 20000);

  const TEST_ENDPOINT = "https://test.registry.knowledgepixels.com/np/";
  const ENDPOINT = "https://query.knowledgepixels.com/";

  describe("Nanopub publish integration", () => {
    let np: NanopubClass;
    let client: NanopubClient;

    beforeEach(() => {
      const { privateKey, publicKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      const privateKeyBase64 = privateKey
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\r?\n|\r/g, "");

      const nanopubUri = DEFAULT_NANOPUB_URI;
      const npNode = makeNamedGraphNode(nanopubUri, "");
      const assertionGraph = makeNamedGraphNode(nanopubUri, "assertion");
      const provGraph = makeNamedGraphNode(nanopubUri, "provenance");
      const pubinfoGraph = makeNamedGraphNode(nanopubUri, "pubinfo");

      const assertionQuads: Quad[] = [
        new Quad(
          new NamedNode("http://example.org/test"),
          new NamedNode("http://www.w3.org/2002/07/owl#Class"),
          new NamedNode("http://example.org/obj"),
          assertionGraph
        ),
      ];

      const provQuads: Quad[] = [
        new Quad(
          assertionGraph,
          new NamedNode("http://www.w3.org/ns/prov#wasAttributedTo"),
          new NamedNode("https://orcid.org/0000-0000-0000-0000"),
          provGraph
        ),
      ];

      const pubinfoQuads: Quad[] = [
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
          name: "Test User",
          orcid: "https://orcid.org/0000-0000-0000-0000",
          privateKey: privateKeyBase64,
        },
      });

      client = new NanopubClient({ endpoints: [TEST_ENDPOINT] });
    });

    it("signs and publishes a nanopub", async () => {
      await np.sign();
      expect(np.signature).toBeDefined();

      const { uri, server, response } = await client.publish(np);
      console.log(uri, server);
      expect(typeof uri).toBe("string");
      expect(uri).toMatch(/^https:\/\/w3id\.org\/np\//);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);

    }, 30000);
  });
});
