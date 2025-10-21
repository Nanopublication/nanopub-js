export async function validate(np, options) {
    // TODO: implement structural, signature, SHACL validation
    return {
        structureValid: true,
        signatureValid: !!np.signature,
        shaclValid: true
    };
}
