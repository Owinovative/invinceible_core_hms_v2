import { apiFetch } from "@/lib/api";

// ─── Eligibility ────────────────────────────────────────────────────────────

export interface EligibilityResult {
  status: "ELIGIBLE" | "NOT_ELIGIBLE" | "NOT_FOUND" | "ERROR";
  memberName?: string;
  memberNumber?: string;
  nationalId?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  scheme?: string;
  schemeCode?: string;
  membershipStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXPIRED";
  facilityAssignment?: string;
  sponsor?: string;
  restrictions?: string[];
  coverageStart?: string;
  coverageEnd?: string;
  dependants?: EligibilityDependant[];
  benefits?: EligibilityBenefit[];
  responseTimestamp?: string;
  externalRef?: string;
  raw?: unknown;
  errorMessage?: string;
}

export interface EligibilityDependant {
  name: string;
  relationship: string;
  memberNumber?: string;
  status?: string;
}

export interface EligibilityBenefit {
  category: string;
  description?: string;
  limit?: number;
  used?: number;
  balance?: number;
  currency?: string;
}

export interface CheckEligibilityPayload {
  memberNumber?: string;
  nationalId?: string;
  shaNumber?: string;
  serviceDate?: string;
  interventionCode?: string;
}

export async function checkShaEligibility(
  payload: CheckEligibilityPayload,
): Promise<EligibilityResult> {
  // Try eligibility endpoint first (member number / SHA number path)
  const identifier = payload.memberNumber || payload.shaNumber;
  if (identifier) {
    const result = await apiFetch<{
      result: EligibilityResult;
      transaction: unknown;
    }>("/integrations/dha/eligibility", {
      method: "POST",
      body: JSON.stringify({
        memberNumber: identifier,
        serviceDate: payload.serviceDate,
        interventionCode: payload.interventionCode,
      }),
    });
    return result.result;
  }

  // National ID path — use patient verification
  if (payload.nationalId) {
    const result = await apiFetch<{
      result: EligibilityResult;
      transaction: unknown;
    }>("/integrations/dha/patients/verify", {
      method: "POST",
      body: JSON.stringify({ nationalId: payload.nationalId }),
    });
    return result.result;
  }

  throw new Error("Provide a member number, SHA number, or national ID");
}

// ─── Patient Verification ────────────────────────────────────────────────────

export interface PatientVerificationResult {
  status: "VERIFIED" | "NOT_FOUND" | "ERROR";
  data?: {
    name?: string;
    nationalId?: string;
    shaNumber?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  externalRef?: string;
}

export async function verifyPatientWithDha(params: {
  nationalId?: string;
  shaNumber?: string;
}): Promise<PatientVerificationResult> {
  const result = await apiFetch<{
    result: PatientVerificationResult;
    transaction: unknown;
  }>("/integrations/dha/patients/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return result.result;
}

// ─── DHA Status ─────────────────────────────────────────────────────────────

export interface DhaStatus {
  enabled: boolean;
  mode: string;
  apiVersion: string;
  queue: DhaQueueStat[];
}

export interface DhaQueueStat {
  integration: string;
  operation: string;
  status: string;
  count: number;
  oldestCreatedAt?: string;
}

export function getDhaStatus(): Promise<DhaStatus> {
  return apiFetch<DhaStatus>("/integrations/dha/status", { method: "GET" });
}

// ─── DHA Transactions ────────────────────────────────────────────────────────

export interface DhaTransaction {
  id: number;
  transactionType: string;
  statusCode: string;
  externalRef?: string | null;
  fhirResourceType?: string | null;
  apiVersion?: string | null;
  errorMessage?: string | null;
  correlationId?: string | null;
  patientId?: number | null;
  invoiceId?: number | null;
  shaClaimId?: number | null;
  consultationId?: number | null;
  facilityId: number;
  branchId?: number | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
}

export function getDhaTransactions(params?: {
  patientId?: number;
  transactionType?: string;
  limit?: number;
}): Promise<DhaTransaction[]> {
  const query = new URLSearchParams();
  if (params?.patientId) query.set("patientId", String(params.patientId));
  if (params?.transactionType)
    query.set("transactionType", params.transactionType);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiFetch<DhaTransaction[]>(
    `/integrations/dha/transactions${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
    },
  );
}

// ─── Claim Status Poll ───────────────────────────────────────────────────────

export async function pollShaClaimStatus(claimId: number): Promise<{
  status: string;
  externalRef?: string;
  raw?: unknown;
}> {
  return apiFetch(`/integrations/dha/claims/${claimId}/status`, {
    method: "GET",
  });
}

/** Update claim status (accessible to billing staff without ADMIN role). */
export async function updateClaimStatus(
  claimId: number,
  statusCode: string,
  rejectionReason?: string,
): Promise<unknown> {
  return apiFetch(`/sha-claims/${claimId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ statusCode, rejectionReason }),
  });
}
