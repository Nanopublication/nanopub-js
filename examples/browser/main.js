import { NanopubClass, NanopubClient } from '@nanopub/nanopub-js';

let nanopub;

// Search nanopubs with text
export async function searchText(text, node) {
  node.textContent = 'Searching nanopubs…\n';

  const client = new NanopubClient({
    endpoints: ['https://query.knowledgepixels.com/'],
  });

  let count = 0;

  for await (const row of client.findNanopubsWithText(text)) {
    node.textContent += JSON.stringify(row, null, 2) + '\n\n';
    if (++count >= 5) break;
  }

  if (count === 0) {
    node.textContent += 'No results.\n';
  }
}

document.getElementById('sign').onclick = async () => {
  // Sign nanopub
  await nanopub.sign();
  out.textContent = JSON.stringify(nanopub, null, 2);
};
document.getElementById('publish').onclick = async () => {
  // publish nanopub
  const TEST_ENDPOINT = 'https://test.registry.knowledgepixels.com/np/';

  let result;

  console.log(nanopub.rdf());

  let message = '';

  try {
    result = await nanopub.publish(TEST_ENDPOINT);
    message = `Published nanopub at: ${result.uri}\n\n`;
  } catch (err) {
    message = `Error publishing nanopub: ${err}\n\n`;
  }

  out.textContent = message;
};
document.getElementById('run-search').onclick = () =>{
  const text = document.getElementById('search').value;
  searchText(text, document.getElementById('out'));
}
const out = document.getElementById('out');

document.getElementById('create').onclick = async () => {
  out.textContent = 'Creating nanopub…';

  try {
    // Create Nanopub from RDF
    const privateKey = `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCjY1gsFxmak6SOCouJPuEzHNForkqFhgfHE3aAIAx+Y5q6UDEDM9Q0EksheNffJB4iPqsAfiFpY0ARQY92K5r8P4+a78eu9reYrb2WxZb1qPJmvR7XZ6sN1oHD7dd/EyQoJmQsmOKdrqaLRbzR7tZrf52yvKkwNWXcIVhW8uxe7iUgxiojZpW9srKoK/qFRpaUZSKn7Z/zgtDH9FJkYbBsGPDMqp78Kzt+sJb+U2W+wCSSy34jIUxx6QRbzvn6uexc/emFw/1DU5y7zBudhgC7mVk8vX1gUNKyjZBzlOmRcretrANgffqs5fx/TMHN1xtkA/H1u1IKBfKoyk/xThMLAgMBAAECggEAECuG0GZA3HF8OaqFgMG+W+agOvH04h4Pqv4cHjYNxnxpFcNV9nEssTKWSOvCwYy7hrwZBGV3PQzbjFmmrxVFs20+8yCD7KbyKKQZPVC0zf84bj6NTNgvr6DpGtDxINxuGaMjCt7enqhoRyRRuZ0fj2gD3Wqae/Ds8cpDCefkyMg0TvauHSUj244vGq5nt93txUv1Sa+/8tWZ77Dm0s5a3wUYB2IeAMl5WrO2GMvgzwH+zT+4kvNWg5S0Ze4KE+dG3lSIYZjo99h14LcQS9eALC/VBcAJ6pRXaCTT/TULtcLNeOpoc9Fu25f0yTsDt6Ga5ApliYkb7rDhV+OFrw1sYQKBgQDCE9so+dPg7qbp0cV+lbb7rrV43m5s9Klq0riS7u8m71oTwhmvm6gSLfjzqb8GLrmflCK4lKPDSTdwyvd+2SSmOXySw94zr1Pvc7sHdmMRyA7mH3m+zSOOgyCTTKyhDRCNcRIkysoL+DecDhNo4Fumf71tsqDYogfxpAQhn0re8wKBgQDXhMmmT2oXiMnYHhi2k7CJe3HUqkZgmW4W44SWqKHp0V6sjcHm0N0RT5Hz1BFFUd5Y0ZB3JLcah19myD1kKYCj7xz6oVLb8O7LeAZNlb0FsrtD7NU+Hciywo8qESiA7UYDkU6+hsmxaI01DsttMIdG4lSBbEjA7t4IQC5lyr7xiQKBgQCN87YGJ40Y5ZXCSgOZDepz9hqX2KGOIfnUv2HvXsIfiUwqTXs6HbD18xg3KL4myIBOvywSM+4ABYp+foY+Cpcq2btLIeZhiWjsKIrw71+Q/vIe0YDb1PGf6DsoYhmWBpdHzR9HN+hGjvwlsYny2L9Qbfhgxxmsuf7zeFLpQLijjwKBgH7TD28k8IOk5VKec2CNjKd600OYaA3UfCpP/OhDl/RmVtYoHWDcrBrRvkvEEd2/DZ8qw165Zl7gJs3vK+FTYvYVcfIzGPWA1KU7nkntwewmf3i7V8lT8ZTwVRsmObWU60ySJ8qKuwoBQodki2VX12NpMN1wgWe3qUUlr6gLJU4xAoGAet6nD3QKwk6TTmcGVfSWOzvpaDEzGkXjCLaxLKh9GreM/OE+h5aN2gUoFeQapG5rUwI/7Qq0xiLbRXw+OmfAoV2XKv7iI8DjdIh0F06mlEAwQ/B0CpbqkuuxphIbchtdcz/5ra233r3BMNIqBl3VDDVoJlgHPg9msOTRy13lFqc=`;

    nanopub = NanopubClass.fromRdf(
      `@prefix : <http://purl.org/nanopub/temp/mynanopub#> .
@prefix np: <http://www.nanopub.org/nschema#> .
@prefix npx: <http://purl.org/nanopub/x/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix ex: <http://example.org/> .
:Head {
    : np:hasAssertion :assertion ;
        np:hasProvenance :provenance ;
        np:hasPublicationInfo :pubinfo ;
        a np:Nanopublication .
}
:assertion {
    ex:mosquito ex:transmits ex:malaria .
}
:provenance {
    :assertion prov:hadPrimarySource <http://dx.doi.org/10.3233/ISU-2010-0613> .
}
:pubinfo {
    : a npx:ExampleNanopub .
}`,
      'trig',
      {
        name: 'Hello from nanopub-js test',
        orcid: 'https://orcid.org/0000-0000-0000-0000',
        privateKey,
      },
    );

    out.textContent = JSON.stringify(nanopub, null, 2);
  } catch (err) {
    out.textContent = err.stack || err.toString();
  }
};
