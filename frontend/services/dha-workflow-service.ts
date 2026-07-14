import { apiFetch } from "@/lib/api";

export type DhaWorkflowAction =
  | "authorize"
  | "visit"
  | "interventions"
  | "diagnoses"
  | "items"
  | "preview"
  | "submit"
  | "discharge"
  | "close"
  | "emergency"
  | "preauthorizations"
  | "emt"
  | "otp-whitelist";

export type DhaWorkflow = {
  id: number;
  status: string;
  patientId: number;
  serviceType: "INPATIENT" | "OUTPATIENT";
  dhaClaimReference?: string | null;
  lastError?: string | null;
  steps?: Array<{ id: number; action: string; status: string; errorMessage?: string | null; completedAt?: string | null }>;
};

type ActionPayload = { payload: Record<string, unknown>; idempotencyKey: string };

export function createDhaWorkflow(payload: {
  patientId: number;
  serviceType: "INPATIENT" | "OUTPATIENT";
  interventionCodes: string[];
  shaClaimId?: number;
  consultationId?: number;
}) {
  return apiFetch<DhaWorkflow>("/integrations/dha/claim-workflows", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitDhaWorkflowAction(
  workflowId: number,
  action: DhaWorkflowAction,
  payload: ActionPayload,
) {
  return apiFetch<{ workflowId: number; stepId: number; idempotent?: boolean }>(
    `/integrations/dha/claim-workflows/${workflowId}/${action}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function recoverDhaWorkflow(workflowId: number) {
  return apiFetch<{ workflowId: number; recovered: number }>(
    `/integrations/dha/claim-workflows/${workflowId}/recover`,
    { method: "POST" },
  );
}

export function getDhaWorkflow(workflowId: number) {
  return apiFetch<DhaWorkflow>(`/integrations/dha/claim-workflows/${workflowId}`, {
    method: "GET",
  });
}

export function uploadDhaWorkflowAttachment(
  workflowId: number,
  values: { documentType: string; interventionCode: string; file: File },
) {
  const form = new FormData();
  form.set("documentType", values.documentType);
  form.set("interventionCode", values.interventionCode);
  form.set("file", values.file);
  return apiFetch(`/integrations/dha/claim-workflows/${workflowId}/attachments`, {
    method: "POST",
    body: form,
  });
}
