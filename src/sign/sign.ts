import type { Term, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph } from '@rdfjs/types';
import { DataFactory, Store } from 'n3';
import { getCryptoAdapter } from "./crypto";
import { parse, serialize } from '../serialize';
import { replaceBnodes, normalizeDataset } from './utils';
import { DEFAULT_NANOPUB_URI, TRUSTY_BASE } from '../constants';
import { NPX, RDF, NP, DCT, XSD } from '../vocab';
import { makeTrusty } from './trusty';

const { namedNode, literal, quad } = DataFactory;

export function detectNanopubBaseUri(dataset: Store): { baseUri: string; trustyUri?: string } {
  const typeQuads = dataset.getQuads(null, RDF('type'), NP('Nanopublication'), null);
  if (typeQuads.length > 0) {
    const uri = typeQuads[0].subject.value;
    // Detect whether it is already a trusty URI (RA/RB/FA + 43 base64url chars).
    // If so, return the prefix before the artifact code as baseUri.
    const match = uri.match(/\/(RA|RB|FA)([A-Za-z0-9_-]{43})(?=[/#]|$)/);
    let baseUri = match ? uri.substring(0, match.index! + 1) : uri;
    baseUri = (baseUri.endsWith('/') || baseUri.endsWith('#')) ? baseUri : `${baseUri}/`;
    return { baseUri, trustyUri: match ? uri : undefined };
  }
  return { baseUri: DEFAULT_NANOPUB_URI, trustyUri: undefined };
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
  const { baseUri: placeholder, trustyUri: existingTrustyUri } = detectNanopubBaseUri(dataset);
  const placeholderNoSlash = placeholder.replace(/\/$/, '');

  if (existingTrustyUri) {
    // Case C: replace the existing trusty URI with the detected base prefix so
    // the rest of the signing logic can treat it like a fresh placeholder.
    trig = trig.replace(new RegExp(existingTrustyUri, 'g'), placeholderNoSlash);
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

  // Case A: any purl.org/nanopub/temp/ URI (default or hash-style) → remap to TRUSTY_BASE.
  // Case B/C: custom or already-trusty base → keep as-is.
  const trustyBase = placeholder.startsWith('http://purl.org/nanopub/temp/')
    ? TRUSTY_BASE
    : placeholder;

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
