import { getCryptoAdapter } from "./crypto";

export async function makeTrusty(normalized: string): Promise<string> {
  const adapter = await getCryptoAdapter();
  return "RA" + await adapter.sha256Base64Url(normalized);
}
