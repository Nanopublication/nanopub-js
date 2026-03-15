import { describe, it, expect } from 'vitest';
import { sign } from '../../src/sign/sign';
import { verifySignature } from '../../src/sign/verify';

const INPUT_TRIG_CUSTOM_2 = `<https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/Head> {
<https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/> a <http://www.nanopub.org/nschema#Nanopublication>;
    <http://www.nanopub.org/nschema#hasAssertion> <https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/assertion>;
    <http://www.nanopub.org/nschema#hasProvenance> <https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/provenance>;
    <http://www.nanopub.org/nschema#hasPublicationInfo> <https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/pubinfo>
}
<https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/assertion> {
<http://purl.org/aida/This%20is%20a%20test%20to%20check%20for%20bugs.> a <http://purl.org/petapico/o/hycl#AIDA-Sentence>;
    <http://www.w3.org/2004/02/skos/core#related> <https://w3id.org/sciencelive/np/RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123>
}
<https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/provenance> {
<https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/assertion> <http://www.w3.org/ns/prov#wasAttributedTo> <https://orcid.org/0000-9999-1234-9999>
}
<https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/pubinfo> {
<https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/> <http://purl.org/dc/terms/creator> <https://orcid.org/0000-9999-1234-9999>;
    <http://purl.org/nanopub/x/introduces> <http://purl.org/aida/This%20is%20a%20test%20to%20check%20for%20bugs.>;
    <http://purl.org/dc/terms/created> "2025-01-01T00:00:00.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>;
    <http://purl.org/dc/terms/license> <https://creativecommons.org/licenses/by/4.0/>;
    <http://purl.org/nanopub/x/hasNanopubType> <http://purl.org/petapico/o/hycl>;
    <http://purl.org/nanopub/x/wasCreatedAt> <https://platform.sciencelive4all.org>;
    <http://www.w3.org/2000/01/rdf-schema#label> "AIDA sentence: This is a test to check for bugs.";
    <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE>.
<https://orcid.org/0000-9999-1234-9999> <http://xmlns.com/foaf/0.1/name> "Test User1".
<https://w3id.org/sciencelive/np/~~~ARTIFACTCODE~~~/sig> <http://purl.org/nanopub/x/signedBy> <https://orcid.org/0000-9999-1234-9999>
}
`;

const EXPECTED_SIGNED_TRIG_CUSTOM_2 = `@prefix this: <https://w3id.org/sciencelive/np/RAGJXI0bpOiWRaTOqHN7nPt0Pz8XM8tz2P1_9T95g7N1o>.
@prefix sub: <https://w3id.org/sciencelive/np/RAGJXI0bpOiWRaTOqHN7nPt0Pz8XM8tz2P1_9T95g7N1o/>.
@prefix np: <http://www.nanopub.org/nschema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix npx: <http://purl.org/nanopub/x/>.
@prefix dc: <http://purl.org/dc/terms/>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

sub:Head {
this: np:hasAssertion sub:assertion;
    np:hasProvenance sub:provenance;
    np:hasPublicationInfo sub:pubinfo;
    a np:Nanopublication
}
sub:assertion {
<http://purl.org/aida/This%20is%20a%20test%20to%20check%20for%20bugs.> a <http://purl.org/petapico/o/hycl#AIDA-Sentence>;
    <http://www.w3.org/2004/02/skos/core#related> <https://w3id.org/sciencelive/np/RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123>
}
sub:provenance {
sub:assertion prov:wasAttributedTo <https://orcid.org/0000-9999-1234-9999>
}
sub:pubinfo {
this: dc:created "2025-01-01T00:00:00.000Z"^^xsd:dateTime;
    dc:creator <https://orcid.org/0000-9999-1234-9999>;
    dc:license <https://creativecommons.org/licenses/by/4.0/>;
    npx:hasNanopubType <http://purl.org/petapico/o/hycl>;
    npx:introduces <http://purl.org/aida/This%20is%20a%20test%20to%20check%20for%20bugs.>;
    npx:wasCreatedAt <https://platform.sciencelive4all.org>;
    <http://www.w3.org/2000/01/rdf-schema#label> "AIDA sentence: This is a test to check for bugs.";
    <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE>.
<https://orcid.org/0000-9999-1234-9999> <http://xmlns.com/foaf/0.1/name> "Test User1".
sub:sig npx:signedBy <https://orcid.org/0000-9999-1234-9999>;
    npx:hasAlgorithm "RSA";
    npx:hasPublicKey "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzUBHKF13IXaU5u9U4nYcq9QTCafI2HlYO/6C25hOVjidIYpUh/25or8sAfh6Ezq+v97aYp8NAcLNjNpv+yy5w2mnmAeUQtg6A9gSgWuPfcjh2t6xjBjof74sghjiW4xTyDZTIbCM7K/sL5LR8NCXJX1udPJR5rnY80df+gdzj3W4+l8NvdlRyEbdlncgpjxHPP98787snEN8bFEZzMUaAHRaiH+Yj99KZ/bqj/hMda1GmeJW61PALjT8rN34iDw1U2ILIeGpWPyHGL3eTgr59rsOC6F3fyWW/RCbktSmCvb/w0YqwnZb0jYeIcuVBO/5zYJlw7d8WIw38zmDf/DfYQIDAQAB";
    npx:hasSignatureTarget this:;
    npx:hasSignature "jANjWIomwPPKJrwIg1nhHTWgz7uTtrZnUOjfqO01jIdZs9H0em7fHjeK5pVqJQp1gM1Dt21xf5NWI+8RvdeBtapkd3jHovV5ZUql4dS9/w5Ve7PzyUnYrMvR+Y+vTu9n2GwN8txtN/O0WatIDeQj9wqB5cl+V+8ecYRIYJvOYgfNvwgI901/HAa5GvMpvYtAIFLmMYUuBdQ3++owskr7HM6oSQ5tGRnV4cehRehpQW15deK1CwcFzOp7Ep5fhInslGAfzcULA4wd8N4ZSnaTj3/j1Y+3HWx73wW16fBq/DYQhxhMHaUl4kcT7uRUa3je//RsV5l9Ja/MEJFPnEeYbw=="
}
`

