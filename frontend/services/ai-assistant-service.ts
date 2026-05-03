import { apiFetch } from "@/lib/api";

export type ClinicalAiTask =
  | "SOAP_NOTE"
  | "TREATMENT_PLAN"
  | "DISCHARGE_SUMMARY"
  | "PATIENT_INSTRUCTIONS"
  | "LAB_RESULT_SUMMARY"
  | "BILLING_NARRATIVE"
  | "PHARMACY_COUNSELLING"
  | "SYSTEM_NAVIGATION"
  | "GENERAL_DRAFT";

export const clinicalAiTaskOptions: Array<{
  value: ClinicalAiTask;
  label: string;
  description: string;
}> = [
  {
    value: "SOAP_NOTE",
    label: "SOAP note",
    description: "Subjective, objective, assessment, and plan.",
  },
  {
    value: "TREATMENT_PLAN",
    label: "Treatment plan",
    description: "A clean clinician-facing care plan draft.",
  },
  {
    value: "DISCHARGE_SUMMARY",
    label: "Discharge summary",
    description: "A structured summary for final review.",
  },
  {
    value: "PATIENT_INSTRUCTIONS",
    label: "Patient instructions",
    description: "Clear wording for patient counselling.",
  },
  {
    value: "LAB_RESULT_SUMMARY",
    label: "Lab summary",
    description: "Summarize lab context without inventing findings.",
  },
  {
    value: "BILLING_NARRATIVE",
    label: "Billing narrative",
    description: "Professional wording for invoice/service notes.",
  },
  {
    value: "PHARMACY_COUNSELLING",
    label: "Pharmacy counselling",
    description: "Medication-use counselling text for review.",
  },
  {
    value: "SYSTEM_NAVIGATION",
    label: "System navigator",
    description: "Help a user find the right module and workflow.",
  },
  {
    value: "GENERAL_DRAFT",
    label: "General draft",
    description: "Any clinical or operations text draft.",
  },
];

export interface AiAssistantStatus {
  enabled: boolean;
  provider?: string;
  model: string;
  safetyNotice: string;
  tasks: ClinicalAiTask[];
}

export interface CreateClinicalAiDraftPayload {
  task: ClinicalAiTask;
  prompt?: string;
  context?: Record<string, unknown>;
  audience?: string;
}

export interface ClinicalAiDraftResponse {
  task: ClinicalAiTask;
  taskLabel: string;
  model: string;
  output: string;
  safetyNotice: string;
  generatedAt: string;
}

export interface IdentityOcrResponse {
  fullName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  nationalIdNumber?: string | null;
  confidence: number;
  notes?: string;
  model: string;
  generatedAt: string;
}

export function getAiAssistantStatus() {
  return apiFetch<AiAssistantStatus>("/ai-assistant/status");
}

export function createClinicalAiDraft(payload: CreateClinicalAiDraftPayload) {
  return apiFetch<ClinicalAiDraftResponse>("/ai-assistant/clinical-draft", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function readIdentityCard(imageDataUrl: string) {
  return apiFetch<IdentityOcrResponse>("/ai-assistant/identity-ocr", {
    method: "POST",
    body: JSON.stringify({ imageDataUrl }),
  });
}
