import { DhaApiError } from './dha.types';
import type { HttpMethod } from '../integration.types';

export type DhaEclaimsOperation =
  | 'AUTHORIZE_CLAIM'
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
  | 'ADD_EMERGENCY_PROTOCOL'
  | 'RESOLVE_PMF_TARIFFS'
  | 'EVALUATE_POMSF_RATES'
  | 'REMOVE_ATTACHMENT'
  | 'GET_AUTHORIZATIONS'
  | 'REMOVE_DIAGNOSIS'
  | 'ADD_EMERGENCY_DOCTOR'
  | 'REMOVE_EMERGENCY_DOCTOR'
  | 'REMOVE_LINE'
  | 'EDIT_LINE'
  | 'GET_PAYER_PREVIEW'
  | 'GET_FACILITY_OCCUPANCY'
  | 'GET_PATIENT_BENEFITS'
  | 'GET_PATIENT_INTERVENTIONS'
  | 'GET_PATIENT_UTILIZATION'
  | 'GET_PATIENT_POMSF_BALANCES'
  | 'GET_PATIENT_SUB_BENEFITS'
  | 'CREATE_EMERGENCY_CLAIM'
  | 'RESEND_DOCTOR_CONSENT'
  | 'GET_OTP_WHITELIST_CALLBACK'
  | 'GET_UPLOAD_URL';

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
  AUTHORIZE_CLAIM: {
    method: 'POST',
    path: '/claims/authorize',
    requiredPayloadFields: ['patient_id', 'service_type', 'interventions'],
  },
  CREATE_VISIT: {
    method: 'POST',
    path: '/claims/visit',
    requiredPayloadFields: ['intervention_codes', 'patient_id', 'service_type'],
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
  RESOLVE_PMF_TARIFFS: {
    method: 'POST',
    path: '/benefits/pmf-tariffs/resolve',
    requiredPayloadFields: ['fr_code', 'intervention_codes'],
  },
  EVALUATE_POMSF_RATES: {
    method: 'POST',
    path: '/benefits/pomsf-rates',
    requiredPayloadFields: ['fr_code', 'intervention_codes'],
  },
  REMOVE_ATTACHMENT: {
    method: 'PATCH',
    path: '/claims/attachments',
    requiredPayloadFields: [
      'attachment_id',
      'consent_token',
      'intervention_code',
    ],
  },
  GET_AUTHORIZATIONS: {
    method: 'GET',
    path: '/claims/authorizations',
  },
  REMOVE_DIAGNOSIS: {
    method: 'PATCH',
    path: '/claims/diagnoses',
    requiredPayloadFields: ['consent_token', 'icd_code', 'intervention_code'],
  },
  ADD_EMERGENCY_DOCTOR: {
    method: 'POST',
    path: '/claims/doctors',
    requiredPayloadFields: [
      'consent_token',
      'identification_number',
      'identification_type',
      'regulation_body',
    ],
  },
  REMOVE_EMERGENCY_DOCTOR: {
    method: 'DELETE',
    path: '/claims/doctors',
    requiredPayloadFields: ['consent_token'],
  },
  REMOVE_LINE: {
    method: 'PATCH',
    path: '/claims/lines',
    requiredPayloadFields: ['consent_token', 'line_guid'],
  },
  EDIT_LINE: {
    method: 'PATCH',
    path: '/claims/lines/edit',
    requiredPayloadFields: ['consent_token', 'line_id'],
  },
  GET_PAYER_PREVIEW: {
    method: 'GET',
    path: '/claims/preview/payer',
  },
  GET_FACILITY_OCCUPANCY: {
    method: 'GET',
    path: '/facilities/{facilityCode}/beds/occupancy',
    requiredPayloadFields: ['facilityCode'],
    removePathPayloadFields: ['facilityCode'],
  },
  GET_PATIENT_BENEFITS: {
    method: 'GET',
    path: '/patients/benefits',
    requiredQueryFields: ['patient_id'],
  },
  GET_PATIENT_INTERVENTIONS: {
    method: 'GET',
    path: '/patients/benefits/interventions',
    requiredQueryFields: ['patient_id'],
  },
  GET_PATIENT_UTILIZATION: {
    method: 'GET',
    path: '/patients/benefits/utilization',
    requiredQueryFields: ['patient_id', 'intervention_code'],
  },
  GET_PATIENT_POMSF_BALANCES: {
    method: 'GET',
    path: '/patients/pomsf-balances',
    requiredQueryFields: ['patient_id'],
  },
  GET_PATIENT_SUB_BENEFITS: {
    method: 'GET',
    path: '/patients/sub-benefits',
    requiredQueryFields: ['patient_id'],
  },
  CREATE_EMERGENCY_CLAIM: {
    method: 'POST',
    path: '/claims/emergency',
    requiredPayloadFields: [
      'interventions',
      'mode_of_arrival',
      'brought_by',
      'reference_number',
      'identification_number',
      'identification_type',
      'regulation_body',
    ],
  },
  RESEND_DOCTOR_CONSENT: {
    method: 'POST',
    path: '/claims/doctor-consent',
    requiredPayloadFields: ['request_type', 'consent_token'],
  },
  GET_OTP_WHITELIST_CALLBACK: {
    method: 'GET',
    path: '/patients/otp-whitelists/callback',
  },
  GET_UPLOAD_URL: {
    method: 'GET',
    path: '/uploads/{file_id}',
    requiredPayloadFields: ['file_id'],
    removePathPayloadFields: ['file_id'],
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
  if (
    command.operation === 'AUTHORIZE_CLAIM' &&
    !command.payload?.otp &&
    !command.payload?.auth_guid
  ) {
    throw new DhaApiError(
      'DHA eClaims AUTHORIZE_CLAIM requires otp or auth_guid',
      400,
      false,
    );
  }
  if (
    command.operation === 'CREATE_VISIT' &&
    !command.payload?.otp &&
    !command.payload?.auth_guid
  ) {
    throw new DhaApiError(
      'DHA eClaims CREATE_VISIT requires otp or auth_guid',
      400,
      false,
    );
  }
  if (
    ['CREATE_VISIT', 'ADD_DIAGNOSIS', 'ADD_LINE'].includes(command.operation)
  ) {
    const practitionerFields = [
      'practitioner_identification_type',
      'practitioner_identification_number',
      'practitioner_regulation_body',
    ];
    const supplied = practitionerFields.filter(
      (field) => command.payload?.[field] !== undefined,
    );
    if (supplied.length > 0 && supplied.length !== practitionerFields.length) {
      throw new DhaApiError(
        `DHA eClaims ${command.operation} requires all practitioner identification fields together`,
        400,
        false,
      );
    }
  }
  if (
    command.operation === 'CREATE_EMERGENCY_CLAIM' &&
    (command.payload?.beneficiary_cr_id !== undefined ||
      command.payload?.otp !== undefined) &&
    (!command.payload?.beneficiary_cr_id || !command.payload?.otp)
  ) {
    throw new DhaApiError(
      'DHA eClaims identified emergency claims require beneficiary_cr_id and otp together',
      400,
      false,
    );
  }
  const emergencyInterventions = command.payload?.interventions;
  if (
    command.operation === 'CREATE_EMERGENCY_CLAIM' &&
    Array.isArray(emergencyInterventions) &&
    emergencyInterventions.length !== 1
  ) {
    throw new DhaApiError(
      'DHA eClaims CREATE_EMERGENCY_CLAIM requires exactly one emergency intervention',
      400,
      false,
    );
  }
  if (
    command.operation === 'RESEND_DOCTOR_CONSENT' &&
    command.payload?.request_type === 'EMERGENCY_CLAIM_DOCTOR_APPROVAL_REQUEST' &&
    command.payload?.service_type === 'EMT'
  ) {
    for (const field of [
      'emergency_claim_id',
      'intervention_code',
      'identification_type',
      'identification_number',
      'regulation_body',
    ]) {
      if (!command.payload?.[field]) {
        throw new DhaApiError(
          `DHA eClaims RESEND_DOCTOR_CONSENT EMT request requires ${field}`,
          400,
          false,
        );
      }
    }
  }
  if (
    command.operation === 'RESEND_DOCTOR_CONSENT' &&
    command.payload?.service_type !== 'EMT'
  ) {
    for (const field of ['practitioner_registration_number', 'intervention_code']) {
      if (!command.payload?.[field]) {
        throw new DhaApiError(
          `DHA eClaims RESEND_DOCTOR_CONSENT requires ${field}`,
          400,
          false,
        );
      }
    }
  }
  if (
    command.operation === 'GET_OTP_WHITELIST_CALLBACK' &&
    !command.query?.beneficiary_cr_id &&
    !command.query?.guid
  ) {
    throw new DhaApiError(
      'DHA eClaims GET_OTP_WHITELIST_CALLBACK requires beneficiary_cr_id or guid',
      400,
      false,
    );
  }
  if (
    command.operation === 'GET_AUTHORIZATIONS' &&
    !command.query?.token &&
    !command.query?.patient_id &&
    !command.query?.guid
  ) {
    throw new DhaApiError(
      'DHA eClaims GET_AUTHORIZATIONS requires token, patient_id, or guid',
      400,
      false,
    );
  }
  if (
    command.operation === 'GET_PAYER_PREVIEW' &&
    !command.query?.guid &&
    !command.query?.provider_claim_no
  ) {
    throw new DhaApiError(
      'DHA eClaims GET_PAYER_PREVIEW requires guid or provider_claim_no',
      400,
      false,
    );
  }
  if (
    command.operation === 'EDIT_LINE' &&
    command.payload?.quantity === undefined &&
    command.payload?.unit_price === undefined
  ) {
    throw new DhaApiError(
      'DHA eClaims EDIT_LINE requires quantity or unit_price',
      400,
      false,
    );
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
