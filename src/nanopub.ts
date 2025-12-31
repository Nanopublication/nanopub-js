import { NanopubOptions, Nanopub } from './types';
import { Nanopub as WasmNanopub, NpProfile } from '@nanopub/sign';
import { Parser, Quad, DataFactory } from 'n3';
import { serialize, parse } from './serialize';
import { initNanopubSignWasm, verifySignature } from './sign';
import { makeNamedGraphNode } from './utils';

const { namedNode, quad, literal } = DataFactory;

export const DEFAULT_NANOPUB_URI = 'http://purl.org/nanopub/temp/np/';

export class NanopubClass implements Nanopub {
  head: Quad[];
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  signature?: string;
  privateKey?: string;
  profile?: NpProfile;
  sourceUri?: string;
  private _signedRdf?: string;

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
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    );

    const NP = 'http://www.nanopub.org/nschema#';
    const PROV = 'http://www.w3.org/ns/prov#';

    const NP_NANOPUBLICATION = namedNode(`${NP}Nanopublication`);
    const NP_HAS_ASSERTION = namedNode(`${NP}hasAssertion`);
    const NP_HAS_PROVENANCE = namedNode(`${NP}hasProvenance`);
    const NP_HAS_PUBINFO = namedNode(`${NP}hasPublicationInfo`);
    const PROV_GENERATED_AT_TIME = namedNode(`${PROV}generatedAtTime`);

    const nanopubUri = this.sourceUri ?? DEFAULT_NANOPUB_URI;

    const npNode = makeNamedGraphNode(nanopubUri, '');
    const assertionGraph = makeNamedGraphNode(nanopubUri, 'assertion');
    const provenanceGraph = makeNamedGraphNode(nanopubUri, 'provenance');
    const pubinfoGraph = makeNamedGraphNode(nanopubUri, 'pubinfo');
    const headGraph = makeNamedGraphNode(nanopubUri, 'Head');

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
      this.profile = new NpProfile(
        options.privateKey,
        options.orcid,
        options.name,
        options.email ?? ''
      );
    }
  }

  private rehydrateFromSignedRdf(): void {
    if (!this._signedRdf) throw new Error('No signed RDF');

    const quads = parse(this._signedRdf, 'trig');

    const graphs: Record<string, Quad[]> = {};
    for (const q of quads) {
      const g = q.graph.value;
      (graphs[g] ||= []).push(q);
    }

    const findGraph = (suffix: string) =>
      Object.entries(graphs).find(([g]) => g.endsWith(suffix))?.[1] ?? [];

    this.head = findGraph('Head');
    this.assertion = findGraph('assertion');
    this.provenance = findGraph('provenance');
    this.pubinfo = findGraph('pubinfo');
  }

  async sign(): Promise<this> {
    if (!this.profile) throw new Error('Profile not set. Cannot sign nanopub.');

    // Ensure the `@nanopub/sign` WASM runtime is initialized before using wasm-backed APIs.
    initNanopubSignWasm();

    const trig = await serialize(this, 'trig');

    const wasmNp = new WasmNanopub(trig);

    const signed = wasmNp.sign(this.profile);

    this._signedRdf = signed.rdf();
    this.sourceUri = signed.info().uri;
    this.signature = signed.info().signature;

    this.rehydrateFromSignedRdf();

    return this;
  }

  rdf(): string {
    if (!this._signedRdf) throw new Error('Nanopub not signed yet');
    return this._signedRdf;
  }

  async hasValidSignature(): Promise<boolean> {
    if (!this.signature || !this._signedRdf) return false;
    try {
      return verifySignature(this._signedRdf);
    } catch (err) {
      console.error('signature verification failed:', err);
      return false;
    }
  }
}
