export namespace FHIR {
  export type ResourceType =
    | 'Patient'
    | 'Coverage'
    | 'Organization'
    | 'Practitioner'
    | 'Encounter'
    | 'Observation'
    | 'Condition'
    | 'Procedure'
    | 'MedicationRequest'
    | 'Claim'
    | 'ClaimResponse'
    | 'Bundle'
    | 'DiagnosticReport'
    | 'ServiceRequest'
    | 'Composition'
    | 'DocumentReference';

  export interface Resource {
    resourceType: ResourceType;
    id?: string;
    meta?: any;
    implicitRules?: string;
    language?: string;
  }

  export interface Identifier {
    use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
    type?: CodeableConcept;
    system?: string;
    value?: string;
    period?: any;
    assigner?: Reference;
  }

  export interface CodeableConcept {
    coding?: Coding[];
    text?: string;
  }

  export interface Coding {
    system?: string;
    version?: string;
    code?: string;
    display?: string;
    userSelected?: boolean;
  }

  export interface Reference {
    reference?: string;
    type?: string;
    identifier?: Identifier;
    display?: string;
  }

  export interface Bundle extends Resource {
    resourceType: 'Bundle';
    type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
    timestamp?: string;
    total?: number;
    entry?: BundleEntry[];
  }

  export interface BundleEntry {
    fullUrl?: string;
    resource?: Resource;
    request?: any;
    response?: any;
  }

  export interface Patient extends Resource {
    resourceType: 'Patient';
    identifier?: Identifier[];
    active?: boolean;
    name?: HumanName[];
    telecom?: ContactPoint[];
    gender?: 'male' | 'female' | 'other' | 'unknown';
    birthDate?: string;
  }

  export interface HumanName {
    use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
    text?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
  }

  export interface ContactPoint {
    system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
    value?: string;
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  }

  export interface Claim extends Resource {
    resourceType: 'Claim';
    identifier?: Identifier[];
    status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
    type: CodeableConcept;
    use: 'claim' | 'preauthorization' | 'predetermination';
    patient: Reference;
    created: string;
    provider: Reference;
    priority: CodeableConcept;
    insurance: ClaimInsurance[];
    item?: ClaimItem[];
    total?: Money;
  }

  export interface ClaimInsurance {
    sequence: number;
    focal: boolean;
    coverage: Reference;
    preAuthRef?: string[];
  }

  export interface ClaimItem {
    sequence: number;
    careTeamSequence?: number[];
    diagnosisSequence?: number[];
    procedureSequence?: number[];
    informationSequence?: number[];
    productOrService: CodeableConcept;
    servicedDate?: string;
    servicedPeriod?: any;
    quantity?: any;
    unitPrice?: Money;
    net?: Money;
  }

  export interface Money {
    value: number;
    currency: string;
  }

  export interface Coverage extends Resource {
    resourceType: 'Coverage';
    identifier?: Identifier[];
    status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
    type?: CodeableConcept;
    subscriber?: Reference;
    subscriberId?: string;
    beneficiary: Reference;
    payor: Reference[];
  }

  export interface Organization extends Resource {
    resourceType: 'Organization';
    identifier?: Identifier[];
    active?: boolean;
    type?: CodeableConcept[];
    name?: string;
    alias?: string[];
    telecom?: ContactPoint[];
  }
}
