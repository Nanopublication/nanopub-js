import { NanopubOptions, Nanopub } from './types';
import { Quad } from 'n3';
export declare class NanopubClass implements Nanopub {
    id: string;
    assertion: Quad[];
    provenance: Quad[];
    pubinfo: Quad[];
    signature?: string;
    constructor(quads?: Quad[], id?: string, options?: NanopubOptions);
    static create(quads: Quad[] | string, options?: NanopubOptions): NanopubClass;
}
