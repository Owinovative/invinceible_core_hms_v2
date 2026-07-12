import { Injectable, BadRequestException } from '@nestjs/common';
import type { FhirBundle, FhirResource } from './fhir.types';

@Injectable()
export class FhirValidationService {
  /**
   * Validates a FHIR CodeableConcept object before it is embedded in any
   * outbound FHIR resource.  Throws BadRequestException if:
   *   - The concept has no coding entries at all
   *   - Any coding entry is missing system or code
   *   - Any coding entry is missing display (warning-level: we enforce it for
   *     DHA compliance since the ICD-11 API always returns display names)
   *
   * NOTE: This is a hard block — incomplete concepts MUST NOT reach the DHA
   * API.  Callers should resolve the concept via the TerminologyGateway first.
   */
  validateCodeableConcept(
    concept: {
      coding?: Array<{ system?: string; code?: string; display?: string }>;
      text?: string;
    },
    fieldName: string,
  ): void {
    if (!concept.coding || concept.coding.length === 0) {
      throw new BadRequestException(
        `${fieldName}: CodeableConcept must have at least one coding entry`,
      );
    }
    for (const [i, coding] of concept.coding.entries()) {
      if (!coding.system || coding.system.trim() === '') {
        throw new BadRequestException(
          `${fieldName}.coding[${i}]: system is required`,
        );
      }
      if (!coding.code || coding.code.trim() === '') {
        throw new BadRequestException(
          `${fieldName}.coding[${i}]: code is required`,
        );
      }
      if (!coding.display || coding.display.trim() === '') {
        throw new BadRequestException(
          `${fieldName}.coding[${i}]: display is required for DHA compliance`,
        );
      }
    }
  }

  /**
   * Validates a FHIR bundle against DHA R4 rules before submission.
   */
  validateBundle(bundle: FhirBundle): void {
    if (bundle.resourceType !== 'Bundle') {
      throw new BadRequestException('Root resource must be a Bundle');
    }
    if (bundle.type !== 'transaction') {
      throw new BadRequestException('Bundle type must be transaction');
    }
    if (!bundle.entry || bundle.entry.length === 0) {
      throw new BadRequestException('Bundle must contain at least one entry');
    }

    const resources = bundle.entry
      .map((e) => e.resource)
      .filter((r): r is FhirResource => r !== undefined);
    const resourceTypes = resources.map((r) => r.resourceType);

    // DHA requires every transaction bundle for a claim to have a Claim resource
    if (resourceTypes.includes('Claim')) {
      this.validateClaimTransaction(resources);
    }
    if (
      resourceTypes.includes('Encounter') &&
      !resourceTypes.includes('Claim')
    ) {
      this.validateEncounterTransaction(resources);
    }
  }

  private validateClaimTransaction(resources: FhirResource[]): void {
    const requiredTypes = ['Patient', 'Organization', 'Claim'];
    const types = resources.map((r) => r.resourceType);

    for (const req of requiredTypes) {
      if (!types.includes(req)) {
        throw new BadRequestException(
          `Missing required resource type for claim submission: ${req}`,
        );
      }
    }

    interface EncounterResource {
      resourceType: string;
      participant?: Array<unknown>;
    }
    const encounter = resources.find(
      (r) => r.resourceType === 'Encounter',
    ) as unknown as EncounterResource;
    if (encounter?.participant?.length && !types.includes('Practitioner')) {
      throw new BadRequestException(
        'Missing required resource type for claim submission: Practitioner',
      );
    }

    interface ClaimDiagnosis {
      diagnosisCodeableConcept?: {
        coding?: Array<{ system?: string; code?: string; display?: string }>;
        text?: string;
      };
    }
    interface ClaimResource {
      resourceType: string;
      diagnosis?: ClaimDiagnosis[];
    }
    const claim = resources.find(
      (r) => r.resourceType === 'Claim',
    ) as unknown as ClaimResource;
    if (!claim.diagnosis || claim.diagnosis.length === 0) {
      throw new BadRequestException('Claim must have at least one diagnosis');
    }

    const primaryDiagConcept = claim.diagnosis[0].diagnosisCodeableConcept;
    if (!primaryDiagConcept) {
      throw new BadRequestException(
        'Claim diagnosis[0] must have a diagnosisCodeableConcept',
      );
    }

    // If the concept has coding, validate it fully; otherwise require at least text
    if (primaryDiagConcept.coding && primaryDiagConcept.coding.length > 0) {
      this.validateCodeableConcept(
        primaryDiagConcept,
        'Claim.diagnosis[0].diagnosisCodeableConcept',
      );
    } else if (!primaryDiagConcept.text) {
      throw new BadRequestException(
        'Claim must have an ICD-11 diagnosis code with display, or at minimum diagnosis text',
      );
    }
  }

  private validateEncounterTransaction(resources: FhirResource[]): void {
    const requiredTypes = [
      'Patient',
      'Organization',
      'Practitioner',
      'Encounter',
    ];
    const types = resources.map((r) => r.resourceType);

    for (const req of requiredTypes) {
      if (!types.includes(req)) {
        throw new BadRequestException(
          `Missing required resource type for encounter submission: ${req}`,
        );
      }
    }
  }
}
