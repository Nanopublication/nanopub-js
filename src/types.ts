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
  id: string;
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  signature?: string;
}

export interface QueryTextOptions {
  text: string;
  limit?: number;
  offset?: number;
}

export interface QueryTemplateOptions {
  template: string;
  params?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface QuerySPARQLOptions {
  sparql: string;
  limit?: number;
  offset?: number;
}

export type QueryOptions = QueryTextOptions | QueryTemplateOptions | QuerySPARQLOptions;
