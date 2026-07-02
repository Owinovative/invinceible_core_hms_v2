/**
 * Minimal FHIR R4 resource typings for DHA interoperability. Only the
 * fields this HMS exchanges are modeled; unknown fields pass through via
 * index signatures so payloads stay spec-compatible.
 */

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  system?: string;
  value?: string;
  use?: string;
}

export interface FhirReference {
  reference?: string;
  display?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirHumanName {
  use?: string;
  family?: string;
  given?: string[];
  text?: string;
}

export interface FhirContactPoint {
  system?: 'phone' | 'email' | 'sms' | 'url' | 'other';
  value?: string;
  use?: string;
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: { profile?: string[]; versionId?: string; lastUpdated?: string };
  [key: string]: unknown;
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  managingOrganization?: FhirReference;
}

export interface FhirPractitioner extends FhirResource {
  resourceType: 'Practitioner';
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  qualification?: Array<{
    code?: FhirCodeableConcept;
    identifier?: FhirIdentifier[];
  }>;
}

export interface FhirOrganization extends FhirResource {
  resourceType: 'Organization';
  identifier?: FhirIdentifier[];
  name?: string;
  type?: FhirCodeableConcept[];
  address?: Array<{
    city?: string;
    district?: string;
    country?: string;
    line?: string[];
  }>;
}

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  status:
    | 'planned'
    | 'arrived'
    | 'in-progress'
    | 'finished'
    | 'cancelled'
    | 'unknown';
  class?: FhirCoding;
  type?: FhirCodeableConcept[];
  subject?: FhirReference;
  participant?: Array<{ individual?: FhirReference }>;
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
  diagnosis?: Array<{ condition?: FhirReference; rank?: number }>;
  serviceProvider?: FhirReference;
}

export interface FhirServiceRequest extends FhirResource {
  resourceType: 'ServiceRequest';
  status: 'draft' | 'active' | 'completed' | 'revoked' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'directive';
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  requester?: FhirReference;
  performer?: FhirReference[];
  reasonCode?: FhirCodeableConcept[];
  note?: Array<{ text?: string }>;
}

export interface FhirConsent extends FhirResource {
  resourceType: 'Consent';
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive';
  scope?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  patient?: FhirReference;
  dateTime?: string;
  provision?: {
    type?: 'deny' | 'permit';
    period?: FhirPeriod;
    purpose?: FhirCoding[];
  };
}

export interface FhirCoverageEligibilityRequest extends FhirResource {
  resourceType: 'CoverageEligibilityRequest';
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  purpose: Array<'auth-requirements' | 'benefits' | 'discovery' | 'validation'>;
  patient?: FhirReference;
  created?: string;
  insurer?: FhirReference;
  item?: Array<{ category?: FhirCodeableConcept }>;
}

export interface FhirAuditEvent extends FhirResource {
  resourceType: 'AuditEvent';
  type?: FhirCoding;
  action?: 'C' | 'R' | 'U' | 'D' | 'E';
  recorded?: string;
  outcome?: string;
  agent?: Array<{ who?: FhirReference; requestor?: boolean }>;
  source?: { observer?: FhirReference };
  entity?: Array<{ what?: FhirReference; description?: string }>;
}

export interface FhirBundleEntry {
  fullUrl?: string;
  resource?: FhirResource;
  request?: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; url: string };
}

export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type:
    | 'document'
    | 'message'
    | 'transaction'
    | 'transaction-response'
    | 'batch'
    | 'collection'
    | 'searchset';
  timestamp?: string;
  entry?: FhirBundleEntry[];
}

export interface FhirOperationOutcome extends FhirResource {
  resourceType: 'OperationOutcome';
  issue?: Array<{
    severity?: 'fatal' | 'error' | 'warning' | 'information';
    code?: string;
    diagnostics?: string;
  }>;
}
