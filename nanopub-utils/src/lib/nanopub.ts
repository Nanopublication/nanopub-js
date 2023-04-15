import {Parser, Quad, Store, DataFactory} from 'n3'
const {namedNode} = DataFactory

// Create the Nanopub from a URL:
// const np = await Nanopub.fetch('https://purl.org/np/RA')
// Create the Nanopub from a RDF TRiG string:
// const np = new Nanopub({rdfString: 'ADD RDF TRIG'})

export class Nanopub {
  url: string
  rdfString: string
  store: Store
  error?: string

  // The prefixes of the Nanopub, used to resolve CURIEs
  prefixes = {}
  // The CURIE or URI used for each graph
  graphsId = {
    head: '',
    assertion: '',
    provenance: '',
    pubinfo: ''
  }
  // An object optimized to display the content of the Nanopub
  displayNp = {
    head: new Map(),
    assertion: new Map(),
    provenance: new Map(),
    pubinfo: new Map()
  }

  static async fetch(url: string) {
    try {
      const response = await fetch(url, {
        headers: {Accept: 'application/trig'}
      })
      return new Nanopub({url: url, rdfString: await response.text()})
    } catch (error) {
      return new Nanopub({url: url, error: `⚠️ Issue fetching the nanopublication RDF at ${url}. ${error}`})
      // throw new Error(`⚠️ Issue fetching the nanopublication RDF at ${url}. ${error}`)
    }
  }

  public constructor({url = '', rdfString = '', store = new Store(), error = ''}) {
    this.url = url
    this.rdfString = rdfString
    this.store = store
    this.error = error
    // TODO: should we really store the RDF string in the Nanopub object?

    if (this.error) return
    if (!this.rdfString && this.store.size < 1) {
      this.error = `⚠️ No nanopublication has been provided, use the "url" or "rdfString"
        attribute to provide the URL, or RDF in the TRiG format, of the nanopublication.`
      return
    }

    if (this.url.startsWith('https://purl.org/np/'))
      this.url = this.url.replace('https://purl.org/np/', 'http://purl.org/np/')

    // Parse the RDF with n3.js
    if (!this.error && this.rdfString) {
      const parser = new Parser()

      parser.parse(this.rdfString, (error: any, quad: Quad, prefixes: any): any => {
        if (error) {
          this.error = `⚠️ Issue parsing the nanopublication RDF with n3.js, make sure it is in the TRiG format. ${error}`
          return null
        }
        if (quad) {
          this.store.addQuad(quad)
        } else {
          if (prefixes['this'] && prefixes['sub'])
            this.prefixes = {
              this: prefixes['this'],
              sub: prefixes['sub'],
              ...prefixes
            }
          else this.prefixes = prefixes
          this.extractNanopubInfos()
        }
      })
    }
  }

  // Get the complete URI for a CURIE
  public getUri(curie: string) {
    const prefix = curie.substring(0, curie.indexOf(':'))
    return curie.replace(`${prefix}:`, this.prefixes[prefix])
  }

  // Get the CURIE for a complete URI
  public getCurie(uri: string, namespace?: string) {
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') return 'a'
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

  // https://github.com/rdfjs/N3.js
  private extractNanopubInfos() {
    // Get the head graph URI, extract np URI if not provided
    for (const quad of this.store.match(
      null,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.nanopub.org/nschema#Nanopublication')
    )) {
      if (!this.url) this.url = quad.subject.toString()
      this.graphsId.head = this.getCurie(quad.graph.value, 'sub')
    }
    // Extract assertion, prov and pubinfo graphs URI
    for (const quad of this.store.match(namedNode(this.url), null, null)) {
      if (quad.predicate.value === 'http://www.nanopub.org/nschema#hasAssertion') {
        this.graphsId.assertion = this.getCurie(quad.object.value, 'sub')
      }
      if (quad.predicate.value === 'http://www.nanopub.org/nschema#hasProvenance')
        this.graphsId.provenance = this.getCurie(quad.object.value, 'sub')

      if (quad.predicate.value === 'http://www.nanopub.org/nschema#hasPublicationInfo')
        this.graphsId.pubinfo = this.getCurie(quad.object.value, 'sub')
    }

    const predOrder = ['a', 'rdfs:label', 'rdfs:comment', 'rdf:subject', 'rdf:predicate', 'rdf:object']
    // Generate the displayNp object, more optimized for visually displaying the nanopub
    for (const graph of Object.keys(this.graphsId)) {
      for (const quad of this.store.match(null, null, null, namedNode(this.getUri(this.graphsId[graph])))) {
        // console.log(`${graph} graph`, quad)
        const subject = this.getCurie(quad.subject.value)
        const pred = this.getCurie(quad.predicate.value)

        if (!this.displayNp[graph].has(subject)) this.displayNp[graph].set(subject, new Map())

        if (!this.displayNp[graph].get(subject).has(pred)) {
          this.displayNp[graph].get(subject).set(pred, [])
        }

        this.displayNp[graph]
          .get(subject)
          .get(pred)
          .push({
            value: this.getCurie(quad.object.value),
            type: quad.object.termType
          })
      }
      // Order subjects in graph, put sub:* in first
      this.displayNp[graph] = new Map(
        [...this.displayNp[graph].entries()].sort((a, b) => {
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
      for (const [subj, preds] of this.displayNp[graph].entries()) {
        this.displayNp[graph].set(
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

      console.log(graph, 'ORDERED', this.displayNp[graph])
    }
  }
}
