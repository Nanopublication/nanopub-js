import { NanopubOptions, NanopubData } from './types/types';
import { Quad, DataFactory } from 'n3';
import { serialize, parse } from './serialize';
import { verifySignature } from './sign/verify';
import { sign as signRdf } from './sign/sign';
import { getCryptoAdapter } from './sign/crypto';

import { createNanopubGraphs } from './utils';
import { DEFAULT_NANOPUB_URI, TEST_NANOPUB_REGISTRY_URL } from './constants';
import { RDF, XSD, NP, PROV } from './vocab';

const { quad, literal } = DataFactory;

export class Nanopub implements NanopubData {
  head: Quad[];
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  signature?: string;
  privateKey?: string;
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
    } = {},
  ) {
    const { assertion = [], provenance = [], pubinfo = [], options } = params;

    const nanopubUri = this.sourceUri ?? DEFAULT_NANOPUB_URI;

    const { npNode, headGraph, assertionGraph, provenanceGraph, pubinfoGraph } =
      createNanopubGraphs(nanopubUri);

    this.head = [
      quad(npNode, RDF('type'), NP('Nanopublication'), headGraph),
      quad(npNode, NP('hasAssertion'), assertionGraph, headGraph),
      quad(npNode, NP('hasProvenance'), provenanceGraph, headGraph),
      quad(npNode, NP('hasPublicationInfo'), pubinfoGraph, headGraph),
    ];

    this.assertion = assertion.map((q) =>
      quad(q.subject, q.predicate, q.object, assertionGraph),
    );

    const now = new Date().toISOString();

    this.provenance = provenance.length
      ? provenance.map((q) =>
          quad(q.subject, q.predicate, q.object, provenanceGraph),
        )
      : [
          quad(
            assertionGraph,
            PROV('generatedAtTime'),
            literal(now, XSD('dateTime')),
            provenanceGraph,
          ),
        ];

    this.pubinfo = pubinfo.length
      ? pubinfo.map((q) => quad(q.subject, q.predicate, q.object, pubinfoGraph))
      : [
          quad(
            npNode,
            PROV('generatedAtTime'),
            literal(now, XSD('dateTime')),
            pubinfoGraph,
          ),
        ];

    if (options?.privateKey && options?.name && options?.orcid) {
      this.privateKey = options.privateKey;
      this._profileParams = {
        privateKey: options.privateKey,
        orcid: options.orcid,
        name: options.name,
        email: options.email ?? '',
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

    this.head = findGraph('Head');
    this.assertion = findGraph('assertion');
    this.provenance = findGraph('provenance');
    this.pubinfo = findGraph('pubinfo');
  }

  private rehydrateFromSignedRdf(): void {
    if (!this._rdf) throw new Error('No signed RDF');

    const quads = parse(this._rdf, 'trig');
    this.hydrateFromQuads(quads);
  }

  async sign(): Promise<this> {
    if (!this._profileParams) {
      throw new Error('Profile not set. Cannot sign nanopub.');
    }

    // Short-circuit: if already signed with the same key and orcid, re-signing
    // would produce an identical result, so skip the work.
    if (this.signature) {
      const adapter = await getCryptoAdapter();
      const currentPublicKey = await adapter.extractPublicKey(this._profileParams.privateKey);
      const existingPubKey = this.pubinfo.find(q => q.predicate.value.endsWith('hasPublicKey'))?.object.value;
      const existingOrcid = this.pubinfo.find(q => q.predicate.value.endsWith('creator'))?.object.value;
      if (existingPubKey === currentPublicKey && existingOrcid === this._profileParams.orcid) {
        return this;
      }
    }

    const trig = await serialize(this, 'trig');

    const { signedRdf, sourceUri, signature } = await signRdf(
      trig,
      this._profileParams.privateKey,
      this._profileParams.orcid,
    );

    this._rdf = signedRdf;
    this.sourceUri = sourceUri;
    this.signature = signature;

    this.rehydrateFromSignedRdf();
    return this;
  }

  async hasValidSignature(): Promise<boolean> {
    if (!this.signature || !this._rdf) return false;

    return (await verifySignature(this._rdf)).valid;
  }

  rdf(): string {
    if (!this._rdf) {
      throw new Error('No RDF available.');
    }
    return this._rdf;
  }

  async serialize(format: 'trig' | 'turtle' = 'trig'): Promise<string> {
    return serialize(this, format);
  }

  static fromRdf(
    rdf: string,
    format: 'trig' | 'turtle' | 'jsonld' = 'trig',
    options?: NanopubOptions,
  ): Nanopub {
    const np = new Nanopub({ options });

    const quads = parse(rdf, format);
    np.hydrateFromQuads(quads);

    np._rdf = rdf;

    const signatureQuad = quads.find((q) =>
      q.predicate.value.endsWith('hasSignature'),
    );

    if (!signatureQuad) {
      np.signature = undefined;
    }

    return np;
  }

  async publish(
    server: string = TEST_NANOPUB_REGISTRY_URL,
  ): Promise<{ uri: string; server: string; response: Response }> {
    // check if signed
    if (!this._rdf) {
      if (typeof this.sign === 'function') {
        await this.sign();
      } else {
        throw new Error('Nanopub is not signed and cannot be signed');
      }
    }

    const rdf = this.rdf();

    const res = await fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/trig' },
      body: rdf,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Nanopub publish failed: ${res.status} ${res.statusText}\n${text}`,
      );
    }

    return { uri: this.sourceUri!, server, response: res };
  }
}

/** @deprecated Use `Nanopub` instead. */
export { Nanopub as NanopubClass };
