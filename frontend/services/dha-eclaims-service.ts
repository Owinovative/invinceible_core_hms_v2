import { apiFetch } from "@/lib/api";

export type DhaServiceType = "CAPITATION" | "OUTPATIENT" | "INPATIENT";

export interface DhaVisitInput {
  patientId: number;
  interventionCodes: string[];
  serviceType: DhaServiceType | "EMERGENCY";
  otp?: string;
  consentAuthorizationId?: number;
}

export interface DhaClaimLineInput {
  patientId: number;
  consentAuthorizationId: number;
  interventionCode: string;
  unitPrice: string;
  quantity: string;
  serviceName?: string;
  serviceIdentifier?: string;
}

export interface DhaDiagnosisInput {
  patientId: number;
  consentAuthorizationId: number;
  interventionCode: string;
  icdCode: string;
}

export interface DhaPreauthorizationInput {
  patientId: number;
  consentAuthorizationId: number;
  interventionCode: string;
  preauthType:
    | "NORMAL"
    | "SURGICAL"
    | "ONCOLOGY"
    | "RENAL"
    | "OPTICAL"
    | "IMAGING"
    | "DENTAL";
  expectedServiceStartDate?: string;
  chiefComplaint?: string;
  clinicalIndications?: string;
  historyOfPresentIllness?: string;
  clinicalData?: Record<string, unknown>;
  diagnoses: Array<{ icdCode: string }>;
  items: Array<{ itemCode: string; unitPrice: string; quantity: string }>;
  doctors: Array<{
    identificationNumber: string;
    identificationType: string;
    regulationBody: string;
  }>;
}

export interface DhaEmergencyInput {
  patientId: number;
  interventions: string[];
  modeOfArrival: "AMBULANCE" | "WALK-IN" | "OTHER";
  broughtBy: "RELATIVE" | "UNKNOWN" | "SAMARITAN" | "PARAMEDICS";
  referenceNumber: string;
  practitionerIdentificationNumber: string;
  practitionerIdentificationType: string;
  practitionerRegulationBody: string;
  otp?: string;
  notes?: string;
}

export interface SubmitDhaClaimInput {
  consentAuthorizationId: number;
  interventionCode: string;
  serviceType: DhaServiceType;
  visitOtp?: string;
  dischargeOtp?: string;
}

function post<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export const startDhaVisit = (input: DhaVisitInput) =>
  post<unknown>("/integrations/dha/eclaims/visits", input);

export const addDhaClaimLine = (input: DhaClaimLineInput) =>
  post<unknown>("/integrations/dha/eclaims/claim-lines", input);

export const addDhaDiagnosis = (input: DhaDiagnosisInput) =>
  post<unknown>("/integrations/dha/eclaims/diagnoses", input);

export const createDhaPreauthorization = (input: DhaPreauthorizationInput) =>
  post<unknown>("/integrations/dha/eclaims/preauthorizations", input);

export const createDhaEmergency = (input: DhaEmergencyInput) =>
  post<unknown>("/integrations/dha/eclaims/emergencies", input);

export function addDhaAttachment(input: {
  patientId: number;
  consentAuthorizationId: number;
  interventionCode: string;
  documentType: string;
  file: File;
}) {
  const form = new FormData();
  form.set("patientId", String(input.patientId));
  form.set("consentAuthorizationId", String(input.consentAuthorizationId));
  form.set("interventionCode", input.interventionCode);
  form.set("documentType", input.documentType);
  form.set("file", input.file);
  return apiFetch<unknown>("/integrations/dha/eclaims/attachments", {
    method: "POST",
    body: form,
  });
}

export const submitDhaClaim = (claimId: number, input: SubmitDhaClaimInput) =>
  post<unknown>(`/sha-claims/${claimId}/submit-to-dha`, input);
