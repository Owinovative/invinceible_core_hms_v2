import type { EventCategory, EventGovernance, EventPriority } from '../interfaces/base-clinical-event.interface';

/**
 * The schema definition registered for every event version.
 * This is the authoritative contract that both publishers and subscribers must conform to.
 */
export interface EventSchema {
  readonly version: number;
  readonly requiredFields: string[];
  readonly optionalFields: string[];
  readonly validationRules: Record<string, string>; // field -> rule description
  readonly migrationRules?: Record<number, string>; // fromVersion -> migration description
}

/**
 * A single entry in the Event Registry.
 * Each event type must be registered here before it can be published.
 */
export interface EventRegistryEntry {
  // Core taxonomy
  readonly name: string;            // e.g., 'VitalsRecorded'
  readonly category: EventCategory;
  readonly priority: EventPriority;
  readonly slaSeconds?: number;

  // Schema versioning
  readonly schemas: Record<number, EventSchema>; // version -> schema
  readonly currentVersion: number;

  // Governance
  readonly governance: EventGovernance;

  // Subscriber compatibility matrix
  readonly knownSubscribers: string[]; // e.g., ['ShrModule', 'NotificationModule']
}

/**
 * Canonical list of all clinical event types.
 * Use ONLY these constants — no magic strings.
 */
export const ClinicalEventTypes = {
  // === Patient ===
  PATIENT_REGISTERED:           'PatientRegistered',
  PATIENT_UPDATED:              'PatientUpdated',
  PATIENT_MERGED:               'PatientMerged',

  // === Consent ===
  CONSENT_GRANTED:              'ConsentGranted',
  CONSENT_REVOKED:              'ConsentRevoked',
  CONSENT_UPDATED:              'ConsentUpdated',

  // === Eligibility ===
  ELIGIBILITY_VERIFIED:         'EligibilityVerified',
  ELIGIBILITY_REJECTED:         'EligibilityRejected',

  // === Triage & Vitals ===
  TRIAGE_COMPLETED:             'TriageCompleted',
  VITALS_RECORDED:              'VitalsRecorded',

  // === Encounter ===
  ENCOUNTER_CREATED:            'EncounterCreated',
  CONSULTATION_STARTED:         'ConsultationStarted',
  CONSULTATION_COMPLETED:       'ConsultationCompleted',
  REFERRAL_CREATED:             'ReferralCreated',
  REFERRAL_ACCEPTED:            'ReferralAccepted',
  TRANSFER_COMPLETED:           'TransferCompleted',
  DISCHARGE_COMPLETED:          'DischargeCompleted',

  // === Clinical Findings ===
  DIAGNOSIS_ADDED:              'DiagnosisAdded',
  DIAGNOSIS_UPDATED:            'DiagnosisUpdated',
  PROCEDURE_PERFORMED:          'ProcedurePerformed',
  ALLERGY_RECORDED:             'AllergyRecorded',
  IMMUNIZATION_RECORDED:        'ImmunizationRecorded',

  // === Laboratory ===
  LABORATORY_REQUESTED:         'LaboratoryRequested',
  LABORATORY_RESULT_VERIFIED:   'LaboratoryResultVerified',

  // === Radiology ===
  RADIOLOGY_REQUESTED:          'RadiologyRequested',
  RADIOLOGY_REPORT_FINALIZED:   'RadiologyReportFinalized',

  // === Pharmacy ===
  MEDICATION_PRESCRIBED:        'MedicationPrescribed',
  MEDICATION_DISPENSED:         'MedicationDispensed',

  // === Admission ===
  ADMISSION_CREATED:            'AdmissionCreated',

  // === Billing & Claims ===
  INVOICE_GENERATED:            'InvoiceGenerated',
  CLAIM_CREATED:                'ClaimCreated',
  CLAIM_SUBMITTED:              'ClaimSubmitted',
  CLAIM_APPROVED:               'ClaimApproved',

  // === Integration (outbound) ===
  SHR_PUBLICATION_REQUESTED:    'ShrPublicationRequested',
  SHR_PUBLICATION_SUCCEEDED:    'ShrPublicationSucceeded',
  SHR_PUBLICATION_FAILED:       'ShrPublicationFailed',
  NOTIFICATION_REQUESTED:       'NotificationRequested',
  CLAIM_SUBMISSION_REQUESTED:   'ClaimSubmissionRequested',
} as const;

export type ClinicalEventType = typeof ClinicalEventTypes[keyof typeof ClinicalEventTypes];

/**
 * The canonical Event Registry.
 * Every published event must have a matching entry here.
 */
