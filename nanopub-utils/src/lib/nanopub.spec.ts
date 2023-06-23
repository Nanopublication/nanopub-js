import {expect, test} from '@jest/globals'
import {Parser, Store} from 'n3'
import {Nanopub} from './nanopub'

const checkValid = (np: Nanopub, testUrl = npTestUrl) => {
  expect(np.uri).toBe(testUrl)
  expect(np.rdfString.length).toBeGreaterThan(10)
  expect(np.store.size).toBeGreaterThan(10)
}

const npTestUrl = 'http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU'

test('construct np from string sync', () => {
  const np = new Nanopub(validNpStr)
  checkValid(np)
})

test('fetch np', async () => {
  const np = await Nanopub.fetch(npTestUrl)
  checkValid(np)
})

test('parse np from string', async () => {
  const np = await Nanopub.parse(validNpStr)
  checkValid(np)
  expect(np.dateCreated).toBe('2023-02-21T11:15:07.732162')
  expect(np.author).toBe('https://orcid.org/0000-0002-1501-1082')
})

test('parse np from store', async () => {
  const parser = new Parser()
  const store = new Store(parser.parse(validNpStr))

  const np = await Nanopub.parse(store)
  checkValid(np)
})

test('parse np and get display', async () => {
  const np = await Nanopub.parse(validNpStr)
  checkValid(np)
  expect(np.display().get('assertion')?.size).toBeGreaterThan(0)
})

test('fail parsing np from wrong RDF', async () => {
  expect.assertions(1)
  try {
    await Nanopub.parse(wrongNpMissUri)
  } catch (e: any) {
    expect(e.message).toBe('Could not extract the Nanopub URI')
  }
})

const wrongNpMissUri = `@prefix biolink: <https://w3id.org/biolink/vocab/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix infores: <https://w3id.org/biolink/infores/> .
@prefix np: <http://www.nanopub.org/nschema#> .
@prefix npx: <http://purl.org/nanopub/x/> .
@prefix orcid: <https://orcid.org/> .
@prefix pav: <http://purl.org/pav/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix sub: <http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU#> .
@prefix tao: <http://pubannotation.org/ontology/tao.owl#> .
@prefix this: <http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU> .
@prefix umls: <http://identifiers.org/umls/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
sub:Head {
  this: np:hasAssertion sub:assertion ;
    np:hasProvenance sub:provenance ;
    np:hasPublicationInfo sub:pubinfo .
}
sub:assertion {
  sub:_1 rdf:object <http://purl.obolibrary.org/obo/MONDO_0007079> ;
    rdf:predicate biolink:treats ;
    rdf:subject umls:C0355800 ;
    a biolink:Association ;
    biolink:aggregator_knowledge_source infores:knowledge-collaboratory ;
    biolink:category "biolink:Association" ;
    biolink:id "collaboratory:UMLS:C0355800-biolink:treats-MONDO:0007079" ;
    biolink:publications <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=49aa3d6d-2270-4615-aafa-b440859ab870> .
}
sub:provenance {
  sub:assertion prov:generatedAtTime "2023-02-21T11:15:07.732162"^^xsd:dateTime ;
    prov:wasAttributedTo orcid:0000-0002-1501-1082 .
}
sub:pubinfo {
  sub:sig npx:hasAlgorithm "RSA" ;
    npx:hasPublicKey "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCR9fz0fKCdWOWC+pxhkQhEM/ppbdIYe5TLSdj+lJzSlv9mYBaPgrzVezSwwbmhlHBPDZa4/vHycU315BdmUGq+pXllp9+rWFfrb+kBJwhZjpG6BeyyXBsRFz4jmQVxl/ZYHilQTh/XalYzKkEAyTiEMPee4Kz61PaWOKH24CsnOQIDAQAB" ;
    npx:hasSignature "jjrkdlQ340JSloOmL24tOZkKnMuDl6ztapHOi/2tlnabownWOKUPtilPVMvFd4Hsz6bLfB+bk59rlDz3Qb02H7lhJAH6C75LiFKiddbvPA+8VYXYOZmBJNwmsC45ScB1gm3yJlJRPMKm1/uIFYXg7Wfx4+ukoSInbZ/wgzff0vg=" ;
    npx:hasSignatureTarget this: .
  this: prov:generatedAtTime "2023-02-21T11:15:07.732162"^^xsd:dateTime ;
    prov:wasAttributedTo orcid:0000-0002-1501-1082 .
}`

