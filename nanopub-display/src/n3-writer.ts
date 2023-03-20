import {Writer, DataFactory} from 'n3'

// cf. https://github.com/rdfjs/N3.js/blob/520054a9fb45ef48b5b58851449942493c57dace/src/N3Writer.js#L378

// TODO: better handle how the URI for the different graphs are detected
// Maybe convert the nanopub to a JSON version that is easier to manipulate in JS?

const escape = /["\\\t\n\r\b\f\u0000-\u0019\ud800-\udbff]/,
  escapeAll = /["\\\t\n\r\b\f\u0000-\u0019]|[\ud800-\udbff][\udc00-\udfff]/g,
  escapedCharacters = {
    '\\': '\\\\',
    '"': '\\"',
    '\t': '\\t',
    '\n': '\\n',
    '\r': '\\r',
    '\b': '\\b',
    '\f': '\\f'
  }

const DEFAULTGRAPH = DataFactory.defaultGraph()
const aTagAttrs = `target="_blank" rel="noopener noreferrer"`

export class NanopubWriter extends Writer {
  // Stubs for TS to use parent class props and methods
  _lists: any
  _baseMatcher: any
  _baseLength: any
  _prefixRegex: any
  _prefixIRIs: any
  _inDefaultGraph: any
  _graph: any
  _subject: any
  _predicate: any
  _blockedWrite: any
  _outputStream: any
  _endStream: any
  _encodeSubject: any
  _encodePredicate: any
  _encodeObject: any
  _write: any

  // `_encodeIriOrBlank` represents an IRI or blank node
  _encodeIriOrBlank(entity: any) {
    // console.log("ENCODE!!", entity, this._lists)
    // A blank node or list is represented as-is
    if (entity.termType !== 'NamedNode') {
      // If it is a list head, pretty-print it
      if (this._lists && entity.value in this._lists) entity = this.list(this._lists[entity.value])
      return 'id' in entity ? entity.id : `_:${entity.value}`
    }
    let iri = entity.value
    // Use relative IRIs if requested and possible
    if (this._baseMatcher && this._baseMatcher.test(iri)) iri = iri.substr(this._baseLength)
    // Escape special characters
    if (escape.test(iri)) iri = iri.replace(escapeAll, characterReplacer)
    // Try to represent the IRI as prefixed name
    const prefixMatch = this._prefixRegex.exec(iri)
    if (prefixMatch && !prefixMatch[2]) {
      prefixMatch[2] = ''
    }
    return !prefixMatch
      ? `<<a href="${iri}" title="${iri}" ${aTagAttrs}>${iri}</a>>`
      : !prefixMatch[1]
      ? iri
      : `<a href="${iri}" title="${iri}" ${aTagAttrs}>${this._prefixIRIs[prefixMatch[1]] + prefixMatch[2] || ':'}</a>`
  }

  _writeQuad(subject: any, predicate: any, object: any, graph: any, done: any) {
    try {
      // Write the graph's label if it has changed
      if (!graph.equals(this._graph)) {
        // TODO: add divs with CSS classes for head, assertion, prov, pubinfo
        const graphStr = graph.id.toString().toLowerCase()
        let graphLabel = 'assertion'
        if (graphStr.endsWith('head')) graphLabel = 'head'
        if (graphStr.endsWith('provenance') || graphStr.endsWith('prov')) graphLabel = 'provenance'
        if (graphStr.endsWith('pubinfo')) graphLabel = 'pubinfo'

        // Close the previous graph and start the new one
        this._write(
          (this._subject === null ? '' : this._inDefaultGraph ? '.<br/>' : ' .<br/>}</div>') +
            (DEFAULTGRAPH.equals(graph)
              ? ''
              : `<div class="nanopub-graph" id="nanopub-${graphLabel}">${this._encodeIriOrBlank(graph)} {<br/>`)
        )
        this._graph = graph
        this._subject = null
      }
      // Don't repeat the subject if it's the same
      if (subject.equals(this._subject)) {
        // Don't repeat the predicate if it's the same
        if (predicate.equals(this._predicate)) this._write(`, ${this._encodeObject(object)}`, done)
        // Same subject, different predicate
        else
          this._write(
            ` ;<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${this._encodePredicate(
              (this._predicate = predicate)
            )} ${this._encodeObject(object)}`,
            done
          )
      } else {
        // Different subject, write the whole quad
        this._write(
          `${
            (this._subject === null ? '' : ' .<br/>') +
            `&nbsp;&nbsp;&nbsp;&nbsp;` +
            this._encodeSubject((this._subject = subject))
          } ${this._encodePredicate((this._predicate = predicate))} ${this._encodeObject(object)}`,
          done
        )
      }
    } catch (error) {
      done && done(error)
    }
  }

  override addPrefixes(prefixes: any, done: any) {
    // Ignore prefixes if not supported by the serialization
    // Finish a possible pending quad
    if (this._subject !== null) {
      this._write(this._inDefaultGraph ? '.<br/>' : '<br/>}<br/>')
      ;(this._subject = null), (this._graph = '')
    }

    if (!this._prefixIRIs) return done && done()
    // Write all new prefixes
    let hasPrefixes = false
    // let i = 0;
    // const enoughPrefixes = Object.keys(prefixes).length > 1
    for (let prefix in prefixes) {
      // if (enoughPrefixes && i === 1) {
      //   this._write('<div class="nanopub-prefixes">');
      // }
      let iri = prefixes[prefix]
      if (typeof iri !== 'string') iri = iri.value
      hasPrefixes = true
      // Finish a possible pending quad
      // if (this._subject !== null) {
      //   this._write(this._inDefaultGraph ? '.<br/>' : '<br/>}<br/>');
      //   this._subject = null, this._graph = '';
      // }
      // Store and write the prefix
      this._prefixIRIs[iri] = prefix += ':'
      // this._write(`@prefix ${prefix} <<a href="${iri}" ${aTagAttrs}>${iri}</a>> .`);

      // if (enoughPrefixes && i === 0) {
      //   this._write('<button @click="${this._expandPrefixes}" class="nanopub-prefixes-button">Show all prefixes</button>');
      // }
      // this._write(`<br/>`);
      // i++
    }
    // if (enoughPrefixes) {
    //   this._write('</div>');
    // }
    // Recreate the prefix matcher
    if (hasPrefixes) {
      let IRIlist = '',
        prefixList = ''
      for (const prefixIRI in this._prefixIRIs) {
        IRIlist += IRIlist ? `|${prefixIRI}` : prefixIRI
        prefixList += (prefixList ? '|' : '') + this._prefixIRIs[prefixIRI]
      }
      IRIlist = escapeRegex(IRIlist)
      this._prefixRegex = new RegExp(`^(?:${prefixList})[^\/]*$|` + `^(${IRIlist})([_a-zA-Z][\\-_a-zA-Z0-9]*)*$`)
    }
    // End a prefix block with a newline
    // this._write(hasPrefixes ? '' : '', done);
  }

  override end(done: any) {
    // Finish a possible pending quad
    if (this._subject !== null) {
      this._write(this._inDefaultGraph ? '.<br/>' : ' .<br/>}</div>')
      this._subject = null
    }
    // Disallow further writing
    this._write = this._blockedWrite

    // Try to end the underlying stream, ensuring done is called exactly one time
    let singleDone =
      done &&
      ((error: any, result: any) => {
        ;(singleDone = null), done(error, result)
      })
    if (this._endStream) {
      try {
        return this._outputStream.end(singleDone)
      } catch (error) {
        /* error closing stream */
      }
    }
    singleDone && singleDone()
  }
}

function escapeRegex(regex: any) {
  return regex.replace(/[\]\/\(\)\*\+\?\.\\\$]/g, '\\$&')
}

function characterReplacer(character: any) {
  // Replace a single character by its escaped version
  let result = escapedCharacters[character]
  if (result === undefined) {
    // Replace a single character with its 4-bit unicode escape sequence
    if (character.length === 1) {
      result = character.charCodeAt(0).toString(16)
      result = '\\u0000'.substr(0, 6 - result.length) + result
    }
    // Replace a surrogate pair with its 8-bit unicode escape sequence
    else {
      result = ((character.charCodeAt(0) - 0xd800) * 0x400 + character.charCodeAt(1) + 0x2400).toString(16)
      result = '\\U00000000'.substr(0, 10 - result.length) + result
    }
  }
  return result
}
