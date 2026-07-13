export enum ShrPublicationTrigger {
  PATIENT_REGISTERED = 'PATIENT_REGISTERED',
  TRIAGE_COMPLETED = 'TRIAGE_COMPLETED',
  DIAGNOSIS_ADDED = 'DIAGNOSIS_ADDED',
  LABORATORY_FINALIZED = 'LABORATORY_FINALIZED',
  RADIOLOGY_FINALIZED = 'RADIOLOGY_FINALIZED',
  MEDICATION_DISPENSED = 'MEDICATION_DISPENSED',
  CONSULTATION_CLOSED = 'CONSULTATION_CLOSED',
  CLAIM_SUBMITTED = 'CLAIM_SUBMITTED',
  RECORD_CORRECTED = 'RECORD_CORRECTED',
  RECORD_VOIDED = 'RECORD_VOIDED'
}

export enum ShrPublicationPolicy {
  ENCOUNTER_ONLY = 'ENCOUNTER_ONLY',
  ENCOUNTER_WITH_DIAGNOSIS = 'ENCOUNTER_WITH_DIAGNOSIS',
  LABORATORY_INCREMENTAL = 'LABORATORY_INCREMENTAL',
  MEDICATION_INCREMENTAL = 'MEDICATION_INCREMENTAL',
  FULL_CLINICAL_RECORD = 'FULL_CLINICAL_RECORD',
  CLAIM_ENCOUNTER = 'CLAIM_ENCOUNTER' // Encounter + Claim
}

export class ShrPublicationPolicyEngine {
  
  /**
   * Evaluates the trigger context and determines the correct publication policy
   * according to configured rules (e.g. environment variable defaults).
   */
  determinePolicy(trigger: ShrPublicationTrigger, context: any = {}): ShrPublicationPolicy {
    // In an enterprise setup, this would be highly configurable.
    // For now, we map the trigger directly to a canonical policy.
    
    switch (trigger) {
      case ShrPublicationTrigger.PATIENT_REGISTERED:
      case ShrPublicationTrigger.TRIAGE_COMPLETED:
        return ShrPublicationPolicy.ENCOUNTER_ONLY;
        
      case ShrPublicationTrigger.DIAGNOSIS_ADDED:
        return ShrPublicationPolicy.ENCOUNTER_WITH_DIAGNOSIS;
        
      case ShrPublicationTrigger.LABORATORY_FINALIZED:
        return ShrPublicationPolicy.LABORATORY_INCREMENTAL;
        
      case ShrPublicationTrigger.MEDICATION_DISPENSED:
        return ShrPublicationPolicy.MEDICATION_INCREMENTAL;
        
      case ShrPublicationTrigger.CONSULTATION_CLOSED:
      case ShrPublicationTrigger.RECORD_CORRECTED:
        return ShrPublicationPolicy.FULL_CLINICAL_RECORD;
        
      case ShrPublicationTrigger.CLAIM_SUBMITTED:
        return ShrPublicationPolicy.CLAIM_ENCOUNTER;
        
      case ShrPublicationTrigger.RECORD_VOIDED:
        // A cancellation might just be an update to the encounter status
        return ShrPublicationPolicy.ENCOUNTER_ONLY; 
        
      default:
        return ShrPublicationPolicy.FULL_CLINICAL_RECORD;
    }
  }

  /**
   * Returns the array of FHIR Resource types that should be included
   * for a given policy.
   */
  getRequiredResourcesForPolicy(policy: ShrPublicationPolicy): string[] {
    const base = ['Patient', 'Organization', 'Location', 'Practitioner', 'Encounter', 'Consent', 'Coverage'];
    
    switch (policy) {
      case ShrPublicationPolicy.ENCOUNTER_ONLY:
        return [...base];
        
      case ShrPublicationPolicy.ENCOUNTER_WITH_DIAGNOSIS:
        return [...base, 'Condition'];
        
      case ShrPublicationPolicy.LABORATORY_INCREMENTAL:
        return [...base, 'ServiceRequest', 'Specimen', 'Observation', 'DiagnosticReport'];
        
      case ShrPublicationPolicy.MEDICATION_INCREMENTAL:
        return [...base, 'Medication', 'MedicationRequest', 'MedicationDispense'];
        
      case ShrPublicationPolicy.CLAIM_ENCOUNTER:
        return [...base, 'Condition', 'Claim'];
        
      case ShrPublicationPolicy.FULL_CLINICAL_RECORD:
        return [
          ...base,
          'Condition',
          'Observation',
          'Procedure',
          'ServiceRequest',
          'DiagnosticReport',
          'Specimen',
          'Medication',
          'MedicationRequest',
          'MedicationDispense',
          'AllergyIntolerance',
          'CarePlan',
          'Immunization',
          'Device'
        ];
        
      default:
        return base;
    }
  }
}
