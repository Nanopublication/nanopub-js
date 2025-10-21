export async function sign(np, profile) {
    // TODO: integrate nanopub-rs WASM
    return {
        ...np,
        signature: 'signed-placeholder'
    };
}
