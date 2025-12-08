import { Writer, Parser, Quad } from 'n3';
import type { Nanopub } from './types';

export function serialize(np: Nanopub, format: 'trig' | 'turtle' | 'jsonld' = 'trig'): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ format });
    writer.addQuads([...np.assertion, ...np.provenance, ...np.pubinfo]);
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
