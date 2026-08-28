/**
 * Syntax checking for the SPARQL carried by grlc query nanopublications.
 *
 * A nanopublication cannot be edited after the fact, so a query whose SPARQL is
 * broken is broken permanently: it can never run, and the only remedy is
 * publishing a corrected version. These checks run before a nanopublication
 * carrying such a query is signed or published.
 *
 * The queries end up being executed by grlc against RDF4J, so what matters is
 * what RDF4J's parser accepts. `sparqljs` stands in for it here, with two
 * adjustments that were measured against the 1364 grlc queries published so far:
 *
 *  - RDF4J pre-declares a handful of prefixes and applies fewer semantic checks
 *    than sparqljs does, so queries sparqljs rejects for those reasons are
 *    accepted here (see RDF4J_PREFIXES and the error handling in
 *    getSparqlSyntaxError);
 *  - sparqljs treats every JavaScript whitespace character as SPARQL whitespace,
 *    so a no-break space passes it while RDF4J reports a lexical error. That is
 *    the very failure this check exists for, so findDisallowedCharacter looks
 *    for those characters itself.
 *
 * With those two adjustments the check agrees with RDF4J on all but two of those
 * 1364 queries, rejecting none that RDF4J accepts.
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

/** The only whitespace the SPARQL grammar allows: WS ::= #x20 | #x9 | #xD | #xA */
const SPARQL_WHITESPACE = ' \t\n\r';

/**
 * The non-ASCII characters SPARQL allows outside literals, comments and IRIs:
 * PN_CHARS_BASE plus the two ranges and one character PN_CHARS adds. Anything
 * else non-ASCII in that position is a lexical error.
 */
const SPARQL_NAME_RANGES: [number, number][] = [
  [0x00b7, 0x00b7],
  [0x00c0, 0x00d6],
  [0x00d8, 0x00f6],
  [0x00f8, 0x02ff],
  [0x0300, 0x036f],
  [0x0370, 0x037d],
  [0x037f, 0x1fff],
  [0x200c, 0x200d],
  [0x203f, 0x2040],
  [0x2070, 0x218f],
  [0x2c00, 0x2fef],
  [0x3001, 0xd7ff],
  [0xf900, 0xfdcf],
  [0xfdf0, 0xfffd],
  [0x10000, 0xeffff],
];

function isSparqlNameChar(codePoint: number): boolean {
  return SPARQL_NAME_RANGES.some(
    ([from, to]) => codePoint >= from && codePoint <= to,
  );
}

/** IRIREF ::= '<' ([^<>"{}|^`\]-[#x00-#x20])* '>' */
const IRI_FORBIDDEN = '<>"{}|^`\\';

/**
 * The length of the IRI that starts at `start`, or 0 where that '<' is a
 * comparison operator rather than the opening of an IRI.
 */
function iriLength(sparql: string, start: number): number {
  for (let i = start + 1; i < sparql.length; i++) {
    const char = sparql[i];
    if (char === '>') return i - start + 1;
    if (IRI_FORBIDDEN.includes(char) || char <= ' ') return 0;
  }
  return 0;
}

/** A character SPARQL doesn't allow where it stands, and where it stands. */
export interface DisallowedCharacter {
  codePoint: number;
  line: number;
  column: number;
}

/**
 * Finds the first character the SPARQL grammar doesn't allow where it stands.
 *
 * Only code positions are examined: comments, string literals and IRIs may hold
 * any character, and regularly do. What is left is a character that is either
 * outside SPARQL's name characters or a whitespace character other than the four
 * the grammar allows — a no-break space, say, which reads as an ordinary space
 * to whoever wrote the query but stops the parser on the way to grlc.
 *
 * @param sparql - The query to scan.
 * @returns The first such character, or null if there is none.
 */
