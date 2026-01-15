import { NanopubOptions, Nanopub } from "./types/types";
import { Quad, DataFactory } from "n3";
import { serialize, parse } from "./serialize";
import type { NpProfile } from "@nanopub/sign";
import { verifySignature, sign as signRdf } from "./sign";
import { makeNamedGraphNode } from "./utils/utils";
import { DEFAULT_NANOPUB_URI, TEST_NANOPUB_REGISTRY_URL } from "./constants";

const { namedNode, quad, literal } = DataFactory;

export class NanopubClass implements Nanopub {
  head: Quad[];
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  signature?: string;
  privateKey?: string;
  profile?: NpProfile;
  private _profileParams?: {
    privateKey: string;
    orcid: string;
    name: string;
    email?: string;
  };
  sourceUri?: string;
  private _rdf?: string;

  constructor(
    params: {
      assertion?: Quad[];
      provenance?: Quad[];
      pubinfo?: Quad[];
      options?: NanopubOptions;
    } = {}
  ) {
    const { assertion = [], provenance = [], pubinfo = [], options } = params;

    const RDF_TYPE = namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );

    const NP = "http://www.nanopub.org/nschema#";
    const PROV = "http://www.w3.org/ns/prov#";

    const NP_NANOPUBLICATION = namedNode(`${NP}Nanopublication`);
    const NP_HAS_ASSERTION = namedNode(`${NP}hasAssertion`);
    const NP_HAS_PROVENANCE = namedNode(`${NP}hasProvenance`);
    const NP_HAS_PUBINFO = namedNode(`${NP}hasPublicationInfo`);
    const PROV_GENERATED_AT_TIME = namedNode(`${PROV}generatedAtTime`);

    const nanopubUri = this.sourceUri ?? DEFAULT_NANOPUB_URI;

    const npNode = makeNamedGraphNode(nanopubUri, "");
    const assertionGraph = makeNamedGraphNode(nanopubUri, "assertion");
    const provenanceGraph = makeNamedGraphNode(nanopubUri, "provenance");
    const pubinfoGraph = makeNamedGraphNode(nanopubUri, "pubinfo");
    const headGraph = makeNamedGraphNode(nanopubUri, "Head");

    this.head = [
      quad(npNode, RDF_TYPE, NP_NANOPUBLICATION, headGraph),
      quad(npNode, NP_HAS_ASSERTION, assertionGraph, headGraph),
      quad(npNode, NP_HAS_PROVENANCE, provenanceGraph, headGraph),
      quad(npNode, NP_HAS_PUBINFO, pubinfoGraph, headGraph),
    ];

    this.assertion = assertion.map((q) =>
      quad(q.subject, q.predicate, q.object, assertionGraph)
    );

    const now = new Date().toISOString();

    this.provenance = provenance.length
      ? provenance.map((q) =>
          quad(q.subject, q.predicate, q.object, provenanceGraph)
        )
      : [
          quad(
            assertionGraph,
            PROV_GENERATED_AT_TIME,
            literal(now),
            provenanceGraph
          ),
        ];

    this.pubinfo = pubinfo.length
      ? pubinfo.map((q) => quad(q.subject, q.predicate, q.object, pubinfoGraph))
      : [quad(npNode, PROV_GENERATED_AT_TIME, literal(now), pubinfoGraph)];

    if (options?.privateKey && options?.name && options?.orcid) {
      this.privateKey = options.privateKey;
      // Lazily instantiate `NpProfile` in `.sign()` to avoid eager wasm imports.
      this._profileParams = {
        privateKey: options.privateKey,
        orcid: options.orcid,
        name: options.name,
        email: options.email ?? "",
      };
    }

  }

  private hydrateFromQuads(quads: Quad[]): void {
    const graphs: Record<string, Quad[]> = {};

    for (const q of quads) {
      const g = q.graph.value;
      (graphs[g] ||= []).push(q);
    }

    const findGraph = (suffix: string) =>
      Object.entries(graphs).find(([g]) => g.endsWith(suffix))?.[1] ?? [];

    this.head = findGraph("Head");
    this.assertion = findGraph("assertion");
    this.provenance = findGraph("provenance");
    this.pubinfo = findGraph("pubinfo");
  }

  private rehydrateFromSignedRdf(): void {
    if (!this._rdf) throw new Error("No signed RDF");

    const quads = parse(this._rdf, "trig");
    this.hydrateFromQuads(quads);
  }

  async sign(): Promise<this> {
    if (!this._profileParams) {
      throw new Error("Profile not set. Cannot sign nanopub.");
    }

    const trig = await serialize(this, "trig");

    const { signedRdf, sourceUri, signature } = await signRdf(
      trig,
      this._profileParams.privateKey,
      this._profileParams.orcid,
      this._profileParams.name
    );

    this._rdf = signedRdf;
    this.sourceUri = sourceUri;
    this.signature = signature;

    this.rehydrateFromSignedRdf();
    return this;
  }

  rdf(): string {
    if (!this._rdf) {
      throw new Error("No RDF available.");
    }
    return this._rdf;
  }

  async serialize(
    format: "trig" | "turtle" = "trig"
  ): Promise<string> {
    return serialize(this, format);
  }

  async hasValidSignature(): Promise<boolean> {
    if (!this.signature || !this._rdf) return false;
    try {
      return verifySignature(this._rdf);
    } catch (err) {
      console.error("signature verification failed:", err);
      return false;
    }
  }

  static fromRdf(
    rdf: string,
    format: "trig" | "turtle" | "jsonld" = "trig",
    options?: NanopubOptions
  ): NanopubClass {
    const np = new NanopubClass({ options });

    const quads = parse(rdf, format);
    np.hydrateFromQuads(quads);

    np._rdf = rdf;

    const signatureQuad = quads.find((q) =>
      q.predicate.value.endsWith("hasSignature")
    );

    if (!signatureQuad) {
      np.signature = undefined;
    }

    return np;
  }

  async publish(
    server: string = TEST_NANOPUB_REGISTRY_URL
  ): Promise<{ uri: string; server: string; response: Response }> {
    // check if signed
    if (!this._rdf) {
      if (typeof this.sign === "function") {
        await this.sign();
      } else {
        throw new Error("Nanopub is not signed and cannot be signed");
      }
    }

    const rdf = this.rdf();

    const res = await fetch(server, {
      method: "POST",
      headers: { "Content-Type": "application/trig" },
      body: rdf,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Nanopub publish failed: ${res.status} ${res.statusText}\n${text}`
      );
    }

    return { uri: this.sourceUri!, server, response: res };
  }
}
