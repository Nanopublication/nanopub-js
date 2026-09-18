import { NanopubOptions, NanopubData } from './types/types';
import { Quad, DataFactory } from 'n3';
import { serialize, parse, ParseFormat, ParseOptions } from './serialize';
import { verifySignature } from './sign/verify';
import { sign as signRdf } from './sign/sign';
import { getCryptoAdapter } from './sign/crypto';

import { getInvalidSparql } from './grlc';
import { createNanopubGraphs } from './utils';
import { DEFAULT_NANOPUB_URI, TEST_NANOPUB_REGISTRY_URL } from './constants';
import { RDF, XSD, NP, NPX, PROV } from './vocab';
import { enforceSigningKeyCheck, KeyCheckOptions } from './keyCheck';

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
    /**
     * IRI of the signer, typically an ORCID iD. It may also be a sub-IRI of the
     * nanopub being signed, to self-sign an agent's own introduction.
     */
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

    if (options?.privateKey && options?.orcid) {
      this.privateKey = options.privateKey;
      this._profileParams = {
        privateKey: options.privateKey,
        orcid: options.orcid,
        name: options.name ?? '',
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

  /**
   * Refuses a nanopub whose grlc query doesn't parse. A nanopub cannot be edited
   * after the fact, so such a query is broken permanently: it can never run, and
   * the only remedy is publishing a corrected version.
   */
  private async checkSparql(action: 'signed' | 'published'): Promise<void> {
    const invalid = await getInvalidSparql(this);
    if (invalid.length) {
      throw new Error(
        `Nanopub has invalid SPARQL and cannot be ${action}: ${invalid[0].description}`,
      );
    }
  }

  /**
   * Signs the nanopub with the profile's key. Before signing, the key is checked against the
   * introductions published on the network, so that a key the network cannot attribute to the
   * signer is noticed while the nanopub can still be signed with another one.
   *
   * @param options - how the signing-key check is run; it warns by default
   * @returns this nanopub, signed
   * @throws if the SPARQL of a grlc query does not parse, or, in `strict` mode, if the key cannot be attributed
   */
  async sign(options: KeyCheckOptions = {}): Promise<this> {
    if (!this._profileParams) {
      throw new Error('Profile not set. Cannot sign nanopub.');
    }

    await this.checkSparql('signed');

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

    await enforceSigningKeyCheck(
      this._profileParams.orcid,
      await (await getCryptoAdapter()).extractPublicKey(this._profileParams.privateKey),
      this.assertion,
      'signed',
      options,
    );

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

  /**
   * Reads a value of the nanopub's signature element from its publication info.
   *
   * @param predicate - the local name of the `npx:` predicate, such as `signedBy` or `hasPublicKey`
   * @returns the value, or undefined if the signature does not carry it
   */
  private signatureValue(predicate: 'signedBy' | 'hasPublicKey'): string | undefined {
    return this.pubinfo.find((q) => q.predicate.value === NPX(predicate).value)?.object.value;
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
    format: ParseFormat = 'trig',
    options?: NanopubOptions & ParseOptions,
  ): Nanopub {
    const np = new Nanopub({ options });

    const quads = parse(rdf, format, { parser: options?.parser });
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

  /**
   * Publishes the nanopub, signing it first if it is not signed yet. A nanopub that is already
   * signed has its own signature's key checked against the introductions published on the network.
   *
   * @param server - the registry to publish to
   * @param options - how the signing-key check is run; it warns by default
   * @returns the nanopub's URI, the server, and the server's response
   * @throws if the SPARQL of a grlc query does not parse, if the server refuses the nanopub, or, in `strict` mode, if the key cannot be attributed
   */
  async publish(
    server: string = TEST_NANOPUB_REGISTRY_URL,
    options: KeyCheckOptions = {},
  ): Promise<{ uri: string; server: string; response: Response }> {
    // Refused before any server is contacted: a query published with broken
    // SPARQL can never run, and cannot be corrected afterwards.
    await this.checkSparql('published');

    // check if signed
    if (!this._rdf) {
      if (typeof this.sign === 'function') {
        await this.sign(options);
      } else {
        throw new Error('Nanopub is not signed and cannot be signed');
      }
    } else {
      await enforceSigningKeyCheck(
        this.signatureValue('signedBy'),
        this.signatureValue('hasPublicKey'),
        this.assertion,
        'published',
        options,
      );
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
