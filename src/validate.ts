import type { Nanopub, ValidationOptions, ValidationResult } from './types';

export async function validate(np: Nanopub, options?: ValidationOptions): Promise<ValidationResult> {
  // TODO: implement structural, signature, SHACL validation
  return {
    structureValid: true,
    signatureValid: !!np.signature,
    shaclValid: true
  };
}
