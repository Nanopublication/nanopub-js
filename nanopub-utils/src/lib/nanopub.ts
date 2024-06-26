import {Parser, Store, Writer, DataFactory, NamedNode} from 'n3'
import {nschema, prov, default_prefixes} from './constants'
import {getUpdateStatus, NpStatus} from './nanopub-utils'

const {namedNode} = DataFactory

export class MalformedNanopubError extends Error {
  constructor(message = '', ...args: ConstructorParameters<typeof Error>) {
    super(...args)
    this.message = message
  }
}

export interface NpDisplay {
  head: Map<string, Map<string, Map<string, string>>>
  assertion: Map<string, Map<string, Map<string, string>>>
  provenance: Map<string, Map<string, Map<string, string>>>
  pubinfo: Map<string, Map<string, Map<string, string>>>
  prefixes: {[key: string]: string}
}

export class Nanopub {
  /**
   * Create a Nanopub
   * - Fetch from URL: `const np = await Nanopub.fetch('https://purl.org/np/RA')`
   * - Create from a string: `const np = await Nanopub.parse('ADD NP RDF')`
   * - Or provide a RDF/JS store: `const np = await Nanopub.parse(store)`
   */

  rdfString: string
  store: Store
  uri?: string

  // The prefixes defined in the Nanopub, used to resolve CURIEs
  prefixes: {[key: string]: string} = default_prefixes
  // The namedNode (URI) used for each graph
  graphs: {[key: string]: NamedNode | null} = {
    head: null,
    assertion: null,
    provenance: null,
    pubinfo: null
  }
  // An object prefixes optimized to display the content of the Nanopub
  displayNp?: NpDisplay
  dateCreated?: string
  author?: string

  static async fetch(url: string): Promise<Nanopub> {
    const response = await fetch(url, {
      headers: {Accept: 'application/trig'}
    })
    return new Nanopub(await response.text())
  }

  static async parse(rdf: string | Store, prefixes = null): Promise<Nanopub> {
    return new Nanopub(rdf, prefixes)
  }

  public constructor(rdf: string | Store, prefixes = null) {
    if (prefixes) this.prefixes = prefixes
    if (typeof rdf === 'string') {
      this.rdfString = rdf
      this.store = new Store()
    } else {
      this.store = rdf
      this.rdfString = ''
      // Store already provided, but we need to serialize the RDF string
      const writer = new Writer({prefixes: this.prefixes})
      writer.addQuads(this.store.getQuads(null, null, null, null))
      writer.end((error, result) => {
        if (error) throw new MalformedNanopubError(error.message)
        this.rdfString = result
      })
    }

    if (!this.rdfString && this.store.size < 1) {
      throw new MalformedNanopubError(`⚠️ No RDF has been provided for the Nanopublication`)
    }

    // Store already provided, but we need to serialize the RDF string
    if (!this.rdfString && this.store) {
      const writer = new Writer({prefixes: this.prefixes})
      writer.addQuads(this.store.getQuads(null, null, null, null))
      writer.end((error, result) => {
        if (error) throw new MalformedNanopubError(error.message)
        this.rdfString = result
      })
    }

    // Store not provided, we parse the RDF string with n3.js
    if (this.rdfString && this.store.size < 1) {
      const parser = new Parser()
      this.store = new Store(
        parser.parse(this.rdfString, null, (prefix, namespace) => {
          // Retrieve the prefixes
          this.prefixes[prefix] = namespace['id']
        })
      )
      // Put this and sub at the top of the prefixes hash
      if (this.prefixes['this'] && this.prefixes['sub'])
        this.prefixes = {
          this: this.prefixes['this'],
          sub: this.prefixes['sub'],
          ...this.prefixes
        }
    }
    this.extractNanopubInfos()
  }

