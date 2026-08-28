import type { Quad } from 'rdf-js';
import type { NanopubData } from './types/types';
import { KPXL_GRLC } from './vocab';
import { getSparqlSyntaxError } from './sparql';

/**
 * The predicate whose object is the SPARQL of a grlc query nanopublication.
 * Which literal holds the query is knowable from this statement alone.
 */
export const GRLC_SPARQL = KPXL_GRLC('sparql');

/** A grlc query statement whose SPARQL does not parse. */
export interface InvalidSparql {
  /** The statement whose object is the broken query. */
  quad: Quad;
  /** What is wrong with it, in terms the author of the query can act on. */
  description: string;
}

/** Every statement of a nanopublication, across its four graphs. */
function getQuads(np: NanopubData): Quad[] {
  return [...np.head, ...np.assertion, ...np.provenance, ...np.pubinfo];
}

/**
 * Finds the grlc queries of a nanopublication whose SPARQL does not parse.
 *
 * A nanopublication cannot be edited after the fact, so such a query is broken
 * permanently: it can never run, and the only remedy is publishing a corrected
 * version. New ones are therefore refused before signing and before publishing,
 * while ones published before this check existed still load and read as before.
 *
 * @param np - The nanopublication to check.
 * @returns One entry per broken query, empty if the nanopublication carries none.
 */
export async function getInvalidSparql(
  np: NanopubData,
): Promise<InvalidSparql[]> {
  const invalid: InvalidSparql[] = [];
  for (const quad of getQuads(np)) {
    if (quad.predicate.value !== GRLC_SPARQL.value) continue;
    if (quad.object.termType !== 'Literal') continue;
    const error = await getSparqlSyntaxError(quad.object.value);
    if (error) {
      invalid.push({
        quad,
        description: `Invalid SPARQL as object of ${GRLC_SPARQL.value}: ${error}`,
      });
    }
  }
  return invalid;
}
