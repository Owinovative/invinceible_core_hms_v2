/**
 * Dependency-injection tokens and shared constants for the government
 * integration layer. Business modules must depend on these abstractions,
 * never on concrete API clients.
 */

export const ETIMS_CLIENT = 'INTEGRATION_ETIMS_CLIENT';
export const DHA_CLIENT = 'INTEGRATION_DHA_CLIENT';

export type IntegrationName = 'ETIMS' | 'DHA';

export const INTEGRATION_NAMES = {
  ETIMS: 'ETIMS',
  DHA: 'DHA',
} as const;

export const OUTBOUND_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  DEAD_LETTER: 'DEAD_LETTER',
} as const;

export type OutboundStatus =
  (typeof OUTBOUND_STATUS)[keyof typeof OUTBOUND_STATUS];

export const ETIMS_DOCUMENT_TYPE = {
  SALE: 'SALE',
  CREDIT_NOTE: 'CREDIT_NOTE',
  DEBIT_NOTE: 'DEBIT_NOTE',
} as const;

export type EtimsDocumentType =
  (typeof ETIMS_DOCUMENT_TYPE)[keyof typeof ETIMS_DOCUMENT_TYPE];

export const ETIMS_STATUS = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
} as const;

export type EtimsStatus = (typeof ETIMS_STATUS)[keyof typeof ETIMS_STATUS];

export const ETIMS_OPERATIONS = {
  SUBMIT_INVOICE: 'SUBMIT_INVOICE',
} as const;

export const DHA_OPERATIONS = {
  SUBMIT_ENCOUNTER: 'SUBMIT_ENCOUNTER',
  SUBMIT_CLAIM: 'SUBMIT_CLAIM',
  SUBMIT_REFERRAL: 'SUBMIT_REFERRAL',
} as const;

export const DHA_TRANSACTION_TYPE = {
  PATIENT_VERIFICATION: 'PATIENT_VERIFICATION',
  PRACTITIONER_VERIFICATION: 'PRACTITIONER_VERIFICATION',
  FACILITY_VERIFICATION: 'FACILITY_VERIFICATION',
  ELIGIBILITY_CHECK: 'ELIGIBILITY_CHECK',
  ENCOUNTER_SUBMISSION: 'ENCOUNTER_SUBMISSION',
  RECORD_EXCHANGE: 'RECORD_EXCHANGE',
  REFERRAL: 'REFERRAL',
  CONSENT: 'CONSENT',
  CLAIM_SUBMISSION: 'CLAIM_SUBMISSION',
} as const;

export type DhaTransactionType =
  (typeof DHA_TRANSACTION_TYPE)[keyof typeof DHA_TRANSACTION_TYPE];

export const DHA_TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
