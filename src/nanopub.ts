import { NanopubOptions, Nanopub } from './types';
import { Parser, Quad } from 'n3';

export class NanopubClass implements Nanopub {
  id: string;
  assertion: Quad[];
  provenance: Quad[];
  pubinfo: Quad[];
  signature?: string;

  constructor(quads: Quad[] = [], id?: string, options?: NanopubOptions) {
    this.id = id ?? crypto.randomUUID();
    this.assertion = quads;
    this.provenance = [];
    this.pubinfo = [];
  }

  static create(quads: Quad[] | string, options?: NanopubOptions): NanopubClass {
    let parsedQuads: Quad[] = [];
    if (typeof quads === 'string') {
      const parser = new Parser({ format: 'application/trig' });
      parsedQuads = parser.parse(quads);
    } else {
      parsedQuads = quads;
    }
    return new NanopubClass(parsedQuads, undefined, options);
  }
}
