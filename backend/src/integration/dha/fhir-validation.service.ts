import { Injectable, BadRequestException } from '@nestjs/common';
import type { FhirBundle, FhirResource } from './fhir.types';

@Injectable()
export class FhirValidationService {
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

    const resources = bundle.entry.map((e) => e.resource).filter((r): r is FhirResource => r !== undefined);
    const resourceTypes = resources.map((r) => r.resourceType);

    // DHA requires every transaction bundle for a claim to have a Claim resource
    if (resourceTypes.includes('Claim')) {
      this.validateClaimTransaction(resources);
    }
    if (resourceTypes.includes('Encounter') && !resourceTypes.includes('Claim')) {
      this.validateEncounterTransaction(resources);
    }
  }

  private validateClaimTransaction(resources: FhirResource[]): void {
    const requiredTypes = ['Patient', 'Organization', 'Practitioner', 'Encounter', 'Claim'];
    const types = resources.map((r) => r.resourceType);

    for (const req of requiredTypes) {
      if (!types.includes(req)) {
        throw new BadRequestException(`Missing required resource type for claim submission: ${req}`);
      }
    }

    const claim = resources.find((r) => r.resourceType === 'Claim') as any;
    if (!claim.diagnosis || claim.diagnosis.length === 0) {
      throw new BadRequestException('Claim must have at least one diagnosis');
    }
    const icd11 = claim.diagnosis[0].diagnosisCodeableConcept?.coding?.find((c: any) => c.system?.includes('icd-11'));
    if (!icd11) {
      throw new BadRequestException('Claim must have an ICD-11 diagnosis code');
    }
  }

  private validateEncounterTransaction(resources: FhirResource[]): void {
    const requiredTypes = ['Patient', 'Organization', 'Practitioner', 'Encounter'];
    const types = resources.map((r) => r.resourceType);

    for (const req of requiredTypes) {
      if (!types.includes(req)) {
        throw new BadRequestException(`Missing required resource type for encounter submission: ${req}`);
      }
    }
  }
}
