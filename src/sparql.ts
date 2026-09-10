/**
 * Syntax checking for the SPARQL carried by grlc query nanopublications.
 *
 * A nanopublication cannot be edited after the fact, so a query whose SPARQL is
 * broken is broken permanently: it can never run, and the only remedy is
 * publishing a corrected version. These checks run before a nanopublication
 * carrying such a query is signed or published.
 *
 * The queries end up being run by grlc against RDF4J, so what this has to match
 * is what RDF4J's parser accepts. Traqula's SPARQL 1.1 parser stands in for it,
 * with two adjustments measured against the 1364 grlc queries published so far:
 * the prefixes RDF4J declares for every query are pre-declared here too, and the
 * restrictions Traqula enforces that RDF4J does not are left to the endpoint
 * that runs the query. With those, the check agrees with RDF4J on all but two of
 * those queries, and rejects none that RDF4J accepts.
 *
 * The characters this check mainly exists for — a no-break space, a typographic
 * quote — are caught by Traqula's lexer, which reports the offset they sit at
 * and leaves them alone inside comments, string literals and IRIs, where SPARQL
 * allows them.
 */

/**
 * The prefixes RDF4J's SPARQLParser declares for every query, which queries in
 * the wild rely on without declaring them.
 */
const RDF4J_PREFIXES: Record<string, string> = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  fn: 'http://www.w3.org/2005/xpath-functions#',
  sesame: 'http://www.openrdf.org/schema/sesame#',
};

/**
 * Names of the characters that turn up in queries broken this way. Only the ones
 * a word processor or a web page produces are listed; anything else is reported
 * by code point alone, which is still enough to find and replace it.
 */
const CHARACTER_NAMES: Record<number, string> = {
  0x000b: 'LINE TABULATION',
  0x000c: 'FORM FEED',
  0x00a0: 'NO-BREAK SPACE',
  0x00ab: 'LEFT-POINTING DOUBLE ANGLE QUOTATION MARK',
  0x00ad: 'SOFT HYPHEN',
  0x00b0: 'DEGREE SIGN',
  0x00b4: 'ACUTE ACCENT',
  0x00b7: 'MIDDLE DOT',
  0x00bb: 'RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK',
  0x1680: 'OGHAM SPACE MARK',
  0x2000: 'EN QUAD',
  0x2001: 'EM QUAD',
  0x2002: 'EN SPACE',
  0x2003: 'EM SPACE',
  0x2004: 'THREE-PER-EM SPACE',
  0x2005: 'FOUR-PER-EM SPACE',
  0x2006: 'SIX-PER-EM SPACE',
  0x2007: 'FIGURE SPACE',
  0x2008: 'PUNCTUATION SPACE',
  0x2009: 'THIN SPACE',
  0x200a: 'HAIR SPACE',
  0x200b: 'ZERO WIDTH SPACE',
  0x200c: 'ZERO WIDTH NON-JOINER',
  0x200d: 'ZERO WIDTH JOINER',
  0x200e: 'LEFT-TO-RIGHT MARK',
  0x200f: 'RIGHT-TO-LEFT MARK',
  0x2010: 'HYPHEN',
  0x2011: 'NON-BREAKING HYPHEN',
  0x2012: 'FIGURE DASH',
  0x2013: 'EN DASH',
  0x2014: 'EM DASH',
  0x2015: 'HORIZONTAL BAR',
  0x2016: 'DOUBLE VERTICAL LINE',
  0x2017: 'DOUBLE LOW LINE',
  0x2018: 'LEFT SINGLE QUOTATION MARK',
  0x2019: 'RIGHT SINGLE QUOTATION MARK',
  0x201a: 'SINGLE LOW-9 QUOTATION MARK',
  0x201b: 'SINGLE HIGH-REVERSED-9 QUOTATION MARK',
  0x201c: 'LEFT DOUBLE QUOTATION MARK',
  0x201d: 'RIGHT DOUBLE QUOTATION MARK',
  0x201e: 'DOUBLE LOW-9 QUOTATION MARK',
  0x201f: 'DOUBLE HIGH-REVERSED-9 QUOTATION MARK',
  0x2022: 'BULLET',
  0x2026: 'HORIZONTAL ELLIPSIS',
  0x2027: 'HYPHENATION POINT',
  0x202a: 'LEFT-TO-RIGHT EMBEDDING',
  0x202b: 'RIGHT-TO-LEFT EMBEDDING',
  0x202c: 'POP DIRECTIONAL FORMATTING',
  0x202d: 'LEFT-TO-RIGHT OVERRIDE',
  0x202e: 'RIGHT-TO-LEFT OVERRIDE',
  0x202f: 'NARROW NO-BREAK SPACE',
  0x2032: 'PRIME',
  0x2033: 'DOUBLE PRIME',
  0x2039: 'SINGLE LEFT-POINTING ANGLE QUOTATION MARK',
  0x203a: 'SINGLE RIGHT-POINTING ANGLE QUOTATION MARK',
  0x203f: 'UNDERTIE',
  0x2040: 'CHARACTER TIE',
  0x2044: 'FRACTION SLASH',
  0x205f: 'MEDIUM MATHEMATICAL SPACE',
  0x2060: 'WORD JOINER',
  0x2066: 'LEFT-TO-RIGHT ISOLATE',
  0x2067: 'RIGHT-TO-LEFT ISOLATE',
  0x2068: 'FIRST STRONG ISOLATE',
  0x2069: 'POP DIRECTIONAL ISOLATE',
  0x2212: 'MINUS SIGN',
  0x3000: 'IDEOGRAPHIC SPACE',
  0x3001: 'IDEOGRAPHIC COMMA',
  0x3002: 'IDEOGRAPHIC FULL STOP',
  0xfeff: 'ZERO WIDTH NO-BREAK SPACE',
  0xff01: 'FULLWIDTH EXCLAMATION MARK',
  0xff02: 'FULLWIDTH QUOTATION MARK',
  0xff07: 'FULLWIDTH APOSTROPHE',
  0xff08: 'FULLWIDTH LEFT PARENTHESIS',
  0xff09: 'FULLWIDTH RIGHT PARENTHESIS',
  0xff0c: 'FULLWIDTH COMMA',
  0xff0d: 'FULLWIDTH HYPHEN-MINUS',
  0xff0e: 'FULLWIDTH FULL STOP',
  0xff0f: 'FULLWIDTH SOLIDUS',
  0xff1a: 'FULLWIDTH COLON',
  0xff1b: 'FULLWIDTH SEMICOLON',
  0xff1c: 'FULLWIDTH LESS-THAN SIGN',
  0xff1d: 'FULLWIDTH EQUALS SIGN',
  0xff1e: 'FULLWIDTH GREATER-THAN SIGN',
  0xff1f: 'FULLWIDTH QUESTION MARK',
  0xff3b: 'FULLWIDTH LEFT SQUARE BRACKET',
  0xff3d: 'FULLWIDTH RIGHT SQUARE BRACKET',
  0xff5b: 'FULLWIDTH LEFT CURLY BRACKET',
  0xff5d: 'FULLWIDTH RIGHT CURLY BRACKET',
};

