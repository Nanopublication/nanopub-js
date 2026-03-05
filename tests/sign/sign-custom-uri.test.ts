import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { sign } from '../../src/sign/sign';
 import { sign as sign_rs } from '../../src/sign/sign-rs';

const ORCID = 'https://orcid.org/0000-0000-0000-0000';

const EXAMPLE_privateKey =
  "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNQEcoXXchdpTm71Tidhyr1BMJp8jYeVg7/oLbmE5WOJ0hilSH/bmivywB+HoTOr6/3tpinw0Bws2M2m/7LLnDaaeYB5RC2DoD2BKBa499yOHa3rGMGOh/viyCGOJbjFPINlMhsIzsr+wvktHw0JclfW508lHmudjzR1/6B3OPdbj6Xw292VHIRt2WdyCmPEc8/3zvzuycQ3xsURnMxRoAdFqIf5iP30pn9uqP+Ex1rUaZ4lbrU8AuNPys3fiIPDVTYgsh4alY/IcYvd5OCvn2uw4LoXd/JZb9EJuS1KYK9v/DRirCdlvSNh4hy5UE7/nNgmXDt3xYjDfzOYN/8N9hAgMBAAECggEANbec5/OOOjPOxKHelWZUGqRmVyCScBVSAmGZ3d7+oZIvjZemh/DfpLhjzCA70syNH6ozfZwiy1MweKyyogoSlBISyrcxFk2A4YCrVzPPWhw5AA9IaGIcd1JOU74vf8Y6JywQlcCfIVLpfYnvaBcvd6BcSD8jMD9ziDgl5koM9H5iVDAr/J7XTm7iRxT3keCmfwBSs1rI0HB156e/QvG8eX/XX4hqrTJsRzC9S6wwkD/KSxan+ZHqN5d5eRI/3g9AYXNRqj0Nq2GOR2m4yC4UbL3ua7gEGxueErbKIm6uzWnCZSSV5fWXAALCmgILHeMpMMTej9+nd9ha2D3gJAoAAQKBgQDPV2sXW97OaL7jnTKd6tFbPgjrZ4YdkP917XTpOkhldJmiwhCDWo5BUSeo0aihB0rYwDNpGNgyBA9BNM5lBSCWrpAT3FMWrsUX6Y5Lg9UBaY5eXATmqf29YZPrWHG5b0vuU4MB59GzMPzAnzlysxLarzPbQBvXSeCNwLXtTKukcQKBgQD9a0Yb7FMNNHQlG8lOkftGRRIBejt+KPpg4cLF57nZJ5xgYaky+aiJLzZaof2Tmo7tsB3tlHv59opA9BCjB6iJ23OXTuO1Z5nqwH/PLe3m9QUd3syRgJ9a04is/GdxcUWUFG8shIBn1Gv0AYvZPwYXLduvdU5mnfTwKJfClvCh8QKBgQCfG3Mniq1QcZrCadf0zMP5I4KOunN1btZKNXz4mGwDxtU6y3cGhVASmWc4qiKf50utRthsts74mprmK9KSPLwERVJ0myb7igPe1LAIDNNA8TJ6AF0WcK4xTJbJC6bBaMG40kb/CFioDFh4q/bWqMo4HChMAEcdDykNPiudPK+eUQKBgQCWKuIxm7mfIo0MjEme0Gx4uGcyDu+AE+JCVKVpRqZfYtSMXHK57S0Mlbh8vm8X70dw26LwbMOGXKySTs4o/VnGzw7RA4N1tH2FmSpjZ5EJAfpVN/g65GAJnz3nW+4kT/3uAKncVGwOmtaZke0AABOo2pjKgRXDQyiowzUirvTK0QKBgQDOKqcTGGphC1pIpF/SUtdya0YXNoNoPtFBG5YmWjW0X7MonCisR0ffMsbqJWD00q2rzNG9kTU6u/3lKHrFFVktFQRYj4DJcLBxowt2j/WNiUOekFFw/xFbTCq7Sb2IoYUnQQPETKkrSq1WaAJ30rQRjhbXlpTPBOXj+tUrZ/BS+w==";

