import type { Term, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph } from '@rdfjs/types';
import { DataFactory, Store } from 'n3';
import { getCryptoAdapter } from "./crypto";
import { parse, serialize } from '../serialize';
import { replaceBnodes, normalizeDataset } from './utils';
import { DEFAULT_NANOPUB_URI, TRUSTY_BASE } from '../constants';
import { NPX, RDF, NP } from '../vocab';
import { makeTrusty } from './trusty';

const { namedNode, literal, quad } = DataFactory;

export function detectNanopubBaseUri(dataset: Store): {baseUri: string, trustyUri?: string} {
  const typeQuads = dataset.getQuads(null, RDF('type'), NP('Nanopublication'), null);
  if (typeQuads.length > 0) {
    const uri = typeQuads[0].subject.value;
    // Detect whether it is a trusty URI, if so return the prefix, otherwise the placeholder
    const match = uri.match(/\/(RA|RB|FA)([A-Za-z0-9_-]{43})(?=[/#]|$)/);
    let baseUri = match ? uri.substring(0, match.index! + 1) : uri;
    baseUri = baseUri.endsWith('/') ? baseUri : `${baseUri}/`;
    return { baseUri, trustyUri: match ? uri : undefined };
  }
  return { baseUri: DEFAULT_NANOPUB_URI, trustyUri: undefined };
}

function replaceNanopubUri(dataset: Store, oldBase: string, newBase: string): Store {
  const out = new Store();
  const oldBaseWithSlash = oldBase.endsWith('/') ? oldBase : `${oldBase}/`;
  const oldBaseNoSlash = oldBase.replace(/\/$/, '');
  const newBaseNoSlash = newBase.replace(/\/$/, '');
  const newBaseWithSlash = newBaseNoSlash + '/';

  for (const q of dataset) {
    const rewrite = (term: Term): Term => {
      if (term.termType === 'NamedNode') {
        const val = term.value;

        // Exact match for top-level nanopub URI > no slash
        if (val === oldBaseWithSlash || val === oldBaseNoSlash) {
          return namedNode(newBase);
        }

        // Anything inside (subgraphs) > keep trailing slash
        if (val.startsWith(oldBaseWithSlash)) {
          return namedNode(val.replace(oldBaseWithSlash, newBaseWithSlash));
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
  // We need to handle 3 major cases of signing a nanopub:
  //  A. Nanopub with the normal DEFAULT_NANOPUB_URI placeholder prefix -> resulting in output with TRUSTY_BASE prefix
  //  B. Nanopub with a custom placeholder prefix -> resulting in output with that placeholder prefix
  //  C. Nanopub which is being re-signed (already has an existingTrustyUri) -> replace the existingTrustyUri with the detected prefix, use the same prefix in the output

  const adapter = await getCryptoAdapter();
  const publicKeyBase64 = await adapter.extractPublicKey(privateKeyBase64);

  const quads = parse(trig, 'trig');
  let dataset: Store = new Store(quads);
  // detectNanopubBaseUri() ensures the baseUri always ends in slash
  const { baseUri: placeholder, trustyUri: existingTrustyUri } = detectNanopubBaseUri(dataset);
  const placeholderNoSlash = placeholder.replace(/\/$/, '');

  if (existingTrustyUri) {
    // For case C. replace the existing trustyUri with the same detected placeholder prefix
    trig = trig.replace(new RegExp(existingTrustyUri, 'g'), placeholderNoSlash)
    const quads = parse(trig, 'trig');
    dataset = new Store(quads);
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

  // For case A. we use TRUSTY_BASE, and for case B. and C. we use the same placeholder
  const trustyBase = (placeholder === DEFAULT_NANOPUB_URI ? TRUSTY_BASE : placeholder)

  // Step 1: normalize without signature (using placeholder URIs)
  const normalizedForSignature = normalizeDataset(dataset, placeholder, trustyBase, '/');
  const signature = await adapter.sign(normalizedForSignature, privateKeyBase64);

  // Step 2: add hasSignature (still with placeholder URIs)
  dataset.addQuad(quad(sigNode, NPX('hasSignature'), literal(signature), pubinfoGraph));

  // Step 3: normalize WITH signature > compute trusty hash
  const normalizedForTrusty = normalizeDataset(dataset, placeholder, trustyBase, '/');
  const artifactCode = await makeTrusty(normalizedForTrusty);

  // Step 4: replace placeholder URIs with trusty URI
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
