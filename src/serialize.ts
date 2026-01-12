import { Writer, Parser, Quad } from 'n3';
import { DEFAULT_NANOPUB_URI } from './constants';
import { Nanopub } from './types/types';

export function serialize(
  np: Nanopub,
  format: 'trig' | 'turtle' = 'trig',
  nanopubUri: string = np.sourceUri ?? DEFAULT_NANOPUB_URI
): Promise<string> {
  return new Promise((resolve, reject) => {
    const subUri = nanopubUri == DEFAULT_NANOPUB_URI ? nanopubUri : nanopubUri + '/'; 
    const writer = new Writer({
      format,
      prefixes: {
        this: nanopubUri,
        sub: subUri,
        np: 'http://www.nanopub.org/nschema#',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        prov: 'http://www.w3.org/ns/prov#',
        npx: 'http://purl.org/nanopub/x/',
      },
    });

    writer.addQuads([...np.head, ...np.assertion, ...np.provenance, ...np.pubinfo]);

    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export function parse(
  input: string,
  format: 'trig' | 'turtle' | 'jsonld' = 'trig'
): Quad[] {
  try {
    const parser = new Parser({ format });
    const quads = parser.parse(input); 
    return quads;
  } catch (err) {
    console.error("Error parsing RDF:", err);
    return [];
  }
}
