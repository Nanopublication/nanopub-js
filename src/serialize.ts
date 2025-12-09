import { Writer, Parser, Quad } from 'n3';
import { NanopubClass } from './nanopub';

export function serialize(
  np: NanopubClass,
  format: 'trig' | 'turtle' = 'trig',
  baseUrl: string = 'http://temp.nanopub.local/'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({
      format,
      prefixes: {
        this: `${baseUrl}${np.id}#`,
        sub: `${baseUrl}${np.id}-`,
        np: 'http://www.nanopub.org/nschema#',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        prov: 'http://www.w3.org/ns/prov#',
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
