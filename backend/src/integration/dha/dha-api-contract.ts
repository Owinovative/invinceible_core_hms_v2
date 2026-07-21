import type { HttpMethod } from '../integration.types';
import { DhaApiError } from './dha.types';

export type DhaApiPayload = Record<string, unknown>;

interface DhaApiOperationContract {
  method: HttpMethod;
  path: string;
  transport: 'query' | 'json' | 'multipart';
  required: readonly string[];
  anyOf?: readonly (readonly string[])[];
}

/**
 * Allowlisted DHA HIE operations from the July 2026 API catalog. Keeping the
 * route table closed prevents callers from turning the integration into an
 * authenticated arbitrary-request proxy.
 */
export const DHA_API_OPERATIONS = {
  BENEFITS: {
    method: 'GET',
    path: '/patients/benefits',
    transport: 'query',
    required: ['patient_id'],
  },
  SUB_BENEFITS: {
    method: 'GET',
    path: '/patients/sub-benefits',
    transport: 'query',
    required: ['patient_id'],
  },
  INTERVENTION_COVERAGE: {
    method: 'GET',
    path: '/patients/benefits/interventions',
    transport: 'query',
    required: ['patient_id', 'sub_benefit_code'],
  },
  BENEFIT_UTILIZATION: {
    method: 'GET',
    path: '/patients/benefits/utilization',
    transport: 'query',
    required: ['patient_id'],
  },
  POMSF_BALANCE: {
    method: 'GET',
    path: '/patients/pomsf-balances',
    transport: 'query',
    required: ['patient_id'],
  },
  AUTHORIZATION_STATUS: {
    method: 'GET',
    path: '/claims/authorizations',
    transport: 'query',
    required: ['guid', 'patient_id', 'token'],
  },
  START_VISIT: {
    method: 'POST',
    path: '/claims/visit',
    transport: 'json',
    required: ['patient_id', 'intervention_codes', 'service_type'],
    anyOf: [['otp'], ['auth_guid']],
  },
  CREATE_PREAUTH: {
    method: 'POST',
    path: '/preauths',
    transport: 'json',
    required: ['consent_token', 'intervention_code'],
  },
  CREATE_SPECIALIZED_PREAUTH: {
    method: 'POST',
    path: '/preauths',
    transport: 'multipart',
    required: ['consent_token', 'intervention_code', 'preauth_type'],
  },
  LIST_PREAUTHS: {
    method: 'GET',
    path: '/preauths',
    transport: 'query',
    required: [],
  },
  CANCEL_PREAUTH: {
    method: 'POST',
    path: '/preauths/cancel',
    transport: 'json',
    required: ['consent_token', 'preauth_id'],
  },
  REMOVE_PREAUTH_DIAGNOSIS: {
    method: 'DELETE',
    path: '/preauths/diagnoses/{icd_code}',
    transport: 'query',
    required: ['icd_code', 'consent_token'],
  },
  REMOVE_PREAUTH_DOCTOR: {
    method: 'DELETE',
    path: '/preauths/doctors',
    transport: 'json',
    required: ['consent_token', 'doctor_id'],
  },
  ADD_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions',
    transport: 'json',
    required: ['consent_token', 'intervention_code'],
  },
  RETIRE_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/retire',
    transport: 'json',
    required: ['consent_token', 'intervention_code'],
  },
  RESTORE_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/restore',
    transport: 'json',
    required: ['consent_token', 'intervention_code'],
  },
  SWITCH_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/switch',
    transport: 'json',
    required: [
      'consent_token',
      'retire_intervention_code',
      'new_intervention_code',
    ],
  },
  ADD_CLAIM_LINE: {
    method: 'POST',
    path: '/claims/lines',
    transport: 'json',
    required: ['consent_token', 'intervention_code', 'unit_price', 'quantity'],
  },
  ADD_COMBINED_CLAIM_LINE: {
    method: 'POST',
    path: '/claims/lines',
    transport: 'multipart',
    required: ['consent_token', 'intervention_code', 'unit_price', 'quantity'],
  },
  ADD_CLAIM_ATTACHMENT: {
    method: 'POST',
    path: '/claims/attachments',
    transport: 'multipart',
    required: [
      'consent_token',
      'file_blob',
      'document_type',
      'intervention_code',
    ],
  },
  REMOVE_CLAIM_ATTACHMENT: {
    method: 'PATCH',
    path: '/claims/attachments',
    transport: 'json',
    required: ['consent_token', 'attachment_id', 'intervention_code'],
  },
  UPLOAD_FILE: {
    method: 'POST',
    path: '/uploads',
    transport: 'multipart',
    required: ['file'],
  },
  REMOVE_CLAIM_LINE: {
    method: 'PATCH',
    path: '/claims/lines',
    transport: 'json',
    required: ['consent_token', 'line_guid'],
  },
  EDIT_CLAIM_LINE: {
    method: 'PATCH',
    path: '/claims/lines/edit',
    transport: 'json',
    required: ['consent_token', 'line_id'],
  },
  RESUBMIT_CLAIM: {
    method: 'POST',
    path: '/claims/lines/resubmit',
    transport: 'json',
    required: ['consent_token'],
  },
  ADD_DIAGNOSIS: {
    method: 'POST',
    path: '/claims/diagnoses',
    transport: 'json',
    required: ['consent_token', 'intervention_code', 'icd_code'],
  },
  REMOVE_DIAGNOSIS: {
    method: 'PATCH',
    path: '/claims/diagnoses',
    transport: 'json',
    required: ['consent_token', 'intervention_code', 'icd_code'],
  },
  PREVIEW_PROVIDER_CLAIM: {
    method: 'POST',
    path: '/claims/preview',
    transport: 'json',
    required: ['consent_token'],
  },
  PREVIEW_PAYER_CLAIM: {
    method: 'GET',
    path: '/claims/preview/payer',
    transport: 'query',
    required: [],
    anyOf: [['guid'], ['provider_claim_no']],
  },
  SUBMIT_OUTPATIENT_CLAIM: {
    method: 'POST',
    path: '/claims/submit',
    transport: 'json',
    required: ['consent_token'],
  },
  DISCHARGE_INPATIENT: {
    method: 'POST',
    path: '/claims/discharge',
    transport: 'json',
    required: ['consent_token'],
    anyOf: [['otp'], ['auth_guid']],
  },
  CLOSE_CLAIM: {
    method: 'POST',
    path: '/claims/close',
    transport: 'json',
    required: ['consent_token'],
  },
  CREATE_EMERGENCY_CLAIM: {
    method: 'POST',
    path: '/claims/emergency',
    transport: 'json',
    required: [
      'interventions',
      'mode_of_arrival',
      'brought_by',
      'reference_number',
      'identification_number',
      'identification_type',
      'regulation_body',
    ],
  },
  IDENTIFY_EMERGENCY_PATIENT: {
    method: 'POST',
    path: '/claims/emergency',
    transport: 'json',
    required: ['beneficiary_cr_id', 'otp', 'consent_token'],
  },
  GET_EMERGENCY_PROTOCOLS: {
    method: 'GET',
    path: '/claims/emergency/protocols',
    transport: 'query',
    required: ['consent_token'],
  },
  ADD_EMERGENCY_PROTOCOL: {
    method: 'POST',
    path: '/claims/emergency/protocols',
    transport: 'multipart',
    required: [
      'consent_token',
      'protocol_code',
      'intervention_code',
      'unit_price',
      'quantity',
    ],
  },
  ADD_EMERGENCY_DOCTOR: {
    method: 'POST',
    path: '/claims/doctors',
    transport: 'json',
    required: [
      'consent_token',
      'identification_number',
      'identification_type',
      'regulation_body',
    ],
  },
  REMOVE_EMERGENCY_DOCTOR: {
    method: 'DELETE',
    path: '/claims/doctors',
    transport: 'json',
    required: ['consent_token', 'doctor_id'],
  },
  CREATE_EMT_CLAIM: {
    method: 'POST',
    path: '/claims/emt',
    transport: 'multipart',
    required: ['interventions', 'reference_number'],
  },
  PUBLISH_SHR_BUNDLE: {
    method: 'POST',
    path: '/clinical/fhir/bundle',
    transport: 'json',
    required: ['resourceType', 'type', 'entry'],
  },
} as const satisfies Record<string, DhaApiOperationContract>;

