import { DataFactory, NamedNode } from "n3";
const { namedNode } = DataFactory;

export function makeNamedGraphNode(npUri: string, suffix: string): NamedNode {
  if (suffix === '') return namedNode(npUri);

  return namedNode(npUri + suffix);
}
