export async function sign(
  rdf: string,
  privateKey: string,
  orcid: string,
  name: string
): Promise<{ signedRdf: string; sourceUri: string; signature: string }> {
  const { Nanopub, NpProfile } = (await import("@nanopub/sign/bundler.js"));

  const wasmNp = new Nanopub(rdf);
  const signed = wasmNp.sign(new NpProfile(privateKey, orcid, name));

  return {
    signedRdf: signed.rdf(),
    sourceUri: signed.info().uri,
    signature: signed.info().signature,
  };
}