const ORCID_CUSTOM = 'https://orcid.org/0000-9999-1234-9999';

// Fixed key for deterministic hash tests
const FIXED_PRIVATE_KEY =
  'MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNQEcoXXchdpTm71Tidhyr1BMJp8jYeVg7/oLbmE5WOJ0hilSH/bmivywB+HoTOr6/3tpinw0Bws2M2m/7LLnDaaeYB5RC2DoD2BKBa499yOHa3rGMGOh/viyCGOJbjFPINlMhsIzsr+wvktHw0JclfW508lHmudjzR1/6B3OPdbj6Xw292VHIRt2WdyCmPEc8/3zvzuycQ3xsURnMxRoAdFqIf5iP30pn9uqP+Ex1rUaZ4lbrU8AuNPys3fiIPDVTYgsh4alY/IcYvd5OCvn2uw4LoXd/JZb9EJuS1KYK9v/DRirCdlvSNh4hy5UE7/nNgmXDt3xYjDfzOYN/8N9hAgMBAAECggEANbec5/OOOjPOxKHelWZUGqRmVyCScBVSAmGZ3d7+oZIvjZemh/DfpLhjzCA70syNH6ozfZwiy1MweKyyogoSlBISyrcxFk2A4YCrVzPPWhw5AA9IaGIcd1JOU74vf8Y6JywQlcCfIVLpfYnvaBcvd6BcSD8jMD9ziDgl5koM9H5iVDAr/J7XTm7iRxT3keCmfwBSs1rI0HB156e/QvG8eX/XX4hqrTJsRzC9S6wwkD/KSxan+ZHqN5d5eRI/3g9AYXNRqj0Nq2GOR2m4yC4UbL3ua7gEGxueErbKIm6uzWnCZSSV5fWXAALCmgILHeMpMMTej9+nd9ha2D3gJAoAAQKBgQDPV2sXW97OaL7jnTKd6tFbPgjrZ4YdkP917XTpOkhldJmiwhCDWo5BUSeo0aihB0rYwDNpGNgyBA9BNM5lBSCWrpAT3FMWrsUX6Y5Lg9UBaY5eXATmqf29YZPrWHG5b0vuU4MB59GzMPzAnzlysxLarzPbQBvXSeCNwLXtTKukcQKBgQD9a0Yb7FMNNHQlG8lOkftGRRIBejt+KPpg4cLF57nZJ5xgYaky+aiJLzZaof2Tmo7tsB3tlHv59opA9BCjB6iJ23OXTuO1Z5nqwH/PLe3m9QUd3syRgJ9a04is/GdxcUWUFG8shIBn1Gv0AYvZPwYXLduvdU5mnfTwKJfClvCh8QKBgQCfG3Mniq1QcZrCadf0zMP5I4KOunN1btZKNXz4mGwDxtU6y3cGhVASmWc4qiKf50utRthsts74mprmK9KSPLwERVJ0myb7igPe1LAIDNNA8TJ6AF0WcK4xTJbJC6bBaMG40kb/CFioDFh4q/bWqMo4HChMAEcdDykNPiudPK+eUQKBgQCWKuIxm7mfIo0MjEme0Gx4uGcyDu+AE+JCVKVpRqZfYtSMXHK57S0Mlbh8vm8X70dw26LwbMOGXKySTs4o/VnGzw7RA4N1tH2FmSpjZ5EJAfpVN/g65GAJnz3nW+4kT/3uAKncVGwOmtaZke0AABOo2pjKgRXDQyiowzUirvTK0QKBgQDOKqcTGGphC1pIpF/SUtdya0YXNoNoPtFBG5YmWjW0X7MonCisR0ffMsbqJWD00q2rzNG9kTU6u/3lKHrFFVktFQRYj4DJcLBxowt2j/WNiUOekFFw/xFbTCq7Sb2IoYUnQQPETKkrSq1WaAJ30rQRjhbXlpTPBOXj+tUrZ/BS+w==';


