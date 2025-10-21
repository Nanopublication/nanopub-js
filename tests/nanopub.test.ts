import { describe, it, expect } from 'vitest';
import { NanopubClass, serialize, parse, sign, validate } from '../src/index';
import {NamedNode, Quad, DefaultGraph} from 'n3';

describe('Nanopub-ts skeleton', () => {

  it('should create, serialize, parse, sign, and validate a nanopub', async () => {
    const quads: Quad[] = [
      new Quad(
        new NamedNode('http://example.org/s'),
        new NamedNode('http://example.org/p'),
        new NamedNode('http://example.org/o'),
        new DefaultGraph()
      )
    ];

    const np = NanopubClass.create(quads as any);

    expect(np.id).toBeDefined();
    expect(np.assertion.length).toBe(1);

    // Serialize nanopub 
    const trig = await serialize(np, 'trig');
    expect(trig).toContain('http://example.org/s');

    // Parse serialized nanopub back into quads
    const parsedQuads = parse(trig, 'trig');
    expect(parsedQuads.length).toBeGreaterThan(0);

    // Sign nanopub (placeholder)
    const signedNp = await sign(np, { id: 'did:example:alice' });
    expect(signedNp.signature).toBe('signed-placeholder');

    // Validate nanopub (placeholder)
    const result = await validate(signedNp);
    expect(result.structureValid).toBe(true);
    expect(result.signatureValid).toBe(true);
  });

});
