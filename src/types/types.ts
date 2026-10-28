import type { Quad } from '@rdfjs/types';

export interface Profile {
  id: string;
  privateKey?: string;
  publicKey?: string;
}

export interface NanopubOptions {
  /** Extra TriG prefixes for output, on top of the defaults; `this` and `sub` cannot be set */
  prefixes?: Record<string, string>;
  attribution?: string;
  provenance?: string;
  derivation?: string;
  /** Creation time, added to the pubinfo when signing if it has none; defaults to now */
  timestamp?: Date;
  server?: string;

  privateKey?: string;
  name?: string;
  /**
   * IRI of the signer, typically an ORCID iD. It may also be a sub-IRI of the
   * nanopub being signed, to self-sign an agent's own introduction.
   */
  orcid?: string;
  email?: string;
}

export interface ValidationOptions {
  shaclShapes?: Quad[] | string;
}

export interface ValidationResult {
  structureValid: boolean;
  signatureValid: boolean;
  shaclValid?: boolean;
  errors?: string[];
}

export interface NanopubData {
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  head: Quad[];
  signature?: string;
  sourceUri?: string;
  prefixes?: Record<string, string>;
}

export interface QueryTextOptions {
  text: string;
  limit?: number;
  offset?: number;
}

export interface QueryTemplateOptions {
  template: string;
  params?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface QuerySPARQLOptions {
  sparql: string;
  limit?: number;
  offset?: number;
}

export type QueryOptions = QueryTextOptions | QueryTemplateOptions | QuerySPARQLOptions;

export type SparqlBindingValue = {
  type: string;
  value: string;
  'xml:lang'?: string;
  datatype?: string;
};

export type SparqlBinding = Record<string, SparqlBindingValue>;

export type SparqlJsonResult = {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
};