import { DhaApiError } from './dha.types';

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
  | 'REJECT_AUTHORIZATION';

export interface DhaEclaimsCommand {
  operation: DhaEclaimsOperation;
  payload: Record<string, unknown>;
}

interface EclaimsOperationSpec {
  method: 'POST';
  path: string;
  requiredFields: readonly string[];
}

/**
 * DHA eClaims operations supported by the JSON transport. Required fields
 * are taken from the DHA HIE Complete Reference endpoint contracts.
 */
const ECLAIMS_OPERATIONS: Record<DhaEclaimsOperation, EclaimsOperationSpec> = {
  CREATE_VISIT: {
    method: 'POST',
    path: '/claims/visit',
    requiredFields: ['intervention_codes', 'patient_id', 'service_type', 'otp'],
  },
  ADD_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions',
    requiredFields: ['consent_token', 'intervention_code'],
  },
  ADD_DIAGNOSIS: {
    method: 'POST',
    path: '/claims/diagnoses',
    requiredFields: ['consent_token', 'icd_code', 'intervention_code'],
  },
  ADD_LINE: {
    method: 'POST',
    path: '/claims/lines',
    requiredFields: ['consent_token', 'intervention_code', 'unit_price', 'quantity'],
  },
  PREVIEW_CLAIM: {
    method: 'POST',
    path: '/claims/preview',
    requiredFields: ['consent_token'],
  },
  SUBMIT_CLAIM: {
    method: 'POST',
    path: '/claims/submit',
    requiredFields: ['consent_token'],
  },
  CLOSE_CLAIM: {
    method: 'POST',
    path: '/claims/close',
    requiredFields: ['cancel_reason_text', 'cancel_reason_type', 'consent_token'],
  },
  DISCHARGE_CLAIM: {
    method: 'POST',
    path: '/claims/discharge',
    requiredFields: ['consent_token'],
  },
  RETIRE_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/retire',
    requiredFields: ['consent_token', 'intervention_code'],
  },
  RESTORE_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/restore',
    requiredFields: ['consent_token', 'intervention_code'],
  },
  SWITCH_INTERVENTION: {
    method: 'POST',
    path: '/claims/interventions/switch',
    requiredFields: [
      'consent_token',
      'existing_intervention_code',
      'new_intervention_code',
      'retain_bill_items',
    ],
  },
  RESUBMIT_LINE: {
    method: 'POST',
    path: '/claims/lines/resubmit',
    requiredFields: ['consent_token'],
  },
  REJECT_AUTHORIZATION: {
    method: 'POST',
    path: '/claims/authorizations/{consent_token}/reject',
    requiredFields: ['consent_token'],
  },
};

export function resolveEclaimsOperation(command: DhaEclaimsCommand): EclaimsOperationSpec {
  const spec = ECLAIMS_OPERATIONS[command.operation];
  if (!spec) {
    throw new DhaApiError(`Unsupported DHA eClaims operation ${command.operation}`, 400, false);
  }

  for (const field of spec.requiredFields) {
    const value = command.payload?.[field];
    if (value === undefined || value === null || value === '') {
      throw new DhaApiError(
        `DHA eClaims ${command.operation} requires ${field}`,
        400,
        false,
      );
    }
  }
  return spec;
}

export function eclaimsRequest(command: DhaEclaimsCommand) {
  const spec = resolveEclaimsOperation(command);
  const path = spec.path.replace(
    '{consent_token}',
    encodeURIComponent(String(command.payload.consent_token)),
  );
  const payload = { ...command.payload };
  if (spec.path.includes('{consent_token}')) {
    delete payload.consent_token;
  }
  return { ...spec, path, payload };
}
