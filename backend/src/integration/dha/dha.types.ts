import type { IntegrationCallContext } from '../integration.types';
import type {
  FhirAuditEvent,
  FhirBundle,
  FhirConsent,
  FhirCoverageEligibilityRequest,
  FhirEncounter,
  FhirServiceRequest,
} from './fhir.types';

export interface DhaResult<T = unknown> {
  /** Normalized outcome the HMS acts on. */
  status:
    | 'VERIFIED'
    | 'NOT_FOUND'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'ELIGIBLE'
    | 'NOT_ELIGIBLE';
  /** DHA-side identifier for the interaction, when provided. */
  externalRef?: string;
  data?: T;
  raw?: unknown;
}

export interface PatientVerificationQuery {
  nationalId?: string;
  shaNumber?: string;
  patientNumber?: string;
  phoneNumber?: string;
}

export interface PractitionerVerificationQuery {
  registrationNumber: string;
  board?: string;
}

export interface FacilityVerificationQuery {
  facilityCode: string;
}

export interface EligibilityQuery {
  memberNumber: string;
  serviceDate?: string;
  interventionCode?: string;
}

/**
 * Port implemented by every DHA adapter (mock, sandbox, production).
 * Business modules depend on this interface via the DHA_CLIENT token; the
 * concrete adapter is selected purely by configuration, so real endpoints
 * replace mocks without touching business logic.
 */
export interface DhaClientPort {
  verifyPatient(
    query: PatientVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  verifyPractitioner(
    query: PractitionerVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  verifyFacility(
    query: FacilityVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  checkEligibility(
    request: FhirCoverageEligibilityRequest | EligibilityQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  submitEncounter(
    encounter: FhirEncounter | FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  /** Digital health record exchange: pushes a document bundle to the HIE. */
  exchangeHealthRecord(
    bundle: FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  submitReferral(
    referral: FhirServiceRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  recordConsent(
    consent: FhirConsent,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  /** SHA/DHA claim submission (FHIR Claim bundle). */
  submitClaim(
    bundle: FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  submitAuditEvent(
    event: FhirAuditEvent,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;
}

export class DhaApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
    readonly retryable: boolean = true,
  ) {
    super(message);
    this.name = 'DhaApiError';
  }
}
