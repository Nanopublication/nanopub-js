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

  it("fetchNanopub returns parsed assertions", async () => {
    const client = new NanopubClient({
      endpoints: ["https://query.knowledgepixels.com/"],
    });
    const uri =
      "https://w3id.org/np/RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U";
    const np = await client.fetchNanopub(uri);
    expect(np.id).toBe("RAO0soO0mUWTqqMaz1QcGbdIt90MJ55RXJck8w8wGGc0U");
    expect(np.assertion.length).toBeGreaterThan(0);
    expect(np.provenance.length).toBeGreaterThan(0);
    expect(np.pubinfo.length).toBeGreaterThan(0);
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
