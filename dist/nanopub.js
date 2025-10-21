import { Parser } from 'n3';
export class NanopubClass {
    constructor(quads = [], id, options) {
        this.id = id ?? crypto.randomUUID();
        this.assertion = quads;
        this.provenance = [];
        this.pubinfo = [];
    }
    static create(quads, options) {
        let parsedQuads = [];
        if (typeof quads === 'string') {
            const parser = new Parser({ format: 'application/trig' });
            parsedQuads = parser.parse(quads);
        }
        else {
            parsedQuads = quads;
        }
        return new NanopubClass(parsedQuads, undefined, options);
    }
}