const validNpStr = `@prefix biolink: <https://w3id.org/biolink/vocab/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix infores: <https://w3id.org/biolink/infores/> .
@prefix np: <http://www.nanopub.org/nschema#> .
@prefix npx: <http://purl.org/nanopub/x/> .
@prefix orcid: <https://orcid.org/> .
@prefix pav: <http://purl.org/pav/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix sub: <http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU#> .
@prefix tao: <http://pubannotation.org/ontology/tao.owl#> .
@prefix this: <http://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU> .
@prefix umls: <http://identifiers.org/umls/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
sub:Head {
  this: np:hasAssertion sub:assertion ;
    np:hasProvenance sub:provenance ;
    np:hasPublicationInfo sub:pubinfo ;
    a np:Nanopublication .
}
sub:assertion {
  umls:C0355800 a biolink:ChemicalEntity ;
    rdfs:label "Naltrexone hydrochloride" ;
    biolink:category "biolink:ChemicalEntity" ;
    biolink:id "UMLS:C0355800" .
  <http://purl.obolibrary.org/obo/MONDO_0007079> a biolink:DiseaseOrPhenotypicFeature ;
    rdfs:label "alcohol dependence" ;
    biolink:category "biolink:DiseaseOrPhenotypicFeature" ;
    biolink:id "MONDO:0007079" .
  sub:_1 rdf:object <http://purl.obolibrary.org/obo/MONDO_0007079> ;
    rdf:predicate biolink:treats ;
    rdf:subject umls:C0355800 ;
    a biolink:Association ;
    biolink:aggregator_knowledge_source infores:knowledge-collaboratory ;
    biolink:category "biolink:Association" ;
    biolink:id "collaboratory:UMLS:C0355800-biolink:treats-MONDO:0007079" ;
    biolink:publications <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=49aa3d6d-2270-4615-aafa-b440859ab870> .
  <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=49aa3d6d-2270-4615-aafa-b440859ab870> a biolink:Publication ;
    biolink:category "biolink:Publication" ;
    biolink:id "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=49aa3d6d-2270-4615-aafa-b440859ab870" .
  infores:knowledge-collaboratory a biolink:InformationResource ;
    biolink:category "biolink:InformationResource" ;
    biolink:id "infores:knowledge-collaboratory" .
}
sub:provenance {
  sub:_2 tao:begins_at 0 ;
    tao:denotes umls:C0355800 ;
    tao:ends_at 24 ;
    tao:has_value "Naltrexone hydrochloride" ;
    tao:part_of <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=49aa3d6d-2270-4615-aafa-b440859ab870> ;
    a tao:text_span .
  sub:_3 tao:begins_at 76 ;
    tao:denotes <http://purl.obolibrary.org/obo/MONDO_0007079> ;
    tao:ends_at 94 ;
    tao:has_value "alcohol dependence" ;
    tao:part_of <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=49aa3d6d-2270-4615-aafa-b440859ab870> ;
    a tao:text_span .
  sub:assertion prov:generatedAtTime "2023-02-21T11:15:07.732162"^^xsd:dateTime ;
    prov:wasAttributedTo orcid:0000-0002-1501-1082 .
  <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=49aa3d6d-2270-4615-aafa-b440859ab870> tao:has_value "Naltrexone hydrochloride tablets USP 50 mg is indicated in the treatment of alcohol dependence" ;
    a tao:document_text ;
    rdfs:seeAlso <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=49aa3d6d-2270-4615-aafa-b440859ab870> .
}
sub:pubinfo {
  sub:sig npx:hasAlgorithm "RSA" ;
    npx:hasPublicKey "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCR9fz0fKCdWOWC+pxhkQhEM/ppbdIYe5TLSdj+lJzSlv9mYBaPgrzVezSwwbmhlHBPDZa4/vHycU315BdmUGq+pXllp9+rWFfrb+kBJwhZjpG6BeyyXBsRFz4jmQVxl/ZYHilQTh/XalYzKkEAyTiEMPee4Kz61PaWOKH24CsnOQIDAQAB" ;
    npx:hasSignature "jjrkdlQ340JSloOmL24tOZkKnMuDl6ztapHOi/2tlnabownWOKUPtilPVMvFd4Hsz6bLfB+bk59rlDz3Qb02H7lhJAH6C75LiFKiddbvPA+8VYXYOZmBJNwmsC45ScB1gm3yJlJRPMKm1/uIFYXg7Wfx4+ukoSInbZ/wgzff0vg=" ;
    npx:hasSignatureTarget this: .
  this: dct:conformsTo biolink: ;
    prov:generatedAtTime "2023-02-21T11:15:07.732162"^^xsd:dateTime ;
    prov:wasAttributedTo orcid:0000-0002-1501-1082 .
  biolink: pav:version "3.1.0" .
}`