const INPUT_TRIG_PLACEHOLDER = `<https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/Head> {
<https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/> a <http://www.nanopub.org/nschema#Nanopublication>;
    <http://www.nanopub.org/nschema#hasAssertion> <https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/assertion>;
    <http://www.nanopub.org/nschema#hasProvenance> <https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/provenance>;
    <http://www.nanopub.org/nschema#hasPublicationInfo> <https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/pubinfo>
}
<https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/assertion> {
<http://example.org/s> <http://example.org/p> <http://example.org/o>
}
<https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/provenance> {
<https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/assertion> <http://www.w3.org/ns/prov#wasAttributedTo> <https://orcid.org/0000-9999-1234-9999>
}
<https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/pubinfo> {
<https://w3id.org/sciencelive/np/ARTIFACTCODE-PLACEHOLDER/> <http://purl.org/dc/terms/created> "2025-01-01T00:00:00.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>
}
`;

describe('sign() with custom URI prefix', () => {
  it('outputs a URI with the same custom URI prefix as the sub correctly', async () => {
    const { signedRdf } = await sign(INPUT_TRIG_CUSTOM_2, FIXED_PRIVATE_KEY, ORCID_CUSTOM);

    expect(signedRdf).toBe(EXPECTED_SIGNED_TRIG_CUSTOM_2);
  });
});

describe('sign() with deprecated ARTIFACTCODE-PLACEHOLDER', () => {
  it('strips placeholder and produces a trusty URI with the custom base', async () => {
    const { sourceUri, signedRdf } = await sign(INPUT_TRIG_PLACEHOLDER, FIXED_PRIVATE_KEY, ORCID_CUSTOM);
    expect(sourceUri).toMatch(/^https:\/\/w3id\.org\/sciencelive\/np\/RA/);
    expect(signedRdf).not.toContain('ARTIFACTCODE-PLACEHOLDER');
  });

  it('two calls with same key produce same trusty hash', async () => {
    const r1 = await sign(INPUT_TRIG_PLACEHOLDER, FIXED_PRIVATE_KEY, ORCID_CUSTOM);
    const r2 = await sign(INPUT_TRIG_PLACEHOLDER, FIXED_PRIVATE_KEY, ORCID_CUSTOM);
    expect(r1.sourceUri).toBe(r2.sourceUri);
  });
});

describe('verifySignature() for custom URI nanopub', () => {
  it('verifies a nanopub signed with ~~~ARTIFACTCODE~~~ placeholder', async () => {
    const { signedRdf } = await sign(INPUT_TRIG_CUSTOM_2, FIXED_PRIVATE_KEY, ORCID_CUSTOM);
    const result = await verifySignature(signedRdf);
    expect(result.valid).toBe(true);
  });

  it('verifies a nanopub signed with deprecated ARTIFACTCODE-PLACEHOLDER', async () => {
    const { signedRdf } = await sign(INPUT_TRIG_PLACEHOLDER, FIXED_PRIVATE_KEY, ORCID_CUSTOM);
    const result = await verifySignature(signedRdf);
    expect(result.valid).toBe(true);
  });
});
