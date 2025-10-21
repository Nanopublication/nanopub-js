import { Writer, Parser } from 'n3';
export function serialize(np, format = 'trig') {
    const writer = new Writer({ format });
    writer.addQuads([...np.assertion, ...np.provenance, ...np.pubinfo]);
    let output = '';
    writer.end((err, result) => { output = result; });
    return output;
}
export function parse(input, format = 'trig') {
    const parser = new Parser({ format });
    return parser.parse(input);
}
