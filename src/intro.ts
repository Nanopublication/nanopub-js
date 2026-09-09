import { DataFactory, Quad } from 'n3';
import { Nanopub } from './nanopub';
import { getCryptoAdapter } from './sign/crypto';
import { createNanopubGraphs } from './utils';
import { DEFAULT_NANOPUB_URI, CC0_LICENSE } from './constants';
import { DCT, FOAF, NPX, PROV, RDFS } from './vocab';

const { namedNode, literal, quad } = DataFactory;

export interface KeyDeclaration {
  /** Base64 DER SubjectPublicKeyInfo, as recorded in `npx:hasPublicKey` */
  publicKey: string;
  /** Defaults to RSA, the only algorithm the network verifies today */
  algorithm?: string;
  /** Optional `npx:hasKeyLocation`, for a key held by a known service */
  keyLocation?: string;
}

export interface IntroNanopubOptions {
  /** IRI of the agent being introduced, such as an ORCID iD or a WebID */
  agent: string;
  /** Signs the introduction; the public key is derived from it unless given */
  privateKey: string;
  /** Declared alongside `privateKey`; derived from it when omitted */
  publicKey?: string;
  /** Declares several keys at once, in place of `publicKey` */
  keys?: KeyDeclaration[];
  keyLocation?: string;
  /** `foaf:name` of the agent, which registries use to label the account */
  name?: string;
  license?: string;
}

function keyDeclarationNode(index: number, total: number) {
  const suffix = total > 1 ? `keyDeclaration${index + 1}` : 'keyDeclaration';
  return namedNode(`${DEFAULT_NANOPUB_URI}${suffix}`);
}

/** Builds an unsigned introduction nanopub announcing an agent's public key. Trust is per key, so a further introduction under the same agent adds another. */
export async function createIntroNanopub(
  options: IntroNanopubOptions,
): Promise<Nanopub> {
  const { agent, privateKey, name, license = CC0_LICENSE } = options;

  if (!agent) throw new Error('An agent IRI is required to introduce a key.');
  if (!privateKey) throw new Error('A private key is required to sign an introduction.');

  const declarations: KeyDeclaration[] =
    options.keys ?? [
      {
        publicKey:
          options.publicKey ??
          (await (await getCryptoAdapter()).extractPublicKey(privateKey)),
        keyLocation: options.keyLocation,
      },
    ];

  if (!declarations.length) {
    throw new Error('At least one key declaration is required.');
  }

  const { npNode, assertionGraph } = createNanopubGraphs(DEFAULT_NANOPUB_URI);
  const agentNode = namedNode(agent);

  const assertion: Quad[] = [];

  if (name) {
    assertion.push(quad(agentNode, FOAF('name'), literal(name)));
  }

  declarations.forEach((declaration, index) => {
    if (!declaration.publicKey) {
      throw new Error('Each key declaration needs a public key.');
    }
    const node = keyDeclarationNode(index, declarations.length);
    assertion.push(
      quad(node, NPX('declaredBy'), agentNode),
      quad(node, NPX('hasAlgorithm'), literal(declaration.algorithm ?? 'RSA')),
      quad(node, NPX('hasPublicKey'), literal(declaration.publicKey)),
    );
    if (declaration.keyLocation) {
      assertion.push(
        quad(node, NPX('hasKeyLocation'), namedNode(declaration.keyLocation)),
      );
    }
  });

  const provenance: Quad[] = [
    quad(assertionGraph, PROV('wasAttributedTo'), agentNode),
  ];

  // npx:introduces names the agent, not the key declaration, and is how readers recognize an introduction
  const pubinfo: Quad[] = [
    quad(npNode, NPX('introduces'), agentNode),
    quad(npNode, NPX('hasNanopubType'), NPX('declaredBy')),
    quad(npNode, DCT('creator'), agentNode),
    quad(npNode, DCT('license'), namedNode(license)),
  ];

  if (name) {
    pubinfo.push(
      quad(agentNode, FOAF('name'), literal(name)),
      quad(npNode, RDFS('label'), literal(`User: ${name}`)),
    );
  }

  return new Nanopub({
    assertion,
    provenance,
    pubinfo,
    // Self-signed: the key it declares signs it
    options: { privateKey, orcid: agent, name },
  });
}
