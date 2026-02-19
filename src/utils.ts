import { DataFactory, NamedNode } from "n3";
const { namedNode } = DataFactory;

export function makeNamedGraphNode(npUri: string, suffix: string): NamedNode {
  if (suffix === '') return namedNode(npUri);

  return namedNode(npUri + suffix);
}

/**
 * Create nanopub graph URIs from a base URI
 * @param baseUri - The nanopub base URI (with or without trailing slash)
 * @returns Object containing all standard nanopub URIs
 */
export function createNanopubGraphs(baseUri: string) {
  // Ensure we have a version with trailing slash for graph names
  const baseWithSlash = baseUri.endsWith('/') ? baseUri : `${baseUri}/`;
  
  return {
    // Main nanopub node (without slash)
    npNode: namedNode(baseUri.replace(/\/$/, '')),
    
    // Graph nodes (with slash separator)
    headGraph: namedNode(`${baseWithSlash}Head`),
    assertionGraph: namedNode(`${baseWithSlash}assertion`),
    provenanceGraph: namedNode(`${baseWithSlash}provenance`),
    pubinfoGraph: namedNode(`${baseWithSlash}pubinfo`),
  };
}
