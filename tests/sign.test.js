import { describe, it, expect } from "vitest";
import { NanopubClass } from "../src/nanopub";
import { verifySignature } from "../src/sign";
import { DataFactory } from "n3";

const { namedNode, literal, quad } = DataFactory;

// ---- RSA test keypair (for testing) ----
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQC5fAFN3PaW+9CwSKJp3jTRTNcENUzzIlWe8izu9ngQacVb0Vk2
hTfOj+LclTk1R6C6ySgdgHt1jHS4tQJsY83XZVBjavjxskhi2Tux3TXjtvgjWWbM
Vlx2CmyACib5kkr5aUFdG//R9zc7JK6i9kRDMKKTielpKgGw/DwHyOKxwQIDAQAB
AoGAL92oPxP4OYN2Kp/QPRpV4Ofp2DOUZCQNADFFhbp1IPlAgruRqsO3UP/U4E3O
K3Zp28Ax6JSIXeXhxJoxCzgExX4HH+IUuOYvF6u6riaxFikLBGLmd94t74+WcTkP
vEKSxfVjtaCviu4lc6+4Vn8Bvt4Ycn3WgKFaV23YAofkKakCQQDuQCSh149fNfq+
sdR8zCrbGyPqsT2g5P0qry+7wFGnoWbOo6+Yxt/enrmwUg1MLLEQJpJHzY4cy1CO
NMuDtDx/AkEAycwOvyMHcVCgbsTKi6gQmZvqrW9gPIqwRjStMsGD0NTTDQQAfWCi
VtA7p/bFrHmWn5A0+cfala7NUjH3HTuCpwJBAL0Z+ytl27EBiLG/Q8VUq1SfQhBc
z/gnBbVg7Sctijgzi2OQaWlUFcS3lrm4sT/qsZ3xRxYpCI1kP6ReWav88nUCQHY3
2Kf43XQwBvjLPf0+ooAlSQx2HAwndOcHSWeJYTRuJzRQNZykU9B6M9ceFbOIlPJ0
D2Qz/kti7VAMYFjLqBkCQGveqrgvMua2WtPsVasKP2TuLxXld1rTi1g+ghpT3GYk
s/zV4oa9GnJwYgZ7tfI1Stlf6lVIHXtwyjKhMZViBTQ=
-----END RSA PRIVATE KEY-----`;

const ORCID = "0000-0000-0000-0000";
const NAME = "Test User";

describe("Nanopub signature integration", () => {
  it("produces a valid signature that verifies correctly", async () => {
    const assertionQuad = quad(
      namedNode("https://example.org/s"),
      namedNode("https://example.org/p"),
      literal("o")
    );

    const np = NanopubClass.create([assertionQuad], {
      privateKey: PRIVATE_KEY,
      name: NAME,
      orcid: ORCID,
    });

    await np.sign();

    expect(np.signature).toBeTruthy();

    const quads = [...np.assertion, ...np.provenance, ...np.pubinfo];
    const valid = await verifySignature(quads);

    expect(valid).toBe(true);
  }, 30000);

  it("fails verification if one quad is altered", async () => {
    const assertionQuad = quad(
      namedNode("https://example.org/s"),
      namedNode("https://example.org/p"),
      literal("o")
    );

    const np = NanopubClass.create([assertionQuad], {
      privateKey: PRIVATE_KEY,
      name: NAME,
      orcid: ORCID,
    });

    await np.sign();
    expect(np.signature).toBeTruthy();

    let quads = [...np.assertion, ...np.provenance, ...np.pubinfo];

    quads = quads.map((q) =>
      q.object.value === "o"
        ? quad(q.subject, q.predicate, literal("TAMPERED!"), q.graph)
        : q
    );

    const valid = await verifySignature(quads);

    expect(valid).toBe(false);
  }, 30000);
});