/**
 * The advice that follows a named character: these are almost never typed by
 * hand, and replacing them with their plain equivalents is the whole fix.
 */
const CHARACTER_ADVICE =
  'Characters like this one tend to slip in when a query is copied from a word ' +
  'processor or a web page, and replacing them with their plain equivalents ' +
  'makes the query valid again.';

/** The lexer's report of a character it could not begin a token with. */
const LEXICAL_ERROR = /^unexpected character: ->([\s\S]+?)<- at offset: (\d+)/;

/** The parser's report: a line, the line itself, a caret, then the details. */
const PARSE_ERROR = /^Parse error(?: on line (\d+))?\n?([\s\S]*)$/;

/**
 * Expands the `\uXXXX` and `\UXXXXXXXX` escapes of SPARQL 19.2, as the parser
 * does before it lexes. Positions are worked out against the text it read rather
 * than the text as written, so that they land where it says they do. Expanding
 * an escape never removes a line break, so the line is right either way; where a
 * query uses such an escape the column counts the expanded character rather than
 * the six or ten that were written for it.
 */
function expandCodepointEscapes(sparql: string): string {
  return sparql.replace(
    /\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{8})/gu,
    (match: string, short?: string, long?: string) => {
      const codePoint = Number.parseInt(short ?? long ?? '', 16);
      return codePoint > 0x10ffff ? match : String.fromCodePoint(codePoint);
    },
  );
}

/** Where an offset falls, counting from line 1, column 1. */
function positionAt(
  text: string,
  offset: number,
): { line: number; column: number } {
  const before = text.slice(0, offset);
  const lastBreak = before.lastIndexOf('\n');
  return {
    line: before.split('\n').length,
    column: offset - lastBreak,
  };
}

/**
 * Names a character by code point, and by Unicode name where it is one of those
 * known to slip into queries.
 */
function nameCharacter(codePoint: number): string {
  const code = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
  const name = CHARACTER_NAMES[codePoint];
  return name ? `${code} (${name})` : code;
}

