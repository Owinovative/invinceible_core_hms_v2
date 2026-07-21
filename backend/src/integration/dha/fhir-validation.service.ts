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
    if (!bundle.entry || bundle.entry.length === 0) {
      throw new BadRequestException('Bundle must contain at least one entry');
    }

    const resources = bundle.entry
      .map((e) => e.resource)
      .filter((r): r is FhirResource => r !== undefined);
    const resourceTypes = resources.map((r) => r.resourceType);

    // DHA requires every transaction bundle for a claim to have a Claim resource
    if (resourceTypes.includes('Claim')) {
      if (bundle.type !== 'message') {
        throw new BadRequestException('SHA Claim Bundle type must be message');
      }
      this.validateClaimTransaction(bundle, resources);
    }
    if (
      resourceTypes.includes('Encounter') &&
      !resourceTypes.includes('Claim')
    ) {
      if (bundle.type !== 'transaction' && bundle.type !== 'batch') {
        throw new BadRequestException(
          'Encounter Bundle type must be transaction or batch',
        );
      }
      this.validateEncounterTransaction(resources);
    }
  }

  private validateClaimTransaction(
    bundle: FhirBundle,
    resources: FhirResource[],
  ): void {
    const requiredTypes = [
      'Patient',
      'Organization',
      'Coverage',
      'Practitioner',
      'Claim',
    ];
    const types = resources.map((r) => r.resourceType);

    for (const req of requiredTypes) {
      if (!types.includes(req)) {
        throw new BadRequestException(
          `Missing required resource type for claim submission: ${req}`,
        );
      }
    }

    if (!bundle.id || !bundle.timestamp || !bundle.meta?.profile?.length) {
      throw new BadRequestException(
        'SHA Claim Bundle requires id, timestamp, and meta.profile',
      );
    }
    const fullUrls = new Set<string>();
    for (const [index, entry] of (bundle.entry ?? []).entries()) {
      if (!entry.fullUrl) {
        throw new BadRequestException(
          `SHA Claim Bundle entry[${index}].fullUrl is required`,
        );
      }
      if (fullUrls.has(entry.fullUrl)) {
        throw new BadRequestException(
          `SHA Claim Bundle contains duplicate fullUrl ${entry.fullUrl}`,
        );
      }
      fullUrls.add(entry.fullUrl);
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
      patient?: { reference?: string };
      provider?: { reference?: string };
      careTeam?: Array<{ provider?: { reference?: string } }>;
      insurance?: Array<{ coverage?: { reference?: string } }>;
      billablePeriod?: { start?: string; end?: string };
      item?: Array<{
        sequence?: number;
        servicedPeriod?: { start?: string; end?: string };
        productOrService?: {
          coding?: Array<{ system?: string; code?: string; display?: string }>;
        };
        net?: { value?: number };
      }>;
      total?: { value?: number; currency?: string };
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
      if (
        !primaryDiagConcept.coding.some((coding) =>
          String(coding.system ?? '')
            .toLowerCase()
            .includes('icd-11'),
        )
      ) {
        throw new BadRequestException(
          'Claim diagnosis must use the DHA ICD-11 coding system',
        );
      }
    } else {
      throw new BadRequestException(
        'Claim must have an ICD-11 diagnosis code with display',
      );
    }

    const references = [
      claim.patient?.reference,
      claim.provider?.reference,
      ...(claim.careTeam ?? []).map((team) => team.provider?.reference),
      ...(claim.insurance ?? []).map(
        (insurance) => insurance.coverage?.reference,
      ),
    ].filter((reference): reference is string => Boolean(reference));
    for (const reference of references) {
      if (!fullUrls.has(reference)) {
        throw new BadRequestException(
          `Claim reference does not match a Bundle entry fullUrl: ${reference}`,
        );
      }
    }

    if (!claim.billablePeriod?.start || !claim.billablePeriod.end) {
      throw new BadRequestException(
        'Claim.billablePeriod.start and end are required',
      );
    }
    if (!claim.item?.length) {
      throw new BadRequestException(
        'Claim must contain at least one intervention item',
      );
    }
    const billableStart = claim.billablePeriod.start.slice(0, 10);
    const billableEnd = claim.billablePeriod.end.slice(0, 10);
    const sequences = new Set<number>();
    let netTotal = 0;
    for (const [index, item] of claim.item.entries()) {
      if (!item.sequence || sequences.has(item.sequence)) {
        throw new BadRequestException(
          `Claim.item[${index}] requires a unique positive sequence`,
        );
      }
      sequences.add(item.sequence);
      if (!item.servicedPeriod?.start || !item.servicedPeriod.end) {
        throw new BadRequestException(
          `Claim.item[${index}].servicedPeriod start and end are required`,
        );
      }
      const serviceStart = item.servicedPeriod.start.slice(0, 10);
      const serviceEnd = item.servicedPeriod.end.slice(0, 10);
      if (serviceStart < billableStart || serviceEnd > billableEnd) {
        throw new BadRequestException(
          `Claim.item[${index}].servicedPeriod must fall within billablePeriod`,
        );
      }
      this.validateCodeableConcept(
        item.productOrService ?? {},
        `Claim.item[${index}].productOrService`,
      );
      const net = Number(item.net?.value);
      if (!Number.isFinite(net) || net < 0) {
        throw new BadRequestException(
          `Claim.item[${index}].net.value must be a non-negative number`,
        );
      }
      netTotal += net;
    }
    if (
      !claim.total ||
      claim.total.currency !== 'KES' ||
      Math.abs(Number(claim.total.value) - netTotal) > 0.01
    ) {
      throw new BadRequestException(
        'Claim.total in KES must equal the sum of item net amounts',
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
