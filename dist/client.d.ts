import type { Nanopub } from './types';
export declare class NanopubClient {
    server: string;
    constructor(config?: {
        useServer?: string;
    });
    publish(np: Nanopub): Promise<string>;
    fetch(uri: string): Promise<Nanopub>;
    query(query: {
        text?: string;
        sparql?: string;
    }): Promise<Nanopub[]>;
}
