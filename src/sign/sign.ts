import type { Term, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph } from '@rdfjs/types';
import { DataFactory, Store } from 'n3';
import { getCryptoAdapter } from "./crypto";
import { parse, serialize } from '../serialize';
import { replaceBnodes, normalizeDataset } from './utils';
import { DEFAULT_NANOPUB_URI, TRUSTY_BASE } from '../constants';
import { NPX, RDF, NP } from '../vocab';
import { makeTrusty } from './trusty';

const { namedNode, literal, quad } = DataFactory;

function detectNanopubBaseUri(dataset: Store): string {
  const typeQuads = dataset.getQuads(null, RDF('type'), NP('Nanopublication'), null);
  if (typeQuads.length > 0) {
    const uri = typeQuads[0].subject.value;
    return uri.endsWith('/') ? uri : `${uri}/`;
  }
  return DEFAULT_NANOPUB_URI;
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

        // Exact match: "http://purl.org/nanopub/temp/np/" → "https://w3id.org/np/RAtest123/"
        if (val === oldBaseWithSlash) {
          return namedNode(newBaseWithSlash);
        }

        // Exact match: "http://purl.org/nanopub/temp/np" → "https://w3id.org/np/RAtest123"
        if (val === oldBaseNoSlash) {
          return namedNode(newBaseNoSlash);
        }

        // Starts with namespace: "http://purl.org/nanopub/temp/np/Head" → "https://w3id.org/np/RAtest123/Head"
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

  const adapter = await getCryptoAdapter();
  const publicKeyBase64 = await adapter.extractPublicKey(privateKeyBase64);

  const quads = parse(trig, 'trig');
  let dataset: Store = new Store(quads);
  const placeholder = detectNanopubBaseUri(dataset);
  const placeholderNoSlash = placeholder.replace(/\/$/, '');

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

  // Step 1: normalize without signature (using placeholder URIs)
  const normalizedForSignature = normalizeDataset(dataset, placeholder, TRUSTY_BASE, '/');
  const signature = await adapter.sign(normalizedForSignature, privateKeyBase64);

  // Step 2: add hasSignature (still with placeholder URIs)
  dataset.addQuad(quad(sigNode, NPX('hasSignature'), literal(signature), pubinfoGraph));

  // Step 3: normalize WITH signature > compute trusty hash
  const normalizedForTrusty = normalizeDataset(dataset, placeholder, TRUSTY_BASE, '/');
  const artifactCode = await makeTrusty(normalizedForTrusty);
  // Use the input's own base for the trusty URI. Remap to TRUSTY_BASE when:
  // - input is the default temp placeholder, or
  // - input is already a trusty URI (starts with TRUSTY_BASE) to avoid double-nesting.
  const trustyBase = (placeholder === DEFAULT_NANOPUB_URI || placeholder.startsWith(TRUSTY_BASE))
    ? TRUSTY_BASE
    : placeholder;
  const trustyUri = `${trustyBase}${artifactCode}`;

  // Step 4: replace placeholder URIs with trusty URI
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
