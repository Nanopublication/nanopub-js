import { Writer, Parser, DataFactory, Quad as N3Quad } from 'n3';
import type { Quad as RDFJSQuad } from '@rdfjs/types';
import { DEFAULT_NANOPUB_URI } from './constants';
import { NanopubData } from './types/types';

const { namedNode, quad } = DataFactory;

function toN3Quad(q: RDFJSQuad): N3Quad {
  return quad(q.subject, q.predicate, q.object, q.graph);
}

function rewriteTopLevel(q: RDFJSQuad, thisUri: string): N3Quad {
  const noSlash = thisUri.replace(/\/$/, '');
  if (q.subject.value === noSlash || q.subject.value === noSlash + '/') {
    return quad(namedNode(thisUri), q.predicate, q.object, q.graph);
  }
  return toN3Quad(q);
}

export async function serialize(
  np: NanopubData,
  format: 'trig' | 'turtle' = 'trig',
  nanopubUri: string = np.sourceUri ?? DEFAULT_NANOPUB_URI
): Promise<string> {

  const thisUri = nanopubUri;
  const subUri = thisUri.endsWith('/')  ? thisUri : thisUri + '/';

  const writer = new Writer({
    format,
    prefixes: {
      this: thisUri,
      sub: subUri,
      np: 'http://www.nanopub.org/nschema#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      prov: 'http://www.w3.org/ns/prov#',
      npx: 'http://purl.org/nanopub/x/',
      dc: 'http://purl.org/dc/terms/',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    },
  });

  // Convert all quads to N3 and rewrite top-level subjects
  const quads: N3Quad[] = [
    ...np.head.map(q => rewriteTopLevel(q, thisUri)),
    ...np.assertion.map(q => rewriteTopLevel(q, thisUri)),
    ...np.provenance.map(q => rewriteTopLevel(q, thisUri)),
    ...np.pubinfo.map(q => rewriteTopLevel(q, thisUri)),
  ];

  writer.addQuads(quads);

  // N3.js Writer does not emit empty local names (e.g. 'this:' for a URI that
  // exactly equals the prefix namespace), so we post-process to replace the
  // full nanopub URI with 'this:'. The prefix declaration line ends with '>.'
  // (no space), so the negative lookahead '(?!\.)' leaves it untouched.
  const escapedUri = thisUri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const thisUriPattern = new RegExp(`<${escapedUri}>(?!\\.)`, 'g');

  return new Promise((resolve, reject) => {
    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result.replace(thisUriPattern, 'this:'));
    });
  });
}

/** Turns JSON-LD into quads. n3 does not parse JSON-LD, so callers supply this to read that syntax. */
export type JSONLDParser = (input: string) => RDFJSQuad[];

export type ParseFormat = 'trig' | 'turtle' | 'jsonld';

export interface ParseOptions {
  /** Required for 'jsonld'; ignored for the syntaxes n3 handles */
  parser?: JSONLDParser;
}

export function parse(
  input: string,
  format: ParseFormat = 'trig',
  options: ParseOptions = {},
): N3Quad[] {
  // A missing parser is a caller mistake rather than bad input, so it throws instead of parsing to nothing
  if (format === 'jsonld') {
    if (!options.parser) {
      throw new Error(
        'Parsing JSON-LD needs a parser: pass one as { parser } (n3 does not parse JSON-LD).',
      );
    }
    try {
      return options.parser(input).map(toN3Quad);
    } catch {
      return [];
    }
  }

  try {
    return new Parser({ format }).parse(input);
  } catch {
    return [];
  }
}
