import { NanopubOptions, Nanopub } from './types';
import { Nanopub as WasmNanopub, NpProfile } from '@nanopub/sign';
import { Parser, Quad, DataFactory } from 'n3';
import { serialize, parse } from './serialize';
import { verifySignature } from './sign';
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

  constructor(params: {
    assertion?: Quad[];
    provenance?: Quad[];
    pubinfo?: Quad[];
    options?: NanopubOptions;
  } = {}) {
    const { assertion = [], provenance = [], pubinfo = [], options } = params;
    
    const nanopubUri = this.sourceUri || DEFAULT_NANOPUB_URI;
    const npNode = makeNamedGraphNode(nanopubUri, ''); 
    const assertionGraph = makeNamedGraphNode(nanopubUri, 'assertion');
    const provenanceGraph = makeNamedGraphNode(nanopubUri, 'provenance');
    const pubinfoGraph = makeNamedGraphNode(nanopubUri, 'pubinfo');
    const headGraph = makeNamedGraphNode(nanopubUri, 'Head');    
    
    this.head = [
      quad(npNode, namedNode('rdf:type'), namedNode('np:Nanopublication'), headGraph),
      quad(npNode, namedNode('np:hasAssertion'), assertionGraph, headGraph),
      quad(npNode, namedNode('np:hasProvenance'), provenanceGraph, headGraph),
      quad(npNode, namedNode('np:hasPublicationInfo'), pubinfoGraph, headGraph),
    ];

    this.assertion = assertion.map(q => quad(q.subject, q.predicate, q.object, assertionGraph));

    const now = new Date().toISOString();
    this.provenance = provenance.length
      ? provenance.map(q => quad(q.subject, q.predicate, q.object, provenanceGraph))
      : [quad(assertionGraph, namedNode('prov:generatedAtTime'), literal(now), provenanceGraph)];
    this.pubinfo = pubinfo.length
      ? pubinfo.map(q => quad(q.subject, q.predicate, q.object, pubinfoGraph))
      : [quad(npNode, namedNode('prov:generatedAtTime'), literal(now), pubinfoGraph)];

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
    console.log('Serializing nanopub for signing:\n', trig);
    const wasmNp = new WasmNanopub(trig);
    const signed = wasmNp.sign(this.profile);
    console.log('Signed nanopub RDF:\n', signed.rdf());
    this.sourceUri = signed.info().uri;
    this.signature = signed.info().signature;

    const parsed = parse(signed.rdf(), 'trig');
    const graphs = parsed.reduce((acc, q) => {
      const g = q.graph.value;
      acc[g] = acc[g] || [];
      acc[g].push(q);
      return acc;
    }, {} as Record<string, Quad[]>);

    this.head = Object.entries(graphs).find(([g]) => g.endsWith('/Head'))?.[1] || [];
    this.assertion = Object.entries(graphs).find(([g]) => g.endsWith('/assertion'))?.[1] || [];
    this.provenance = Object.entries(graphs).find(([g]) => g.endsWith('/provenance'))?.[1] || [];
    this.pubinfo = Object.entries(graphs).find(([g]) => g.endsWith('/pubinfo'))?.[1] || [];

    return this;
  }

  async hasValidSignature(): Promise<boolean> {
    if (!this.signature) return false;
    try {
      const rdf = await serialize(this, 'trig', this.sourceUri || DEFAULT_NANOPUB_URI);
      return verifySignature(rdf);
    } catch {
      return false;
    }
  }
}