export const EVENT_REGISTRY: Record<string, EventRegistryEntry> = {
  [ClinicalEventTypes.VITALS_RECORDED]: {
    name: ClinicalEventTypes.VITALS_RECORDED,
    category: 'DOMAIN',
    priority: 'MEDIUM',
    slaSeconds: 10,
    currentVersion: 1,
    schemas: {
      1: {
        version: 1,
        requiredFields: ['triageId', 'patientId'],
        optionalFields: ['temperatureC', 'systolicBp', 'diastolicBp', 'pulseRate', 'respiratoryRate', 'oxygenSaturation', 'weightKg', 'heightCm'],
        validationRules: {
          triageId: 'Must be a positive integer',
          temperatureC: 'If present, must be between 30 and 45',
        },
      },
    },
    governance: {
      owner: 'Clinical Workflows',
      businessDomain: 'Triage',
      introducedVersion: '4.0.0',
      riskLevel: 'MEDIUM',
      approvalStatus: 'APPROVED',
    },
    knownSubscribers: ['ShrModule'],
  },

  [ClinicalEventTypes.CONSULTATION_COMPLETED]: {
    name: ClinicalEventTypes.CONSULTATION_COMPLETED,
    category: 'DOMAIN',
    priority: 'HIGH',
    slaSeconds: 10,
    currentVersion: 1,
    schemas: {
      1: {
        version: 1,
        requiredFields: ['consultationId', 'encounterId', 'patientId', 'doctorId'],
        optionalFields: ['diagnosisCodes', 'procedureCodes', 'notes'],
        validationRules: {
          consultationId: 'Must be a positive integer',
          encounterId: 'Must be a positive integer',
        },
      },
    },
    governance: {
      owner: 'Clinical Workflows',
      businessDomain: 'Consultation',
      introducedVersion: '4.0.0',
      riskLevel: 'HIGH',
      approvalStatus: 'APPROVED',
    },
    knownSubscribers: ['ShrModule', 'BillingModule'],
  },

  [ClinicalEventTypes.CONSENT_REVOKED]: {
    name: ClinicalEventTypes.CONSENT_REVOKED,
    category: 'DOMAIN',
    priority: 'CRITICAL',
    slaSeconds: 2,
    currentVersion: 1,
    schemas: {
      1: {
        version: 1,
        requiredFields: ['consentId', 'patientId', 'reason'],
        optionalFields: ['revokedByStaffId'],
        validationRules: { consentId: 'Must be a positive integer' },
      },
    },
    governance: {
      owner: 'Consent & Privacy',
      businessDomain: 'Consent',
      introducedVersion: '4.0.0',
      riskLevel: 'CRITICAL',
      approvalStatus: 'APPROVED',
    },
    knownSubscribers: ['ShrModule', 'NotificationModule'],
  },

  [ClinicalEventTypes.SHR_PUBLICATION_REQUESTED]: {
    name: ClinicalEventTypes.SHR_PUBLICATION_REQUESTED,
    category: 'INTEGRATION',
    priority: 'HIGH',
    slaSeconds: 30,
    currentVersion: 1,
    schemas: {
      1: {
        version: 1,
        requiredFields: ['patientId', 'policy', 'triggerEventId'],
        optionalFields: ['encounterId', 'priority'],
        validationRules: {
          policy: 'Must be one of: IMMEDIATE, DELAYED, ENCOUNTER_CLOSE, DISCHARGE',
        },
      },
    },
    governance: {
      owner: 'SHR Integration',
      businessDomain: 'Interoperability',
      introducedVersion: '4.0.0',
      riskLevel: 'HIGH',
      approvalStatus: 'APPROVED',
    },
    knownSubscribers: ['ShrModule'],
  },
  [ClinicalEventTypes.PATIENT_REGISTERED]: {
    name: ClinicalEventTypes.PATIENT_REGISTERED,
    category: 'DOMAIN',
    priority: 'HIGH',
    slaSeconds: 30,
    currentVersion: 1,
    schemas: {
      1: {
        version: 1,
        requiredFields: ['patientId', 'facilityId', 'firstName', 'lastName'],
        optionalFields: ['middleName', 'gender', 'dateOfBirth', 'nationalIdNumber', 'phoneNumber'],
        validationRules: {
          patientId: 'Must be a positive integer',
          facilityId: 'Must be a positive integer',
        },
      },
    },
    governance: {
      owner: 'Patient Registry',
      businessDomain: 'Patient',
      introducedVersion: '4.0.0',
      riskLevel: 'HIGH',
      approvalStatus: 'APPROVED',
    },
    knownSubscribers: ['ShrModule'],
  },

  [ClinicalEventTypes.TRIAGE_COMPLETED]: {
    name: ClinicalEventTypes.TRIAGE_COMPLETED,
    category: 'DOMAIN',
    priority: 'HIGH',
    slaSeconds: 10,
    currentVersion: 1,
    schemas: {
      1: {
        version: 1,
        requiredFields: ['triageId', 'patientId', 'facilityId'],
        optionalFields: [
          'encounterId', 'triagePriority', 'chiefComplaint',
          'temperatureC', 'systolicBp', 'diastolicBp',
          'pulseRate', 'respiratoryRate', 'oxygenSaturation',
          'weightKg', 'heightCm', 'bmi', 'appointmentId',
        ],
        validationRules: {
          triageId: 'Must be a positive integer',
          patientId: 'Must be a positive integer',
        },
      },
    },
    governance: {
      owner: 'Clinical Workflows',
      businessDomain: 'Triage',
      introducedVersion: '4.0.0',
      riskLevel: 'HIGH',
      approvalStatus: 'APPROVED',
    },
    knownSubscribers: ['ShrModule'],
  },

  [ClinicalEventTypes.CLAIM_SUBMITTED]: {
    name: ClinicalEventTypes.CLAIM_SUBMITTED,
    category: 'DOMAIN',
    priority: 'HIGH',
    slaSeconds: 30,
    currentVersion: 1,
    schemas: {
      1: {
        version: 1,
        requiredFields: ['claimId', 'patientId', 'facilityId'],
        optionalFields: ['encounterId', 'claimAmount', 'shaSchemeCode', 'claimStatus'],
        validationRules: {
          claimId: 'Must be a positive integer',
          patientId: 'Must be a positive integer',
        },
      },
    },
    governance: {
      owner: 'Billing & Claims',
      businessDomain: 'SHA Claims',
      introducedVersion: '4.0.0',
      riskLevel: 'HIGH',
      approvalStatus: 'APPROVED',
    },
    knownSubscribers: ['ShrModule'],
  },
};
