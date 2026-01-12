import type { Quad } from 'rdf-js';

export interface Profile {
  id: string;
  privateKey?: string;
  publicKey?: string;
}

export interface NanopubOptions {
  attribution?: string;
  provenance?: string;
  derivation?: string;
  timestamp?: Date;
  server?: string;

  privateKey?: string;
  name?: string;
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

export interface Nanopub {
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  head: Quad[];
  signature?: string;
  sourceUri?: string;
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