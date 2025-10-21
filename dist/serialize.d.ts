import { Quad } from 'n3';
import type { Nanopub } from './types';
export declare function serialize(np: Nanopub, format?: 'trig' | 'turtle' | 'jsonld'): string;
export declare function parse(input: string, format?: 'trig' | 'turtle' | 'jsonld'): Quad[];
