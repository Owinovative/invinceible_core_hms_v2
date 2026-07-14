import type { IntegrationCallContext } from '../integration.types';
import type { DhaEclaimsCommand } from './eclaims-contract';
import type {
  FhirAuditEvent,
  FhirBundle,
  FhirConsent,
  FhirCoverageEligibilityRequest,
  FhirEncounter,
  FhirServiceRequest,
} from './fhir.types';

export interface DhaResult<T = unknown> {
  status:
    | 'VERIFIED'
    | 'NOT_FOUND'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'ELIGIBLE'
    | 'SETTLED'
    | 'NOT_ELIGIBLE'
    | 'SUCCESS'
    | 'FAILED';
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
  memberNumber?: string;
  nationalId?: string;
  serviceDate?: string;
  interventionCode?: string;
}

export interface PatientContact {
  contact_id: number;
  contact_value: string;
}

export interface SendOtpRequest {
  patient_id: string;
  intervention_codes: string[];
  contact_id: number;
}

export interface SendOtpResponse {
  consent_request_id: string;
  status: string;
}

export interface AuthorizeConsentRequest {
  patient_id: string;
  /** OTP flow: DHA requires `otp` and `interventions`. */
  otp?: string;
  /** Biometrics flow: DHA supplies an authorization GUID. */
  auth_guid?: string;
  interventions: string[];
  service_type: 'INPATIENT' | 'OUTPATIENT';
  practitioner_identification_type?: string;
  practitioner_identification_number?: string;
  practitioner_regulation_body?: string;
}

export interface AuthorizeConsentResponse {
  consent_token: string;
  auth_guid?: string;
  status: string;
  expires_at: string;
}

export interface SendDischargeOtpRequest {
  patient_id: string;
  contact_id: number;
  otp_type: 'discharge';
  encounter_id: string;
  service_type: 'INPATIENT' | 'OUTPATIENT';
}

/** Decrypted only inside the durable worker immediately before multipart submission. */
export interface DhaMultipartAttachment {
  consentToken: string;
  documentType: string;
  interventionCode: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
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

  executeEclaims(
    command: DhaEclaimsCommand,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  /** Official POST /claims/attachments multipart contract. */
  uploadClaimAttachment(
    attachment: DhaMultipartAttachment,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  submitAuditEvent(
    event: FhirAuditEvent,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  pollClaimResponse(
    claimNumber: string,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult>;

  // --- Consent Management ---

  getPatientContacts(
    patientId: string,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<PatientContact[]>>;

  sendVisitOtp(
    request: SendOtpRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<SendOtpResponse>>;

  createAuthorization(
    request: AuthorizeConsentRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<AuthorizeConsentResponse>>;

  sendDischargeOtp(
    request: SendDischargeOtpRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<SendOtpResponse>>;
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
