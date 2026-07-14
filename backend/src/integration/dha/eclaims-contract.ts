import { DhaApiError } from './dha.types';
import type { HttpMethod } from '../integration.types';

export type DhaEclaimsOperation =
  | 'CREATE_VISIT'
  | 'ADD_INTERVENTION'
  | 'ADD_DIAGNOSIS'
  | 'ADD_LINE'
  | 'PREVIEW_CLAIM'
  | 'SUBMIT_CLAIM'
  | 'CLOSE_CLAIM'
  | 'DISCHARGE_CLAIM'
  | 'RETIRE_INTERVENTION'
  | 'RESTORE_INTERVENTION'
  | 'SWITCH_INTERVENTION'
  | 'RESUBMIT_LINE'
  | 'REJECT_AUTHORIZATION'
  | 'GET_PREAUTH'
  | 'CANCEL_PREAUTH'
  | 'REMOVE_PREAUTH_DIAGNOSIS'
  | 'REMOVE_PREAUTH_DOCTOR'
  | 'PREVIEW_PRESCRIPTION'
  | 'CREATE_PRESCRIPTION'
  | 'DISPENSE_PRESCRIPTION'
  | 'REMOVE_PRESCRIPTION_DOCTOR'
  | 'GET_EMERGENCY_PROTOCOLS'
  | 'ADD_EMERGENCY_PROTOCOL';

export interface DhaEclaimsCommand {
  operation: DhaEclaimsOperation;
  payload?: Record<string, unknown>;
  query?: Record<string, string | number | undefined>;
}

interface EclaimsOperationSpec {
  method: HttpMethod;
  path: string;
  requiredPayloadFields?: readonly string[];
  requiredQueryFields?: readonly string[];
  removePathPayloadFields?: readonly string[];
}

/**
 * DHA eClaims operations supported by the JSON transport. Required fields
 * are taken from the DHA HIE Complete Reference endpoint contracts.
 */
