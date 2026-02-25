import { DataFactory, NamedNode } from 'n3';

const { namedNode } = DataFactory;

const ns = (prefix: string) => (local: string): NamedNode =>
  namedNode(`${prefix}${local}`);

export const RDF = ns('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
export const XSD = ns('http://www.w3.org/2001/XMLSchema#');
export const NP = ns('http://www.nanopub.org/nschema#');
export const NPX = ns('http://purl.org/nanopub/x/');
export const PROV = ns('http://www.w3.org/ns/prov#');
