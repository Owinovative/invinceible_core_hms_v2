import { randomUUID } from 'crypto';
import type {
  DhaClientPort,
  DhaResult,
  EligibilityQuery,
  FacilityVerificationQuery,
  PatientVerificationQuery,
  PractitionerVerificationQuery,
} from '../dha.types';
import type { FhirCoverageEligibilityRequest } from '../fhir.types';

/**
 * Deterministic DHA adapter used until production DHA endpoints and
 * credentials are available. Accepts everything except a reserved set of
 * "unknown" identifiers so both happy and negative paths are testable.
 * Replaced by DhaHttpClient purely via configuration.
 */
export class DhaMockClient implements DhaClientPort {
  /** Identifiers that simulate a not-found/ineligible response. */
  static readonly UNKNOWN_MARKER = 'UNKNOWN';

  private ref(prefix: string): string {
    return `${prefix}-MOCK-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private isUnknown(value?: string): boolean {
    return (value ?? '').toUpperCase().includes(DhaMockClient.UNKNOWN_MARKER);
  }

  verifyPatient(query: PatientVerificationQuery): Promise<DhaResult> {
    const unknown =
      this.isUnknown(query.nationalId) ||
      this.isUnknown(query.shaNumber) ||
      this.isUnknown(query.patientNumber);
    return Promise.resolve(
      unknown
        ? { status: 'NOT_FOUND', raw: { mock: true } }
        : {
            status: 'VERIFIED',
            externalRef: this.ref('PAT'),
            data: { crNumber: this.ref('CR') },
            raw: { mock: true },
          },
    );
  }

  verifyPractitioner(query: PractitionerVerificationQuery): Promise<DhaResult> {
    return Promise.resolve(
      this.isUnknown(query.registrationNumber)
        ? { status: 'NOT_FOUND', raw: { mock: true } }
        : {
            status: 'VERIFIED',
            externalRef: this.ref('PRAC'),
            data: { licenseStatus: 'ACTIVE' },
            raw: { mock: true },
          },
    );
  }

  verifyFacility(query: FacilityVerificationQuery): Promise<DhaResult> {
    return Promise.resolve(
      this.isUnknown(query.facilityCode)
        ? { status: 'NOT_FOUND', raw: { mock: true } }
        : {
            status: 'VERIFIED',
            externalRef: this.ref('FAC'),
            data: { kmhflCode: query.facilityCode, licenseStatus: 'ACTIVE' },
            raw: { mock: true },
          },
    );
  }

  checkEligibility(
    request: FhirCoverageEligibilityRequest | EligibilityQuery,
  ): Promise<DhaResult> {
    const rawMemberNumber = (request as { memberNumber?: unknown })
      .memberNumber;
    const memberNumber =
      typeof rawMemberNumber === 'string' ? rawMemberNumber : undefined;
    return Promise.resolve(
      this.isUnknown(memberNumber)
        ? { status: 'NOT_ELIGIBLE', raw: { mock: true } }
        : {
            status: 'ELIGIBLE',
            externalRef: this.ref('ELIG'),
            data: { scheme: 'SHA-PRIMARY', active: true },
            raw: { mock: true },
          },
    );
  }

  submitEncounter(): Promise<DhaResult> {
    return Promise.resolve({
      status: 'ACCEPTED',
      externalRef: this.ref('ENC'),
      raw: { mock: true },
    });
  }

  exchangeHealthRecord(): Promise<DhaResult> {
    return Promise.resolve({
      status: 'ACCEPTED',
      externalRef: this.ref('DOC'),
      raw: { mock: true },
    });
  }

  submitReferral(): Promise<DhaResult> {
    return Promise.resolve({
      status: 'ACCEPTED',
      externalRef: this.ref('REF'),
      raw: { mock: true },
    });
  }

  recordConsent(): Promise<DhaResult> {
    return Promise.resolve({
      status: 'ACCEPTED',
      externalRef: this.ref('CON'),
      raw: { mock: true },
    });
  }

  submitClaim(): Promise<DhaResult> {
    return Promise.resolve({
      status: 'ACCEPTED',
      externalRef: this.ref('CLM'),
      raw: { mock: true },
    });
  }

  submitAuditEvent(): Promise<DhaResult> {
    return Promise.resolve({
      status: 'ACCEPTED',
      externalRef: this.ref('AUD'),
      raw: { mock: true },
    });
  }
}