const ECLAIMS_OPERATIONS: Record<DhaEclaimsOperation, EclaimsOperationSpec> = {
  CREATE_VISIT: {
    method: 'POST',
    path: '/claims/visit',
    requiredPayloadFields: ['intervention_codes', 'patient_id', 'service_type', 'otp'],
  },
  ADD_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions',
    requiredPayloadFields: ['consent_token', 'intervention_code'],
  },
  ADD_DIAGNOSIS: {
    method: 'POST',
    path: '/claims/diagnoses',
    requiredPayloadFields: ['consent_token', 'icd_code', 'intervention_code'],
  },
  ADD_LINE: {
    method: 'POST',
    path: '/claims/lines',
    requiredPayloadFields: ['consent_token', 'intervention_code', 'unit_price', 'quantity'],
  },
  PREVIEW_CLAIM: {
    method: 'POST',
    path: '/claims/preview',
    requiredPayloadFields: ['consent_token'],
  },
  SUBMIT_CLAIM: {
    method: 'POST',
    path: '/claims/submit',
    requiredPayloadFields: ['consent_token'],
  },
  CLOSE_CLAIM: {
    method: 'POST',
    path: '/claims/close',
    requiredPayloadFields: ['cancel_reason_text', 'cancel_reason_type', 'consent_token'],
  },
  DISCHARGE_CLAIM: {
    method: 'POST',
    path: '/claims/discharge',
    requiredPayloadFields: ['consent_token'],
  },
  RETIRE_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/retire',
    requiredPayloadFields: ['consent_token', 'intervention_code'],
  },
  RESTORE_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/restore',
    requiredPayloadFields: ['consent_token', 'intervention_code'],
  },
  SWITCH_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/switch',
    requiredPayloadFields: [
      'consent_token',
      'existing_intervention_code',
      'new_intervention_code',
      'retain_bill_items',
    ],
  },
  RESUBMIT_LINE: {
    method: 'POST',
    path: '/claims/lines/resubmit',
    requiredPayloadFields: ['consent_token'],
  },
  REJECT_AUTHORIZATION: {
    method: 'POST',
    path: '/claims/authorizations/{consent_token}/reject',
    requiredPayloadFields: ['consent_token'],
    removePathPayloadFields: ['consent_token'],
  },
  GET_PREAUTH: {
    method: 'GET',
    path: '/preauths',
    requiredQueryFields: ['consent_token'],
  },
  CANCEL_PREAUTH: {
    method: 'POST',
    path: '/preauths/cancel',
    requiredPayloadFields: ['consent_token', 'intervention_code'],
  },
  REMOVE_PREAUTH_DIAGNOSIS: {
    method: 'DELETE',
    path: '/preauths/diagnoses/{icd_code}',
    requiredPayloadFields: ['consent_token', 'icd_code', 'intervention_code'],
  },
  REMOVE_PREAUTH_DOCTOR: {
    method: 'DELETE',
    path: '/preauths/doctors',
    requiredPayloadFields: [
      'consent_token',
      'intervention_code',
      'practitioner_registration_number',
    ],
  },
  PREVIEW_PRESCRIPTION: {
    method: 'GET',
    path: '/prescriptions',
    requiredQueryFields: ['consent_token'],
  },
  CREATE_PRESCRIPTION: {
    method: 'POST',
    path: '/prescriptions',
    requiredPayloadFields: ['consent_token', 'intervention_code', 'items'],
  },
  DISPENSE_PRESCRIPTION: {
    method: 'POST',
    path: '/prescriptions/dispense',
    requiredPayloadFields: [
      'actual_products',
      'consent_token',
      'doctors',
      'intervention_code',
    ],
  },
  REMOVE_PRESCRIPTION_DOCTOR: {
    method: 'DELETE',
    path: '/prescriptions/doctors',
    requiredPayloadFields: [
      'consent_token',
      'intervention_code',
      'practitioner_registration_number',
    ],
  },
  GET_EMERGENCY_PROTOCOLS: {
    method: 'GET',
    path: '/claims/emergency/protocols',
    requiredQueryFields: ['active', 'intervention_code'],
  },
  ADD_EMERGENCY_PROTOCOL: {
    method: 'POST',
    path: '/claims/emergency/protocols',
    requiredPayloadFields: [
      'consent_token',
      'protocol_code',
      'intervention_code',
      'unit_price',
      'quantity',
    ],
  },
};

export function resolveEclaimsOperation(command: DhaEclaimsCommand): EclaimsOperationSpec {
  const spec = ECLAIMS_OPERATIONS[command.operation];
  if (!spec) {
    throw new DhaApiError(`Unsupported DHA eClaims operation ${command.operation}`, 400, false);
  }

  for (const field of spec.requiredPayloadFields ?? []) {
    const value = command.payload?.[field];
    if (value === undefined || value === null || value === '') {
      throw new DhaApiError(
        `DHA eClaims ${command.operation} requires ${field}`,
        400,
        false,
      );
    }
  }
  for (const field of spec.requiredQueryFields ?? []) {
    const value = command.query?.[field];
    if (value === undefined || value === null || value === '') {
      throw new DhaApiError(
        `DHA eClaims ${command.operation} requires query parameter ${field}`,
        400,
        false,
      );
    }
  }
  return spec;
}

export function eclaimsRequest(command: DhaEclaimsCommand) {
  const spec = resolveEclaimsOperation(command);
  const payload = { ...(command.payload ?? {}) };
  const path = spec.path.replace(/\{([^}]+)\}/g, (_match, field: string) => {
    const value = payload[field] ?? command.query?.[field];
    if (value === undefined || value === null || value === '') {
      throw new DhaApiError(
        `DHA eClaims ${command.operation} requires path parameter ${field}`,
        400,
        false,
      );
    }
    if (spec.removePathPayloadFields?.includes(field)) {
      delete payload[field];
    }
    return encodeURIComponent(String(value));
  });
  return {
    ...spec,
    path,
    payload,
    query: command.query,
  };
}
