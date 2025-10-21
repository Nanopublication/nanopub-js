export class NanopubClient {
    constructor(config) {
        this.server = config?.useServer ?? 'https://nanopub.example.org';
    }
    async publish(np) {
        // TODO: POST nanopub to server
        return `${this.server}/${np.id}`;
    }
    async fetch(uri) {
        // TODO: GET nanopub from server
        return {
            id: uri.split('/').pop(),
            assertion: [],
            provenance: [],
            pubinfo: []
        };
    }
    async query(query) {
        // TODO: implement server query
        return [];
    }
}
