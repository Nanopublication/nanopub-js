// nanopub.ts
import { NanopubOptions, Nanopub } from './types';
import { Nanopub as WasmNanopub, NpProfile } from '@nanopub/sign';
import { Parser, Quad, DataFactory } from 'n3';
import { serialize, parse } from './serialize';
import { verifySignature } from './sign';

const { namedNode, literal, quad } = DataFactory;

export class NanopubClass implements Nanopub {
  id: string;
  head: Quad[];
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  signature?: string;
  privateKey?: string;
  profile?: NpProfile;

  constructor(quads: Quad[] = [], id?: string, options?: NanopubOptions) {
    this.id = id ?? crypto.randomUUID();

    const tempBaseUri = 'http://temp.nanopub.local/';

    const npNode = namedNode(`${tempBaseUri}${this.id}#this`);
    const assertionGraph = namedNode(`${tempBaseUri}${this.id}-assertion`);
    const provenanceGraph = namedNode(`${tempBaseUri}${this.id}-provenance`);
    const pubinfoGraph = namedNode(`${tempBaseUri}:${this.id}-pubinfo`);
    const headGraph = namedNode(`${tempBaseUri}${this.id}-Head`);

    this.head = [
      quad(npNode, namedNode('rdf:type'), namedNode('np:Nanopublication'), headGraph),
      quad(npNode, namedNode('np:hasAssertion'), assertionGraph, headGraph),
      quad(npNode, namedNode('np:hasProvenance'), provenanceGraph, headGraph),
      quad(npNode, namedNode('np:hasPublicationInfo'), pubinfoGraph, headGraph),
    ];

    this.assertion = quads.map(q => quad(q.subject, q.predicate, q.object, assertionGraph));

    const now = new Date().toISOString();
    this.provenance = [
      quad(assertionGraph, namedNode('prov:generatedAtTime'), literal(now), provenanceGraph),
    ];

    this.pubinfo = [
      quad(npNode, namedNode('prov:generatedAtTime'), literal(now), pubinfoGraph),
    ];

    // Optional profile for signing
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

  async sign(): Promise<this> {
    if (!this.profile) throw new Error('Profile not set. Cannot sign nanopub.');

    const trig = await serialize(this, 'trig');
    console.log("Before signing: ", trig)
    const wasmNp = new WasmNanopub(trig);
    const signed = wasmNp.sign(this.profile);
    console.log("After signing: ", signed.rdf())
    this.signature = signed.info().signature;

  //   try {
  //   console.log("CHECKING", signed.check())
  // } catch (err) {
  //   console.error("ERROR DURING SIGN CHECK", err)
  // }

    const parsed = parse(signed.rdf(), 'trig');
    const graphs = parsed.reduce((acc, q) => {
      const g = q.graph.value;
      acc[g] = acc[g] || [];
      acc[g].push(q);
      return acc;
    }, {} as Record<string, Quad[]>);

    this.head = Object.entries(graphs).find(([g]) => g.endsWith('-Head'))?.[1] || [];
    this.assertion = Object.entries(graphs).find(([g]) => g.endsWith('-assertion'))?.[1] || [];
    this.provenance = Object.entries(graphs).find(([g]) => g.endsWith('-provenance'))?.[1] || [];
    this.pubinfo = Object.entries(graphs).find(([g]) => g.endsWith('-pubinfo'))?.[1] || [];

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

  async hasValidSignature(): Promise<boolean> {
    if (!this.signature) return false;
    try {
      const rdf = await serialize(this, 'trig');
      console.log(rdf)
      return verifySignature(rdf);
    } catch (err) {
      console.error('Nanopub signature verification failed:', err);
      return false;
    }
  }
}
