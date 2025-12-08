import { NanopubOptions, Nanopub } from './types';
import { Nanopub as WasmNanopub, NpProfile } from '@nanopub/sign';
import { Parser, Quad, Writer, DataFactory, DefaultGraph } from 'n3';
const { namedNode, blankNode, literal, quad } = DataFactory;
import { serialize, parse } from './serialize';
import { verifySignature } from './sign';

export class NanopubClass implements Nanopub {
  id: string;
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  signature?: string;
  privateKey?: string;
  profile?: NpProfile;

  constructor(quads: Quad[] = [], id?: string, options?: NanopubOptions) {
    this.id = id ?? crypto.randomUUID();

    const assertionGraph = namedNode(`urn:uuid:${this.id}-assertion`);
    const provenanceGraph = namedNode(`urn:uuid:${this.id}-provenance`);
    const pubinfoGraph = namedNode(`urn:uuid:${this.id}-pubinfo`);
    const npNode = namedNode(`urn:uuid:${this.id}`);

    this.assertion = quads.map(q =>
      quad(q.subject, q.predicate, q.object, assertionGraph)
    );

    const now = new Date().toISOString();
    this.provenance = [
      quad(assertionGraph, namedNode('http://www.w3.org/ns/prov#generatedAtTime'), literal(now), provenanceGraph)
    ];

    this.pubinfo = [
      quad(npNode, namedNode('http://www.w3.org/ns/prov#generatedAtTime'), literal(now), pubinfoGraph),
      quad(npNode, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://www.nanopub.org/nschema#Nanopublication'), pubinfoGraph),
      quad(npNode, namedNode('http://www.nanopub.org/nschema#hasAssertion'), assertionGraph, pubinfoGraph),
      quad(npNode, namedNode('http://www.nanopub.org/nschema#hasProvenance'), provenanceGraph, pubinfoGraph),
      quad(npNode, namedNode('http://www.nanopub.org/nschema#hasPublicationInfo'), pubinfoGraph, pubinfoGraph)
    ];

    // Optional profile
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

  /** Sign nanopub */
  async sign(): Promise<this> {
    if (!this.profile) throw new Error("Profile not set. Cannot sign nanopub.");

    const allQuads = [...this.assertion, ...this.provenance, ...this.pubinfo];
    const trig = await serialize({ assertion: this.assertion, provenance: this.provenance, pubinfo: this.pubinfo } as any, 'trig');

    const wasmNp = new WasmNanopub(trig);
    const signed = wasmNp.sign(this.profile);

    this.signature = signed.info().signature;

    const parsed = parse(signed.rdf(), 'trig');

    const graphs = parsed.reduce((acc, q) => {
      const g = q.graph.value;
      acc[g] = acc[g] || [];
      acc[g].push(q);
      return acc;
    }, {} as Record<string, any[]>);
    
    this.assertion = Object.entries(graphs).find(([g]) => g.endsWith("#-assertion"))?.[1] || [];
    this.provenance = Object.entries(graphs).find(([g]) => g.endsWith("#-provenance"))?.[1] || [];
    this.pubinfo = Object.entries(graphs).find(([g]) => g.endsWith("#-pubinfo"))?.[1] || [];

    return this;
  }

  static create(quads: Quad[] | string, options?: NanopubOptions): NanopubClass {
    let parsed: Quad[] = [];
    if (typeof quads === 'string') {
      const parser = new Parser({ format: 'application/trig' });
      parsed = parser.parse(quads);
    } else parsed = quads;
    return new NanopubClass(parsed, undefined, options);
  }

  get hasValidSignature(): Promise<boolean> | boolean {

    if (!this.signature) return false;
  
    const quads = [...this.assertion, ...this.provenance, ...this.pubinfo];
  
    const baseUri = `urn:uuid:${this.id}`;
  
    try {
      // verifyNanopubSignature should:
      // - extract signature and public key from quads (pubinfo)
      // - normalize RDF
      // - verify the signature against normalized RDF
      return verifySignature(quads);
    } catch (err) {
      console.error('Nanopub signature verification failed:', err);
      return false;
    }
  }
}
