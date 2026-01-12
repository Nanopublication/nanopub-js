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

  it("querySparql returns empty array on 404", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const client = new NanopubClient();
    const result = await client.querySparql("SELECT * WHERE {?s ?p ?o}");

    expect(result).toEqual([]);
  });

  it("querySparql throws on 500", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
    });

    const client = new NanopubClient();
    expect(client.querySparql("SELECT * WHERE {?s ?p ?o}")).rejects.toThrow(
      /SPARQL query failed/
    );
  });

  it("fetchNanopub returns JSON-LD when format='jsonld'", async () => {
    const jsonldData = { "@id": "s", p: "o" };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => jsonldData,
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
      text: async () => trigData,
    });

    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    const np = await client.fetchNanopub("https://mock.org/np1");

    expect(np).toBe(trigData);
    expect(typeof np).toBe("string");
  });

  it("fetchNanopub throws on non-OK response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });

    await expect(client.fetchNanopub("https://mock.org/np404")).rejects.toThrow(
      /Failed to fetch nanopub/
    );
  });

  it("fetchNanopub sends correct Accept header", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "trig",
    });

    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    await client.fetchNanopub("https://mock.org/np1", "trig");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://mock.org/np1",
      expect.objectContaining({
        headers: { Accept: "application/trig" },
      })
    );
  });

  it('throws on unsupported format', async () => {
    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
    await expect(
      // @ts-expect-error testing invalid format
      client.fetchNanopub('https://example.com/nanopub', 'gibberish')
    ).rejects.toThrow('Unsupported format');
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

  it("_search yields nothing on empty bindings", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: { bindings: [] } }),
    });
  
    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
  
    const results: Record<string, string>[] = [];
    for await (const r of client.findThings("type")) results.push(r);
  
    expect(results).toEqual([]);
  });

  it("_search swallows fetch errors and yields nothing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
  
    const client = new NanopubClient({ endpoints: ["https://mock.org/"] });
  
    const results: Record<string, string>[] = [];
    for await (const r of client.findThings("type")) results.push(r);
  
    expect(results).toEqual([]);
  });

});
