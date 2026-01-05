import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NanopubClient } from "../src/client";

describe("NanopubClient (unit)", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    // @ts-ignore
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("querySparql returns parsed SPARQL results", async () => {
    const sparqlResponse = {
      head: { vars: ["s", "p", "o"] },
      results: {
        bindings: [
          {
            s: { type: "uri", value: "s" },
            p: { type: "uri", value: "p" },
            o: { type: "literal", value: "o" },
          },
        ],
      },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => sparqlResponse,
    });

    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    const results = await client.querySparql("SELECT * WHERE {?s ?p ?o}");
    expect(results[0]).toEqual({ s: "s", p: "p", o: "o" });
  });

  it("fetchNanopub returns JSON-LD when format='jsonld'", async () => {
    const jsonldData = { "@id": "s", "p": "o" };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => jsonldData
    });
  
    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    const np = await client.fetchNanopub("https://mock.org/np1", "jsonld");
  
    expect(np).toEqual(jsonldData);
    expect(typeof np).toBe("object");
  });
  
  
  it("fetchNanopub returns raw TRiG text when format='trig' (default)", async () => {
    const trigData = `
      <s#assertion> {
        <s> <p> "o" .
      }
      <s#provenance> {
        <s> <p> "o" .
      }
      <s#pubinfo> {
        <s> <p> "o" .
      }
    `;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => trigData
    });
  
    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    const np = await client.fetchNanopub("https://mock.org/np1");
  
    expect(np).toBe(trigData);
    expect(typeof np).toBe("string");
  });
  

  it("findNanopubsWithText yields search results", async () => {
    const fakeResponse = {
      results: {
        bindings: [{ np: { value: "np1" }, created: { value: "2025-01-01" } }],
      },
    };
    fetchMock.mockResolvedValue({ ok: true, json: async () => fakeResponse });

    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    const results: Record<string, string>[] = [];
    for await (const r of client.findNanopubsWithText("test")) results.push(r);
    expect(results.length).toBe(1);
    expect(results[0].np).toBe("np1");
  });

  it("findNanopubsWithPattern yields search results", async () => {
    const fakeResponse = { results: { bindings: [{ np: { value: "np2" } }] } };
    fetchMock.mockResolvedValue({ ok: true, json: async () => fakeResponse });

    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    const results: Record<string, string>[] = [];
    for await (const r of client.findNanopubsWithPattern("s", "p", "o"))
      results.push(r);
    expect(results.length).toBe(1);
    expect(results[0].np).toBe("np2");
  });

  it("findThings yields search results", async () => {
    const fakeResponse = {
      results: { bindings: [{ thing: { value: "thing1" } }] },
    };
    fetchMock.mockResolvedValue({ ok: true, json: async () => fakeResponse });

    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    const results: Record<string, string>[] = [];
    for await (const r of client.findThings("type1")) results.push(r);
    expect(results.length).toBe(1);
    expect(results[0].thing).toBe("thing1");
  });

  it("findRetractionsOf returns retraction URIs", async () => {
    const fakeResponse = { results: { bindings: [{ np: { value: "np3" } }] } };
    fetchMock.mockResolvedValue({ ok: true, json: async () => fakeResponse });

    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    const retractions = await client.findRetractionsOf("uri1");
    expect(retractions).toContain("np3");
  });

  it("publish posts signed example nanopub to the registry", async () => {
    const TEST_REGISTRY = "https://test.registry.knowledgepixels.com/np/";
  
    const signedTrig = `
  @prefix np: <http://www.nanopub.org/nschema#> .
  @prefix npx: <http://purl.org/nanopub/x/> .
  @prefix dct: <http://purl.org/dc/terms/> .
  @prefix this: <https://w3id.org/np/TEST123> .
  
  this: a np:Nanopublication, npx:ExampleNanopub ;
    dct:creator <https://orcid.org/0000-0002-1267-0234> .
  `;
  
    const fakeNanopub: any = {
      sourceUri: "https://w3id.org/np/TEST123",
      rdf: () => signedTrig,
    };
  
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "",
    });
  
    const client = new NanopubClient({
      endpoints: [TEST_REGISTRY],
    });
  
    const result = await client.publish(fakeNanopub, {
      useServer: TEST_REGISTRY,
    });
  
    expect(fetchMock).toHaveBeenCalledTimes(1);
  
    const [url, options] = fetchMock.mock.calls[0];
  
    expect(url).toBe(TEST_REGISTRY);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/trig");
  
    expect(options.body).toContain("npx:ExampleNanopub");
  
    expect(result.uri).toBe(fakeNanopub.sourceUri);
    expect(result.server).toBe(TEST_REGISTRY);
  });
  
});