  private extractNanopubInfos() {
    /**
     * Extract metadata from the nanopub RDF (np URI, graphs URIs, author...)
     */
    // Extract the nanopub URI in the head graph
    for (const quad of this.store.match(
      null,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode(`${nschema}Nanopublication`)
    )) {
      this.uri = quad.subject.value
      this.graphs.head = namedNode(quad.graph.value)
    }
    if (!this.uri) {
      throw new MalformedNanopubError('Could not extract the Nanopub URI')
    }

    // Extract assertion, prov and pubinfo graphs URIs
    for (const quad of this.store.match(namedNode(this.uri), namedNode(`${nschema}hasAssertion`), null)) {
      this.graphs.assertion = namedNode(quad.object.value)
    }
    for (const quad of this.store.match(namedNode(this.uri), namedNode(`${nschema}hasProvenance`), null)) {
      this.graphs.provenance = namedNode(quad.object.value)
    }
    for (const quad of this.store.match(namedNode(this.uri), namedNode(`${nschema}hasPublicationInfo`), null)) {
      this.graphs.pubinfo = namedNode(quad.object.value)
    }
    if (!this.graphs.head || !this.graphs.assertion || !this.graphs.provenance || !this.graphs.pubinfo) {
      throw new MalformedNanopubError(`Issue extracting one of the Nanopub graphs: ${this.graphs}`)
    }

    // Extract the creation date and author of the nanopub
    for (const quad of this.store.match(
      namedNode(this.uri),
      namedNode(`${prov}generatedAtTime`),
      null,
      this.graphs.pubinfo
    )) {
      this.dateCreated = quad.object.value
    }
    for (const quad of this.store.match(
      namedNode(this.uri),
      namedNode(`${prov}wasAttributedTo`),
      null,
      this.graphs.pubinfo
    )) {
      this.author = quad.object.value
    }
  }

  public async status(): Promise<NpStatus> {
    if (!this.uri) throw new MalformedNanopubError('No URI found for this Nanopub, can not get its status')
    return await getUpdateStatus(this.uri)
  }

  public display(): NpDisplay {
    /**
     * Generate an object optimized for visually displaying the nanopub
     * It will add the object to this.displayNp to avoid recomputing again later if reused
     */

    if (this.displayNp) return this.displayNp
    const displayNp: NpDisplay = {
      head: new Map(),
      assertion: new Map(),
      provenance: new Map(),
      pubinfo: new Map(),
      prefixes: this.prefixes
    }

    const predOrder = ['a', 'rdfs:label', 'rdfs:comment', 'rdf:subject', 'rdf:predicate', 'rdf:object']
    for (const graph of Object.keys(this.graphs)) {
      for (const quad of this.store.match(null, null, null, this.graphs[graph])) {
        const subject = this.uriToCurie(quad.subject.value)
        const pred = this.uriToCurie(quad.predicate.value)

        if (!displayNp[graph].has(subject)) displayNp[graph].set(subject, new Map())

        if (!displayNp[graph]?.get(subject).has(pred)) {
          displayNp[graph].get(subject).set(pred, [])
        }

        displayNp[graph]
          .get(subject)
          .get(pred)
          .push({
            value: this.uriToCurie(quad.object.value),
            type: quad.object.termType
          })
      }
      // Order subjects in graph, put sub:* in first
      displayNp[graph] = new Map(
        [...displayNp[graph].entries()].sort((a, b) => {
          if (a[0].startsWith('sub:') && !b[0].startsWith('sub:')) {
            return -1
          } else if (!a[0].startsWith('sub:') && b[0].startsWith('sub:')) {
            return 1
          } else {
            return a[0].localeCompare(b[0]) // None in predOrder list
          }
        })
      )

      // Order predicates for each subject
      for (const [subj, preds] of displayNp[graph].entries()) {
        displayNp[graph].set(
          subj,
          new Map(
            [...preds.entries()].sort((a, b) => {
              if (predOrder.indexOf(a[0]) !== -1 && predOrder.indexOf(b[0]) !== -1) {
                return predOrder.indexOf(a[0]) - predOrder.indexOf(b[0]) // The 2 are in predOrder list
              } else if (predOrder.indexOf(a[0]) !== -1 && predOrder.indexOf(b[0]) === -1) {
                return -1 // b not in predOrder list
              } else if (predOrder.indexOf(a[0]) === -1 && predOrder.indexOf(b[0]) !== -1) {
                return 1 // a not in predOrder list
              } else {
                return a[0].localeCompare(b[0]) // None in predOrder list
              }
            })
          )
        )
      }
    }
    this.displayNp = displayNp
    return this.displayNp
  }

  // Get the complete URI for a CURIE
  public curieToUri(curie: string): string {
    const prefix = curie.substring(0, curie.indexOf(':'))
    return curie.replace(`${prefix}:`, this.prefixes[prefix])
  }

  // Get the CURIE for a complete URI
  public uriToCurie(uri: string, namespace?: string): string {
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') return 'a'
    // "sub" namespace needs to be before "this" namespace
    const prefixes = this.prefixes['sub'] ? {sub: this.prefixes['sub'], ...this.prefixes} : this.prefixes
    if (namespace) return uri.replace(prefixes[namespace], `${namespace}:`)
    else {
      for (const prefix in prefixes) {
        if (uri.startsWith(prefixes[prefix])) {
          return uri.replace(prefixes[prefix], `${prefix}:`)
        }
      }
      return uri
    }
  }
}
