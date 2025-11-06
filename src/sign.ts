import type { Nanopub, Profile } from './types';

export async function sign(np: Nanopub, profile: Profile): Promise<Nanopub> {
  // TODO: integrate nanopub-rs WASM
  return {
    ...np,
    signature: 'signed-placeholder'
  };
}
