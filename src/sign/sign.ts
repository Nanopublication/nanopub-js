import type { Term, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph } from '@rdfjs/types';
import { DataFactory, Store } from 'n3';
import { getCryptoAdapter } from "./crypto";
import { parse, serialize } from '../serialize';
import { replaceBnodes, normalizeDataset } from './utils';
import { DEFAULT_NANOPUB_URI } from '../constants';
import { makeTrusty } from './trusty';

const { namedNode, literal, quad } = DataFactory;

const TRUSTY_BASE = 'https://w3id.org/np/';

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
  const placeholder = DEFAULT_NANOPUB_URI; // "http://purl.org/nanopub/temp/np/"
  const placeholderNoSlash = placeholder.replace(/\/$/, ''); // "http://purl.org/nanopub/temp/np"

  dataset = replaceBnodes(dataset, placeholder);

  const pubinfoGraph = namedNode(`${placeholder}pubinfo`);
  const sigNode = namedNode(`${placeholder}sig`);

  dataset.addQuad(quad(sigNode, namedNode('http://purl.org/nanopub/x/hasAlgorithm'), literal('RSA'), pubinfoGraph));
  dataset.addQuad(quad(sigNode, namedNode('http://purl.org/nanopub/x/hasPublicKey'), literal(publicKeyBase64), pubinfoGraph));
  dataset.addQuad(quad(sigNode, namedNode('http://purl.org/nanopub/x/hasSignatureTarget'), namedNode(placeholderNoSlash), pubinfoGraph));

  if (orcid) {
    dataset.addQuad(quad(sigNode, namedNode('http://purl.org/nanopub/x/signedBy'), namedNode(orcid), pubinfoGraph));
  }

  // Step 1: normalize without signature (using placeholder URIs)
  const normalizedForSignature = normalizeDataset(dataset, placeholder, TRUSTY_BASE, '/');
  const signature = await adapter.sign(normalizedForSignature, privateKeyBase64);

  // Step 2: add hasSignature (still with placeholder URIs)
  dataset.addQuad(quad(sigNode, namedNode('http://purl.org/nanopub/x/hasSignature'), literal(signature), pubinfoGraph));

  // Step 3: normalize WITH signature > compute trusty hash
  const normalizedForTrusty = normalizeDataset(dataset, placeholder, TRUSTY_BASE, '/');
  const artifactCode = await makeTrusty(normalizedForTrusty);
  const trustyUri = `${TRUSTY_BASE}${artifactCode}`;

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