const inputTrig = `<https://w3id.org/sciencelive/np/Head> {
<https://w3id.org/sciencelive/np/> a <http://www.nanopub.org/nschema#Nanopublication>;
    <http://www.nanopub.org/nschema#hasAssertion> <https://w3id.org/sciencelive/np/assertion>;
    <http://www.nanopub.org/nschema#hasProvenance> <https://w3id.org/sciencelive/np/provenance>;
    <http://www.nanopub.org/nschema#hasPublicationInfo> <https://w3id.org/sciencelive/np/pubinfo>
}
<https://w3id.org/sciencelive/np/assertion> {
<https://doi.org/10.1016/j.joclim.2025.100573> a <http://purl.org/spar/fabio/ScholarlyWork>;
    <http://purl.org/spar/cito/usesDataFrom> <https://doi.org/10.1126/science.aar3646>
}
<https://w3id.org/sciencelive/np/provenance> {
<https://w3id.org/sciencelive/np/assertion> <http://www.w3.org/ns/prov#wasAttributedTo> <https://orcid.org/0000-9999-1234-9999>
}
<https://w3id.org/sciencelive/np/pubinfo> {
<https://w3id.org/sciencelive/np/> <http://purl.org/dc/terms/creator> <https://orcid.org/0000-9999-1234-9999>;
    <http://purl.org/dc/terms/created> "2025-01-01T00:00:00.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>;
    <http://purl.org/dc/terms/license> <https://creativecommons.org/licenses/by/4.0/>;
    <http://purl.org/nanopub/x/hasNanopubType> <http://purl.org/spar/cito/cites>;
    <http://purl.org/nanopub/x/wasCreatedAt> <https://platform.sciencelive4all.org>;
    <http://www.w3.org/2000/01/rdf-schema#label> "Citations for: j.joclim.2025.100573";
    <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo>.
<https://orcid.org/0000-9999-1234-9999> <http://xmlns.com/foaf/0.1/name> "Test User1".
<https://w3id.org/sciencelive/np/sig> <http://purl.org/nanopub/x/signedBy> <https://orcid.org/0000-9999-1234-9999>
}
`

const nanopub_rs_output = `PREFIX this: <https://w3id.org/sciencelive/np/RAvQgxo1ZGJRJGrDF-n0Qw6QL4zoZbOC2WM3DG8A47UME>
PREFIX sub: <https://w3id.org/sciencelive/np/RAvQgxo1ZGJRJGrDF-n0Qw6QL4zoZbOC2WM3DG8A47UME/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX np: <http://www.nanopub.org/nschema#>
PREFIX npx: <http://purl.org/nanopub/x/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX pav: <http://purl.org/pav/>
PREFIX schema: <https://schema.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX orcid: <https://orcid.org/>
PREFIX biolink: <https://w3id.org/biolink/vocab/>
PREFIX infores: <https://w3id.org/biolink/infores/>

GRAPH sub:Head {
  <https://w3id.org/sciencelive/np/RAvQgxo1ZGJRJGrDF-n0Qw6QL4zoZbOC2WM3DG8A47UME> a np:Nanopublication;
    np:hasAssertion sub:assertion;
    np:hasProvenance sub:provenance;
    np:hasPublicationInfo sub:pubinfo.
}

GRAPH sub:assertion {
  <https://doi.org/10.1016/j.joclim.2025.100573> a <http://purl.org/spar/fabio/ScholarlyWork>;
    <http://purl.org/spar/cito/usesDataFrom> <https://doi.org/10.1126/science.aar3646>.
}

GRAPH sub:provenance {
  sub:assertion
    prov:wasAttributedTo orcid:0000-9999-1234-9999.
}

GRAPH sub:pubinfo {
  orcid:0000-9999-1234-9999
    foaf:name "Test User1".

  <https://w3id.org/sciencelive/np/RAvQgxo1ZGJRJGrDF-n0Qw6QL4zoZbOC2WM3DG8A47UME>
    dcterms:created "2025-01-01T00:00:00.000Z"^^xsd:dateTime;
    dcterms:creator orcid:0000-9999-1234-9999;
    dcterms:license <https://creativecommons.org/licenses/by/4.0/>;
    npx:hasNanopubType <http://purl.org/spar/cito/cites>;
    npx:wasCreatedAt <https://platform.sciencelive4all.org>;
    rdfs:label "Citations for: j.joclim.2025.100573";
    <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo>.

  sub:sig
    npx:hasAlgorithm "RSA";
    npx:hasPublicKey "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzUBHKF13IXaU5u9U4nYcq9QTCafI2HlYO/6C25hOVjidIYpUh/25or8sAfh6Ezq+v97aYp8NAcLNjNpv+yy5w2mnmAeUQtg6A9gSgWuPfcjh2t6xjBjof74sghjiW4xTyDZTIbCM7K/sL5LR8NCXJX1udPJR5rnY80df+gdzj3W4+l8NvdlRyEbdlncgpjxHPP98787snEN8bFEZzMUaAHRaiH+Yj99KZ/bqj/hMda1GmeJW61PALjT8rN34iDw1U2ILIeGpWPyHGL3eTgr59rsOC6F3fyWW/RCbktSmCvb/w0YqwnZb0jYeIcuVBO/5zYJlw7d8WIw38zmDf/DfYQIDAQAB";
    npx:hasSignature "xX2g3DFYR5FTCa9MEXlERiXBaPx9N/Phw95bqOcgY1YJKaCBXusQx2YKpnrZGTMPCaOcYEDNm93h4KmOvKiGT17mNn1KNPO5+yoO9alMzYDoPgOjmLUEQ4mkkAKqZbIlj7emsLNIOXC+bl1WO02rZ7LzVXfwbVWHaVehp7NAKh32KOl6R2J27sBPICR/EH2b4+FjLsBz+tGxyFseZAABUclhFECXeEc8vp8CBH4LLpLgBkY6vPpuwmucUyybt+I214JK8/zA/BKLL2+a6guxLQX+PuiW41hNEfsAsTLACEtIsKl5AFxIMNdu9+W9Y4008BltPSKTnhW6B4o1cQJEvw==";
    npx:hasSignatureTarget <https://w3id.org/sciencelive/np/RAvQgxo1ZGJRJGrDF-n0Qw6QL4zoZbOC2WM3DG8A47UME>;
    npx:signedBy orcid:0000-9999-1234-9999.
}
`

