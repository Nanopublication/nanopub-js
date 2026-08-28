import { describe, it, expect } from 'vitest';
import { getSparqlSyntaxError, isValidSparql } from '../src/sparql';

const VALID = 'SELECT ?x WHERE { ?x ?y ?z }';

/** A published grlc query, shortened: placeholders and a magic property. */
const REAL_GRLC_QUERY = `prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix npa: <http://purl.org/nanopub/admin/>
prefix search: <http://www.openrdf.org/contrib/lucenesail#>

select ?np ?label where {
  graph npa:graph {
    ?np npa:hasValidSignatureForPublicKey ?__pubkey .
    optional { ?np rdfs:label ?label . }
  }
  ?np search:matches [ search:query ?_query ; search:property rdfs:label ] .
}
limit 100`;

describe('getSparqlSyntaxError', () => {
  it('accepts a valid query', async () => {
    expect(await getSparqlSyntaxError(VALID)).toBeNull();
    expect(await isValidSparql(VALID)).toBe(true);
  });

  it('accepts a published grlc query with placeholders', async () => {
    expect(await getSparqlSyntaxError(REAL_GRLC_QUERY)).toBeNull();
  });

  it('accepts a values block', async () => {
    const query = `prefix ex: <http://example.org/>
select ?a ?b where { values (?a ?b) { (ex:1 "x") (ex:2 UNDEF) } ?a ?p ?b }`;

    expect(await getSparqlSyntaxError(query)).toBeNull();
  });

  it('accepts the prefixes RDF4J declares for every query', async () => {
    // Queries in the wild use xsd: and rdf: without declaring them, and run.
    const query =
      'select ?x where { ?x rdf:type ?t . filter(?x > "1"^^xsd:integer) }';

    expect(await getSparqlSyntaxError(query)).toBeNull();
  });

  it('accepts the queries the parser alone rejects but RDF4J runs', async () => {
    // Duplicate projected column, and an AS target the subquery also binds:
    // both are published grlc queries that run, so neither is refused here.
    const duplicateColumn = 'select ?a ?b ?a where { ?a ?p ?b }';
    const reusedAsTarget =
      'select (?inner as ?x) where { { select ?x ?inner where { ?x ?p ?inner } } }';

    expect(await getSparqlSyntaxError(duplicateColumn)).toBeNull();
    expect(await getSparqlSyntaxError(reusedAsTarget)).toBeNull();
  });

  it('treats a missing query as valid', async () => {
    expect(await getSparqlSyntaxError(null)).toBeNull();
    expect(await getSparqlSyntaxError(undefined)).toBeNull();
  });

  it('rejects an empty query', async () => {
    const error = await getSparqlSyntaxError('');

    expect(error).toContain('This is not valid SPARQL');
    expect(await isValidSparql('')).toBe(false);
  });

  it('rejects a hand-written syntax error, reporting what the parser says', async () => {
    const error = await getSparqlSyntaxError('SELECT ?x WHERE { ?x ?y }');

    expect(error).toContain('This is not valid SPARQL.');
    expect(error).toContain('The SPARQL parser reports:');
  });

  it('rejects a SPARQL update', async () => {
    const error = await getSparqlSyntaxError(
      'INSERT DATA { <http://a> <http://b> <http://c> }',
    );

    expect(error).toContain('not a query');
  });

  it('names a no-break space, which reads as the space it replaced', async () => {
    const error = await getSparqlSyntaxError(
      'SELECT ?x\nWHERE {\u00A0?x ?y ?z }',
    );

    expect(error).toContain('U+00A0 (NO-BREAK SPACE)');
    expect(error).toContain('line 2, column 8');
    expect(error).toContain('word processor');
  });

  it('names a typographic quotation mark', async () => {
    const error = await getSparqlSyntaxError(
      'SELECT ?x WHERE { ?x ?y “hello” }',
    );

    expect(error).toContain('U+201C (LEFT DOUBLE QUOTATION MARK)');
    expect(error).toContain('line 1, column 25');
  });

  it('reports a character with no listed name by code point alone', async () => {
    const error = await getSparqlSyntaxError('SELECT ?x WHERE { ?x ?y ?z }⸺');

    expect(error).toContain('U+2E3A');
  });

  it('leaves such characters alone inside literals, comments and IRIs', async () => {
    // All three may hold any character, and published queries do hold them.
    const query = `# a comment with a\u00A0no-break space
select ?x where {
  ?x <http://example.org/a\u00A0b> "quoted “hello”, and a\u00A0space" .
}`;

    expect(await getSparqlSyntaxError(query)).toBeNull();
  });

  it('counts the position past a multi-line literal', async () => {
    const query = `select ?x where {
  ?x ?p """first
second
third""" .
  ?x ?q \u00A0?z .
}`;

    const error = await getSparqlSyntaxError(query);

    expect(error).toContain('line 5, column 9');
  });

  it('counts the line past a codepoint escape, which the parser expands', async () => {
    const query = `select ?x where {
  ?x ?p "en\\u2013dash" .
  ?x ?q \u00A0?z .
}`;

    const error = await getSparqlSyntaxError(query);

    expect(error).toContain('U+00A0 (NO-BREAK SPACE)');
    expect(error).toContain('line 3');
  });

  it('leaves an ASCII character to the parser rather than naming it', async () => {
    const error = await getSparqlSyntaxError('selct ?x where { ?x ?p ?o }');

    expect(error).toContain('The SPARQL parser reports:');
    expect(error).not.toContain('U+');
  });
});
