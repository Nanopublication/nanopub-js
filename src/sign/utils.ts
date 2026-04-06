import type {
  DatasetCore,
  Term,
  Quad,
  Quad_Subject,
  Quad_Object,
  Quad_Graph,
  NamedNode,
} from "@rdfjs/types";
import { DataFactory, Store } from "n3";
import { NanopubData } from "../types/types";

const { namedNode, quad } = DataFactory;


export class NpError extends Error {}


function isIri(term: Term): term is NamedNode {
  return term.termType === "NamedNode";
}


function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceUriInDataset(
  dataset: DatasetCore,
  oldUri: string,
  newUri: string
) {
  const quadsToAdd: Quad[] = [];
  const quadsToRemove: Quad[] = [];

  for (const q of dataset) {
    let changed = false;

    const rewrite = (term: Term): Term => {
      if (term.termType === "NamedNode" && term.value.startsWith(oldUri)) {
        changed = true;
        return namedNode(term.value.replace(oldUri, newUri));
      }
      return term;
    };

    const subject = rewrite(q.subject) as Quad_Subject;
    const predicate = rewrite(q.predicate) as NamedNode;
    const object = rewrite(q.object) as Quad_Object;
    const graph = rewrite(q.graph) as Quad_Graph;

    if (changed) {
      quadsToRemove.push(q);
      quadsToAdd.push(quad(subject, predicate, object, graph));
    }
  }

  for (const q of quadsToRemove) dataset.delete(q);
  for (const q of quadsToAdd) dataset.add(q);
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function quadSortKey(q: Quad): string[] {
  return [
    q.graph.termType === "DefaultGraph" ? "" : q.graph.value,
    q.subject.value,
    q.predicate.value,
    q.object.termType === "Literal" ? q.object.language ?? "" : "",
    q.object.termType === "Literal" ? q.object.datatype?.value ?? "" : "",
    q.object.termType === "Literal" ? q.object.value : q.object.value,
  ];
}

export function replaceBnodes(
  dataset: DatasetCore,
  baseUri: string,
): Store {
  const out = new Store();

  const quads = [...dataset].sort((a, b) => {
    const ka = quadSortKey(a);
    const kb = quadSortKey(b);
    for (let i = 0; i < ka.length; i++) {
      const c = cmp(ka[i], kb[i]);
      if (c !== 0) return c;
    }
    return 0;
  });

  const bnodeMap = new Map<string, number>();
  let counter = 1;

  const re = new RegExp(
    `${escapeRegExp(baseUri)}([#/_])(_+[A-Za-z0-9^_]+)$`
  );

  const mapBnode = (id: string) => {
    if (!bnodeMap.has(id)) bnodeMap.set(id, counter++);
    return namedNode(`${baseUri}_${bnodeMap.get(id)}`);
  };

  function mapSubject(term: Quad_Subject): Quad_Subject {
    if (term.termType === "BlankNode") {
      return mapBnode(term.value);
    }

    const m = term.value.match(re);
    if (m) {
      const newEnd = m[2].replace("_", "__");
      return namedNode(
        term.value.slice(0, term.value.length - m[2].length) + newEnd
      );
    }

    return term;
  }

  function mapObject(term: Quad_Object): Quad_Object {
    if (term.termType === "BlankNode") {
      return mapBnode(term.value);
    }

    if (term.termType === "NamedNode") {
      const m = term.value.match(re);
      if (m) {
        const newEnd = m[2].replace("_", "__");
        return namedNode(
          term.value.slice(0, term.value.length - m[2].length) + newEnd
        );
      }
    }

    return term; // literals untouched
  }

  function mapGraph(term: Quad_Graph): Quad_Graph {
    if (term.termType === "DefaultGraph") return term;

    const m = term.value.match(re);
    if (m) {
      const newEnd = m[2].replace("_", "__");
      return namedNode(
        term.value.slice(0, term.value.length - m[2].length) + newEnd
      );
    }

    return term;
  }

  for (const q of quads) {
    out.addQuad(
      quad(
        mapSubject(q.subject),
        q.predicate,
        mapObject(q.object),
        mapGraph(q.graph)
      )
    );
  }

  return out;
}

interface NormQuad {
  graph: string;
  subject: string;
  predicate: string;
  object: string;
  datatype: string;
  lang: string;
}

export function normalizeDataset(
  dataset: DatasetCore,
  baseNs: string,
  normNs: string,
): string {
  const normUri = `${normNs} `;
  const rows: NormQuad[] = [];

  // Accept both / and # as natural separators; strip either.
  const baseWithSep = (baseNs.endsWith('/') || baseNs.endsWith('#')) ? baseNs : `${baseNs}/`;
  const baseNoSep = baseNs.replace(/[/#]$/, '');

  // Replace the artifact-code/placeholder part with a space, keeping the
  // separator before the local name — mirroring trusty-uri-java's
  // `uri.replace(artifactCode, " ")`:
  //   base/RAxx/Head  →  normUri + "/" + "Head"  =  "https://w3id.org/np/ /Head"
  //   base/RAxx#Head  →  normUri + "#" + "Head"  =  "https://w3id.org/np/ #Head"
  //
  // External references to OTHER trusty nanopubs share the same base prefix
  // but have an artifact code as their local name (e.g. http://purl.org/np/RARv1-...).
  // These must NOT be normalized — only the current nanopub's own URIs are touched.
  const ARTIFACT_CODE_RE = /^(RA|RB|FA)[A-Za-z0-9_-]{43}([/#]|$)/;
  const baseHashSep = baseNoSep + '#';
  const normalizeUri = (value: string): string => {
    if (value === baseWithSep || value === baseNoSep) return normUri;
    if (value.startsWith(baseWithSep)) {
      const local = value.slice(baseWithSep.length);
      if (ARTIFACT_CODE_RE.test(local)) return value; // external trusty reference
      return normUri + '/' + local;
    }
    if (value.startsWith(baseHashSep)) {
      const local = value.slice(baseHashSep.length);
      if (ARTIFACT_CODE_RE.test(local)) return value;
      return normUri + '#' + local;
    }
    return value;
  };

  for (const q of dataset) {
    if (
      q.subject.termType !== "NamedNode" ||
      q.predicate.termType !== "NamedNode" ||
      (q.graph.termType !== "DefaultGraph" && q.graph.termType !== "NamedNode")
    ) {
      throw new NpError("normalizeDataset requires blank nodes to be replaced first");
    }

    const graph = q.graph.termType === "DefaultGraph" ? "" : normalizeUri(q.graph.value);
    const subject = normalizeUri(q.subject.value);
    const predicate = normalizeUri(q.predicate.value);

    let object: string;
    let datatype = "";
    let lang = "";

    if (isIri(q.object)) {
      object = normalizeUri(q.object.value);
    } else {
      object = q.object.value
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n");

      if (q.object.termType === "Literal") {
        datatype = q.object.datatype?.value ?? "";
        lang = q.object.language ?? "";
      }
    }

    rows.push({ graph, subject, predicate, object, datatype, lang });
  }

  rows.sort((a, b) =>
    cmp(a.graph, b.graph) ||
    cmp(a.subject, b.subject) ||
    cmp(a.predicate, b.predicate) ||
    cmp(a.lang, b.lang) ||
    cmp(a.datatype, b.datatype) ||
    cmp(a.object, b.object)
  );

  const lines: string[] = [];

  for (const r of rows) {
    lines.push(r.graph);
    lines.push(r.subject);
    lines.push(r.predicate);
  
    if (r.lang) {
      lines.push(`@${r.lang} ${r.object}`);
    } else if (r.datatype) {
      lines.push(`^${r.datatype} ${r.object}`);
    } else {
      lines.push(r.object);
    }
  }
  
  return lines.join("\n") + "\n";
}

export function stripTrigComments(input: string): string {
  return input
    .split("\n")
    .map(line => {
      const idx = line.indexOf("#");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
}

export function rewriteNanopubUri(
  dataset: DatasetCore,
  oldBase: string,
  newBase: string
): DatasetCore {
  const out = new Store();

  for (const q of dataset) {
    const rewrite = (term: Term): Term => {
      if (term.termType === "NamedNode" && term.value.startsWith(oldBase)) {
        return namedNode(term.value.replace(oldBase, newBase));
      }
      return term;
    };

    out.addQuad(
      quad(
        rewrite(q.subject) as Quad_Subject,
        rewrite(q.predicate) as NamedNode,
        rewrite(q.object) as Quad_Object,
        rewrite(q.graph) as Quad_Graph
      )
    );
  }

  return out;
}

export function datasetToNanopub(
  dataset: DatasetCore,
  nanopubUri: string
): NanopubData {
  const head: Quad[] = [];
  const assertion: Quad[] = [];
  const provenance: Quad[] = [];
  const pubinfo: Quad[] = [];

  const headGraph = `${nanopubUri}#Head`;
  const assertionGraph = `${nanopubUri}#assertion`;
  const provenanceGraph = `${nanopubUri}#provenance`;
  const pubinfoGraph = `${nanopubUri}#pubinfo`;

  for (const q of dataset) {
    if (q.graph.termType !== "NamedNode") continue;

    switch (q.graph.value) {
      case headGraph:
        head.push(q);
        break;
      case assertionGraph:
        assertion.push(q);
        break;
      case provenanceGraph:
        provenance.push(q);
        break;
      case pubinfoGraph:
        pubinfo.push(q);
        break;
    }
  }

  return {
    sourceUri: nanopubUri,
    head,
    assertion,
    provenance,
    pubinfo,
  };
}
