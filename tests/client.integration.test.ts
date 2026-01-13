import { describe, it, expect, } from "vitest";
import { NanopubClient } from "../src/client";

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

  it("runQueryTemplate runs get-news-content query", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });

    const queryId =
      "RAOGCU2nQzZ0aE2iXwJ20jJtnZsjVR0pfFg0qlSxYtBIA/get-news-content";

    const params = {
      resource: "https://w3id.org/spaces/knowledgepixels",
    };

    const results: Record<string, string>[] = [];
    for await (const row of client.runQueryTemplate(queryId, params)) {
      results.push(row);
      break;
    }

    expect(Array.isArray(results)).toBe(true);
  }, 20000);

  it("runQueryTemplate runs get-spaces query", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });

    const queryId = "RAf0Apox1sbJRC0ZBrqS9wtYccLFJ_5VLq-u4rJy5WbnA/get-spaces";

    const params = {
      type: "https://w3id.org/kpxl/gen/terms/Organization",
    };

    const results: Record<string, string>[] = [];
    for await (const row of client.runQueryTemplate(queryId, params)) {
      results.push(row);
      break;
    }

    expect(Array.isArray(results)).toBe(true);
  }, 20000);

  it("runQueryTemplate returns empty results if required params are missing", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });

    const queryId =
      "RAOGCU2nQzZ0aE2iXwJ20jJtnZsjVR0pfFg0qlSxYtBIA/get-news-content";

    const results: Record<string, string>[] = [];
    for await (const row of client.runQueryTemplate(queryId, {})) {
      results.push(row);
    }

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  }, 20000);

  it("runQueryTemplate ignores unknown params and returns all results", async () => {
    const client = new NanopubClient({ endpoints: [ENDPOINT] });

    const queryId = "RAf0Apox1sbJRC0ZBrqS9wtYccLFJ_5VLq-u4rJy5WbnA/get-spaces";

    const params = {
      notARealParam: "https://w3id.org/kpxl/gen/terms/Organization",
    };

    const results: Record<string, string>[] = [];
    for await (const row of client.runQueryTemplate(queryId, params)) {
      results.push(row);
      break;
    }

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });
});