/**
 * Describes the character the lexer stopped at. Where it is not an ASCII one it
 * is named, since a query is more often broken by a character picked up on the
 * way through a word processor or a web page than by a hand-written syntax
 * error, and such a character reads as the plain one it replaced.
 */
function describeLexicalError(
  sparql: string,
  character: string,
  offset: number,
): string {
  const text = expandCodepointEscapes(sparql);
  const codePoint = text.codePointAt(offset) ?? character.codePointAt(0)!;
  const { line, column } = positionAt(text, offset);

  if (codePoint <= 0x7f) {
    // The parser's own report already shows what an ASCII character is.
    return (
      'This is not valid SPARQL. The SPARQL parser reports: unexpected ' +
      `${JSON.stringify(character)} at line ${line}, column ${column}.`
    );
  }
  return (
    `This is not valid SPARQL. The character at line ${line}, column ${column} ` +
    `is ${nameCharacter(codePoint)}, which SPARQL doesn't allow there. ` +
    CHARACTER_ADVICE
  );
}

/**
 * Describes where the parser stopped. Its report carries the line, the
 * line itself with a caret under the offending token, and then the details; only
 * the position and a short detail are worth repeating.
 */
function describeParseError(line: string | undefined, rest: string): string {
  const lines = rest.split('\n');
  const caret = lines.findIndex((l) => /^-*\^$/.test(l));
  const column = caret === -1 ? undefined : lines[caret].length;
  const detail = (caret === -1 ? lines : lines.slice(caret + 1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  let where = 'Parse error';
  if (line) {
    where += ` on line ${line}`;
    if (column) where += `, column ${column}`;
  }
  // The details run to the full list of tokens the parser would have accepted,
  // which does not survive being quoted; a short one says what was expected.
  return `This is not valid SPARQL. The SPARQL parser reports: ${where}${
    detail && detail.length <= 120 ? `: ${detail}` : ''
  }.`;
}

type SparqlAst = { type?: string };
type TraqulaParser = { parse(query: string): SparqlAst };
let parserPromise: Promise<TraqulaParser> | null = null;

/**
 * Loads the parser on first use and keeps it. It is by far the largest thing
 * this library depends on, and only nanopublications that carry a grlc query
 * need it, so it is kept out of the bundle everything else pays for. Building
 * one is expensive — the grammar is recorded at construction — so the same
 * parser serves every check.
 */
async function getParser(): Promise<TraqulaParser> {
  parserPromise ??= import('@traqula/parser-sparql-1-1').then(
    ({ Parser }) =>
      new Parser({
        defaultContext: { prefixes: { ...RDF4J_PREFIXES } },
        // Without this the parser reports no line for a query it cannot parse.
        lexerConfig: { positionTracking: 'full' },
      }),
  );
  return parserPromise;
}

/**
 * Describes what keeps the given string from being a SPARQL query that grlc can
 * run, in terms the author of the query can act on.
 *
 * @param sparql - The query to check.
 * @returns A description of the problem, or null if the query is fine (or absent).
 */
export async function getSparqlSyntaxError(
  sparql: string | null | undefined,
): Promise<string | null> {
  if (sparql === null || sparql === undefined) return null;
  if (sparql.trim() === '')
    return 'This is not valid SPARQL. It holds no query.';

  const parser = await getParser();
  let parsed: SparqlAst;
  try {
    parsed = parser.parse(sparql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const lexical = LEXICAL_ERROR.exec(message);
    if (lexical)
      return describeLexicalError(sparql, lexical[1], Number(lexical[2]));

    const parse = PARSE_ERROR.exec(message);
    if (parse) return describeParseError(parse[1], parse[2]);

    if (message.startsWith('Unknown prefix:')) {
      return `This is not valid SPARQL. The SPARQL parser reports: ${message}.`;
    }

    // What is left are restrictions the parser enforces and RDF4J does not: a
    // column selected twice, a variable bound twice, an AS target a subquery
    // also binds, a projection outside the GROUP BY. Queries in those shapes are
    // published and do run, so whether they are worth refusing is for the
    // endpoint that runs them to say, not for the signing step.
    return null;
  }

  if (parsed.type !== 'query') {
    return 'This is a SPARQL update, not a query, and cannot be run as one.';
  }

  return null;
}

/**
 * Reports whether the given string is a SPARQL query that grlc can run.
 *
 * @param sparql - The query to check. A missing query counts as valid; it is the
 * absence of a query, not a broken one.
 */
export async function isValidSparql(
  sparql: string | null | undefined,
): Promise<boolean> {
  return (await getSparqlSyntaxError(sparql)) === null;
}