export function findDisallowedCharacter(
  sparql: string,
): DisallowedCharacter | null {
  let i = 0;
  let line = 1;
  let column = 1;

  // Steps over `count` characters, keeping the line and column in step.
  const skip = (count: number) => {
    for (let n = 0; n < count && i < sparql.length; n++, i++) {
      if (sparql[i] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
  };

  while (i < sparql.length) {
    const char = sparql[i];

    // Comment: runs to the end of the line.
    if (char === '#') {
      const end = sparql.indexOf('\n', i);
      skip((end === -1 ? sparql.length : end) - i);
      continue;
    }

    // Long string literal: runs to the matching triple quote.
    const triple = sparql.slice(i, i + 3);
    if (triple === "'''" || triple === '"""') {
      let end = i + 3;
      while (end < sparql.length && sparql.slice(end, end + 3) !== triple) {
        end += sparql[end] === '\\' ? 2 : 1;
      }
      skip(Math.min(end + 3, sparql.length) - i);
      continue;
    }

    // Short string literal: runs to the matching quote, at most to the line end.
    if (char === "'" || char === '"') {
      let end = i + 1;
      while (
        end < sparql.length &&
        sparql[end] !== char &&
        sparql[end] !== '\n'
      ) {
        end += sparql[end] === '\\' ? 2 : 1;
      }
      skip(Math.min(end + 1, sparql.length) - i);
      continue;
    }

    // IRI, if this '<' opens one rather than being a comparison operator.
    if (char === '<') {
      const length = iriLength(sparql, i);
      if (length) {
        skip(length);
        continue;
      }
    }

    const codePoint = sparql.codePointAt(i)!;
    const disallowedWhitespace =
      /\s/.test(char) && !SPARQL_WHITESPACE.includes(char);
    const disallowedName = codePoint > 0x7f && !isSparqlNameChar(codePoint);
    if (disallowedWhitespace || disallowedName) {
      return { codePoint, line, column };
    }

    skip(codePoint > 0xffff ? 2 : 1);
  }

  return null;
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
 * The advice that follows a named character: these are almost never typed by
 * hand, and replacing them with their plain equivalents is the whole fix.
 */
const CHARACTER_ADVICE =
  'Characters like this one tend to slip in when a query is copied from a word ' +
  'processor or a web page, and replacing them with their plain equivalents ' +
  'makes the query valid again.';

/** Reduces the parser's report to the part that says what went wrong and where. */
function summarizeParserError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? '(no details given)');
  const summary = message
    .split('\n')[0]
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[:,.]+$/, '');
  const hash = (error as { hash?: { text?: string; token?: string } }).hash;
  if (!hash) return `${summary}.`;
  if (hash.token === 'EOF') return `${summary}: the query ends here.`;
  return hash.text ? `${summary}: unexpected "${hash.text}".` : `${summary}.`;
}

/**
 * The code point the parser stopped at, where naming it would help: not an ASCII
 * one, whose own report already shows what is there, and not half of a surrogate
 * pair, which is all the parser reports of a character outside the basic plane.
 */
function nonAsciiCodePointOf(error: unknown): number | null {
  const text = (error as { hash?: { text?: string } }).hash?.text;
  if (!text) return null;
  const codePoint = text.codePointAt(0)!;
  if (codePoint <= 0x7f) return null;
  return codePoint >= 0xd800 && codePoint <= 0xdfff ? null : codePoint;
}

type SparqlParser = {
  parse(query: string): { queryType?: string; type?: string };
};
let parserModule: Promise<{
  Parser: new (options: object) => SparqlParser;
}> | null = null;

/**
 * Loads sparqljs on first use. The parser is by far the largest thing this
 * library depends on, and only nanopublications that carry a grlc query need it,
 * so it is kept out of the bundle everything else pays for.
 */
async function getParser(): Promise<SparqlParser> {
  parserModule ??= import('sparqljs').then(
    (module) => module.default ?? module,
  );
  const { Parser } = await parserModule;
  return new Parser({
    prefixes: { ...RDF4J_PREFIXES },
    // sparqljs refuses to project a variable that is not in the GROUP BY;
    // RDF4J accepts such queries, and some published grlc queries are of that
    // shape, so this check is left to the endpoint that runs the query.
    skipValidation: true,
  });
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

  const disallowed = findDisallowedCharacter(sparql);
  if (disallowed) {
    return (
      `This is not valid SPARQL. The character at line ${disallowed.line}, ` +
      `column ${disallowed.column} is ${nameCharacter(disallowed.codePoint)}, ` +
      `which SPARQL doesn't allow there. ${CHARACTER_ADVICE}`
    );
  }

  const parser = await getParser();
  let parsed;
  try {
    parsed = parser.parse(sparql);
  } catch (error) {
    // sparqljs also enforces restrictions RDF4J does not — duplicate projected
    // columns, an AS target reused by a subquery. Those are reported as plain
    // errors, without the position a parse error carries, and queries carrying
    // them run in the wild, so only genuine parse errors and undeclared
    // prefixes are treated as broken here.
    const isParseError =
      'hash' in (error as object) ||
      (error instanceof Error && error.message.startsWith('Unknown prefix:'));
    if (!isParseError) return null;

    let description = `This is not valid SPARQL. The SPARQL parser reports: ${summarizeParserError(error)}`;
    const codePoint = nonAsciiCodePointOf(error);
    if (codePoint !== null) {
      description +=
        ` The character it stopped at is ${nameCharacter(codePoint)}, ` +
        `which SPARQL doesn't allow there. ${CHARACTER_ADVICE}`;
    }
    return description;
  }

  if (parsed.type === 'update') {
    return 'This is a SPARQL update, not a query, and cannot be run as one.';
  }
  if (!parsed.queryType) {
    return 'This is not valid SPARQL. It holds no query.';
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