describe('sign() with custom URI prefix', () => {
  it('returns signedRdf, sourceUri, and signature', async () => {
    const result = await sign(inputTrig, EXAMPLE_privateKey);

    expect(result).toHaveProperty('signedRdf');
    expect(result).toHaveProperty('sourceUri');
    expect(result).toHaveProperty('signature');
    expect(typeof result.signedRdf).toBe('string');
    expect(typeof result.sourceUri).toBe('string');
    expect(typeof result.signature).toBe('string');
  });

  it('sourceUri matches the hash of nanopub-rs', async () => {
    const { sourceUri } = await sign(inputTrig, EXAMPLE_privateKey);
    const { sourceUri: sourceUri_rs, signedRdf: signedRdf_rs } = await sign_rs(inputTrig, EXAMPLE_privateKey, "https://orcid.org/0000-9999-1234-9999", "Test User1");

    // Check that nanopub-rs/sign output exactly matches the expectation
    expect(signedRdf_rs).toBe(nanopub_rs_output);

    // Check that both nanopub-js and nanopub-rs trusty URI exactly matches
    expect(sourceUri).toBe(sourceUri_rs);
  });

  it('signedRdf contains the trusty sourceUri', async () => {
    const { signedRdf, sourceUri } = await sign(inputTrig, EXAMPLE_privateKey);
    expect(signedRdf).toContain(sourceUri);
  });

  it('signedRdf contains hasPublicKey and hasSignature triples', async () => {
    const { signedRdf } = await sign(inputTrig, EXAMPLE_privateKey);
    expect(signedRdf).toContain('hasPublicKey');
    expect(signedRdf).toContain('hasSignature');
  });

  it('signedRdf no longer contains the temp placeholder URI', async () => {
    const { signedRdf } = await sign(inputTrig, EXAMPLE_privateKey);
    expect(signedRdf).not.toContain('http://purl.org/nanopub/temp/np');
  });

  it('includes signedBy triple when orcid is provided', async () => {
    const { signedRdf } = await sign(inputTrig, EXAMPLE_privateKey, ORCID);
    expect(signedRdf).toContain('signedBy');
    expect(signedRdf).toContain(ORCID);
  });

  it('omits signedBy triple when orcid is not provided', async () => {
    const { signedRdf } = await sign(inputTrig, EXAMPLE_privateKey);
    expect(signedRdf).not.toContain('signedBy');
  });

  it('signature is a non-empty base64 string', async () => {
    const { signature } = await sign(inputTrig, EXAMPLE_privateKey);
    expect(signature.length).toBeGreaterThan(0);
    expect(() => atob(signature)).not.toThrow();
  });

  it('two calls with the same key produce the same trusty hash (RSASSA-PKCS1-v1_5 is deterministic)', async () => {
    const r1 = await sign(inputTrig, EXAMPLE_privateKey);
    const r2 = await sign(inputTrig, EXAMPLE_privateKey);
    expect(r1.sourceUri).toBe(r2.sourceUri);
    expect(r1.signature).toBe(r2.signature);
  });
});
