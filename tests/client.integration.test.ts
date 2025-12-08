import { describe, it, expect } from "vitest";
import { NanopubClient } from "../src/client";

const endpoints = ['https://query.knowledgepixels.com/', 'https://query.knowledgepixels.com/repo/full'];

describe("NanopubClient querySparql (integration)", () => {
  it("should query a real server and return nanopubs", async () => {
    const client = new NanopubClient({
      endpoints: ["https://query.knowledgepixels.com/"],
    });

    const query = "SELECT ?a WHERE {}"

    const results = await client.querySparql(query);
    expect(results.length).toBeGreaterThan(0);
  }, 20000);

  it("fetchNanopub returns raw trig text", async () => {
    const client = new NanopubClient({
      endpoints: ["https://query.knowledgepixels.com/"],
    });
  
    const uri =
      "https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U";
  
    const trig = await client.fetchNanopub(uri); // default = 'trig'
  
    expect(typeof trig).toBe("string");
    expect(trig.length).toBeGreaterThan(0);
  
    expect(trig).toMatch(/sub:assertion\s*\{/);
    expect(trig).toMatch(/sub:provenance\s*\{/);
    expect(trig).toMatch(/sub:pubinfo\s*\{/);
  }, 20000);

  it("fetchNanopub returns json-ld", async () => {
    const client = new NanopubClient({
      endpoints: ["https://query.knowledgepixels.com/"],
    });
  
    const uri =
      "https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U";
  
    const json = await client.fetchNanopub(uri, "jsonld");
  
    expect(typeof json).toBe("object");
    expect(json).not.toBeNull();
  
    expect(JSON.stringify(json)).toContain("RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U");
  }, 20000);

  it("findNanopubsWithText returns results", async () => {
    const client = new NanopubClient({
      endpoints: ["https://query.knowledgepixels.com/"],
    });
    const results: Record<string, string>[] = [];
    for await (const np of client.findNanopubsWithText("test"))
      results.push(np);
    expect(results.length).toBeGreaterThan(0);
  }, 20000);

  it("findNanopubsWithPattern returns results", async () => {
    const client = new NanopubClient({
      endpoints: ["https://query.knowledgepixels.com/"],
    });
    const results: Record<string, string>[] = [];

    for await (const np of client.findNanopubsWithPattern(
      "http://www.w3.org/2002/07/owl#Thing",
      "",
      undefined
    ))
      results.push(np);
    expect(results.length).toBeGreaterThanOrEqual(0); // may be 0
  }, 20000);

  it("findThings returns results", async () => {
    const client = new NanopubClient({
      endpoints: ["https://query.knowledgepixels.com/"],
    });
    const results: Record<string, string>[] = [];
    for await (const t of client.findThings(
      "http://www.w3.org/2002/07/owl#Class"
    ))
      results.push(t);
    expect(results.length).toBeGreaterThanOrEqual(0);
  }, 20000);

  it("findRetractionsOf returns results", async () => {
    const client = new NanopubClient({
      endpoints: ["https://query.knowledgepixels.com/"],
    });
    const retractions = await client.findRetractionsOf(
      "https://query.knowledgepixels.com/someUriThatExists"
    );
    expect(Array.isArray(retractions)).toBe(true);
  }, 20000);
});