export type DhaApiOperation = keyof typeof DHA_API_OPERATIONS;

export function isDhaApiOperation(value: string): value is DhaApiOperation {
  return Boolean(
    Object.prototype.hasOwnProperty.call(DHA_API_OPERATIONS, value),
  );
}

export function dhaOperationRequires(
  operation: DhaApiOperation,
  field: string,
): boolean {
  const required: readonly string[] = DHA_API_OPERATIONS[operation].required;
  return required.includes(field);
}

const SENSITIVE_KEYS = new Set([
  'otp',
  'otp_code',
  'auth_guid',
  'consent_token',
  'token',
  'client_secret',
  'password',
  'file_blob',
]);

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

export function validateDhaApiPayload(
  operation: DhaApiOperation,
  payload: DhaApiPayload,
): void {
  const contract: DhaApiOperationContract = DHA_API_OPERATIONS[operation];
  for (const field of contract.required) {
    if (!isPresent(payload[field])) {
      throw new DhaApiError(`${operation} requires ${field}`, undefined, false);
    }
  }
  if (
    contract.anyOf &&
    !contract.anyOf.some((group) =>
      group.every((key) => isPresent(payload[key])),
    )
  ) {
    throw new DhaApiError(
      `${operation} requires one of: ${contract.anyOf.map((group) => group.join(' + ')).join(' or ')}`,
      undefined,
      false,
    );
  }
}

/** Redacts secrets before persistence, audit, or structured logging. */
export function redactDhaPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDhaPayload);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : redactDhaPayload(entry),
    ]),
  );
}
