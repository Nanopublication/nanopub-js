import type { Term, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph } from '@rdfjs/types';
import { DataFactory, Store } from 'n3';
import { getCryptoAdapter } from "./crypto";
import { parse, serialize } from '../serialize';
import { replaceBnodes, normalizeDataset } from './utils';
import { DEFAULT_NANOPUB_URI, TRUSTY_BASE } from '../constants';
import { NPX, RDF, NP, DCT, XSD } from '../vocab';
import { makeTrusty } from './trusty';

const { namedNode, literal, quad } = DataFactory;

/**
 * Removes "ARTIFACTCODE-PLACEHOLDER" (deprecated) and "~~~ARTIFACTCODE~~~" placeholders
 * and ensures baseUri ends in slash.
 */
function expandBaseUri(baseUri: string): string {

  // Deprecated (we should only use "~~~ARTIFACTCODE~~~" in the future):
  baseUri = baseUri.replace(/ARTIFACTCODE-PLACEHOLDER[.#/]?$/, '');

  baseUri = baseUri.replace(/~~~ARTIFACTCODE~~~[.#/]?$/, '');
  return ensureTrailingSlash(baseUri);
}

export function ensureTrailingSlash(uri: string) {
  // Ensure trailing slash if ends with an alphanumeric character, hyphen, or underscore
  return /[A-Za-z0-9\-_]$/.test(uri) ? uri + '/' : uri
}

export function detectNanopubBaseUri(dataset: Store): { placeholder: string; trustyBase: string, existingTrustyUri?: string } {
  const typeQuads = dataset.getQuads(null, RDF('type'), NP('Nanopublication'), null);
  const uri = typeQuads[0]?.subject.value;
  if (uri && ensureTrailingSlash(uri) !== DEFAULT_NANOPUB_URI) {
    // Detect whether it is already a trusty URI (RA/RB/FA + 43 base64url chars).
    // If so, return the prefix before the artifact code as trustyBase.
    const match = uri.match(/\/(RA|RB|FA)([A-Za-z0-9_-]{43})(?=[/#]|$)/);
    let placeholder = match ? uri.substring(0, match.index! + 1) : uri;
    placeholder = ensureTrailingSlash(placeholder);
    return { placeholder, trustyBase: expandBaseUri(placeholder), existingTrustyUri: match ? ensureTrailingSlash(uri) : undefined };
  }
  return { placeholder: DEFAULT_NANOPUB_URI, trustyBase: TRUSTY_BASE, existingTrustyUri: undefined };
}

function replaceNanopubUri(dataset: Store, oldBase: string, newBase: string): Store {
  const out = new Store();
  // Accept both / and # as input separators; always output with / separator.
  const oldBaseWithSep = (oldBase.endsWith('/') || oldBase.endsWith('#')) ? oldBase : `${oldBase}/`;
  const oldBaseNoSep = oldBase.replace(/[/#]$/, '');
  const newBaseNoSlash = newBase.replace(/\/$/, '');
  const newBaseWithSlash = newBaseNoSlash + '/';

  for (const q of dataset) {
    const rewrite = (term: Term): Term => {
      if (term.termType === 'NamedNode') {
        const val = term.value;

        // Exact match for top-level nanopub URI
        if (val === oldBaseWithSep || val === oldBaseNoSep) {
          return namedNode(newBase);
        }

        // Sub-resources (subgraphs, sig node, etc.) — output always uses /
        if (val.startsWith(oldBaseWithSep)) {
          return namedNode(newBaseWithSlash + val.slice(oldBaseWithSep.length));
        }
      }
      return term;
    };
    out.addQuad(quad(
      rewrite(q.subject) as Quad_Subject,
      rewrite(q.predicate) as Quad_Predicate,
      rewrite(q.object) as Quad_Object,
      rewrite(q.graph) as Quad_Graph,
    ));
  }
  return out;
}

export async function sign(
  trig: string,
  privateKeyBase64: string,
  orcid?: string,
): Promise<{ signedRdf: string; sourceUri: string; signature: string }> {

  const adapter = await getCryptoAdapter();
  const publicKeyBase64 = await adapter.extractPublicKey(privateKeyBase64);

  const quads = parse(trig, 'trig');
  let dataset: Store = new Store(quads);
  // detectNanopubBaseUri always returns a baseUri ending in '/'.
  // For case C (re-signing an existing trusty nanopub), it also returns the trustyUri.
  const { placeholder, trustyBase, existingTrustyUri } = detectNanopubBaseUri(dataset);
  const placeholderNoSlash = placeholder.replace(/\/$/, '');

  if (existingTrustyUri) {
    // Case C: replace the existing trusty URI with the detected base prefix so
    // the rest of the signing logic can treat it like a fresh placeholder.
    const existingTrustyUriNoSlash = existingTrustyUri.replace(/\/$/, '');
    trig = trig.replace(new RegExp(existingTrustyUriNoSlash, 'g'), placeholderNoSlash);
    const replacedQuads = parse(trig, 'trig');
    dataset = new Store(replacedQuads);
  }

  dataset = replaceBnodes(dataset, placeholder);

  const pubinfoGraph = namedNode(`${placeholder}pubinfo`);
  const sigNode = namedNode(`${placeholder}sig`);

  // Strip any existing signature quads so that re-signing a loaded nanopub
  // does not leave duplicate hasPublicKey / hasSignature triples.
  for (const pred of [NPX('hasAlgorithm'), NPX('hasPublicKey'), NPX('hasSignature'), NPX('hasSignatureTarget'), NPX('signedBy')]) {
    for (const q of dataset.getQuads(null, pred, null, pubinfoGraph)) {
      dataset.removeQuad(q);
    }
  }

  dataset.addQuad(quad(sigNode, NPX('hasAlgorithm'), literal('RSA'), pubinfoGraph));
  dataset.addQuad(quad(sigNode, NPX('hasPublicKey'), literal(publicKeyBase64), pubinfoGraph));
  dataset.addQuad(quad(sigNode, NPX('hasSignatureTarget'), namedNode(placeholderNoSlash), pubinfoGraph));
  if (orcid) {
    dataset.addQuad(quad(sigNode, NPX('signedBy'), namedNode(orcid), pubinfoGraph));
  }

  // The nanopub subject can appear with or without the trailing separator.
  // placeholder always ends with '/' now; also check the no-sep form.
  const nanopubSubjectWithSep = namedNode(placeholder);
  const nanopubSubjectNoSep = namedNode(placeholderNoSlash);

  const creatorExists =
    dataset.getQuads(nanopubSubjectWithSep, DCT('creator'), null, pubinfoGraph).length > 0 ||
    dataset.getQuads(nanopubSubjectNoSep, DCT('creator'), null, pubinfoGraph).length > 0;
  const createdExists =
    dataset.getQuads(nanopubSubjectWithSep, DCT('created'), null, pubinfoGraph).length > 0 ||
    dataset.getQuads(nanopubSubjectNoSep, DCT('created'), null, pubinfoGraph).length > 0;

  // Add dct:creator and dct:created if not already present (mirrors nanopub-rs behaviour).
  if (orcid && !creatorExists) {
    dataset.addQuad(quad(nanopubSubjectWithSep, DCT('creator'), namedNode(orcid), pubinfoGraph));
  }
  if (!createdExists) {
    dataset.addQuad(quad(nanopubSubjectWithSep, DCT('created'), literal(new Date().toISOString(), XSD('dateTime')), pubinfoGraph));
  }

  // Step 1: normalize without signature (using placeholder URIs)
  const normalizedForSignature = normalizeDataset(dataset, placeholder, trustyBase);
  const signature = await adapter.sign(normalizedForSignature, privateKeyBase64);

  // Step 2: add hasSignature (still with placeholder URIs)
  dataset.addQuad(quad(sigNode, NPX('hasSignature'), literal(signature), pubinfoGraph));

  // Step 3: normalize WITH signature > compute trusty hash
  const normalizedForTrusty = normalizeDataset(dataset, placeholder, trustyBase);
  const artifactCode = await makeTrusty(normalizedForTrusty);

  const trustyBaseNoSlash = trustyBase.replace(/\/$/, '');
  const trustyUri = `${trustyBaseNoSlash}/${artifactCode}`;

  dataset = replaceNanopubUri(dataset, placeholder, trustyUri);

  const trustyPubinfoGraph = namedNode(`${trustyUri}/pubinfo`);

  const headQuads = [...dataset.getQuads(null, null, null, namedNode(`${trustyUri}/Head`))];
  const assertionQuads = [...dataset.getQuads(null, null, null, namedNode(`${trustyUri}/assertion`))];
  const provenanceQuads = [...dataset.getQuads(null, null, null, namedNode(`${trustyUri}/provenance`))];
  const pubinfoQuads = [...dataset.getQuads(null, null, null, trustyPubinfoGraph)];

  const signedRdf = await serialize(
    { head: headQuads, assertion: assertionQuads, provenance: provenanceQuads, pubinfo: pubinfoQuads, sourceUri: trustyUri },
    'trig',
    trustyUri,
  );

  return { signedRdf, sourceUri: trustyUri, signature };
}
