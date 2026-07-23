import { apiFetch } from "@/lib/api";
import type { InvoiceRecord } from "@/services/billing-service";
import type { Patient } from "@/types/patient";

export interface InsurancePayer {
  id: number;
  facilityId: number;
  code: string;
  name: string;
  payerType: string;
  integrationBaseUrl?: string | null;
  eligibilityPath?: string | null;
  claimSubmissionPath?: string | null;
  isActive: boolean;
  _count?: { policies: number; claims: number };
}

export interface PatientInsurancePolicy {
  id: number;
  facilityId: number;
  branchId?: number | null;
  policyNumber: string;
  memberNumber?: string | null;
  principalMemberName?: string | null;
  relationshipToPrincipal?: string | null;
  coverStartAt?: string | null;
  coverEndAt?: string | null;
  benefitLimit?: number | null;
  statusCode: string;
  lastVerifiedAt?: string | null;
  verificationReference?: string | null;
  payer: InsurancePayer;
  patient: Patient;
}

export interface PrivateInsuranceClaim {
  id: number;
  claimNumber: string;
  statusCode: string;
  claimedAmount: number;
  approvedAmount?: number | null;
  submittedAt?: string | null;
  externalClaimId?: string | null;
  submissionReference?: string | null;
  rejectionReason?: string | null;
  payer: InsurancePayer;
  policy: PatientInsurancePolicy;
  invoice: InvoiceRecord;
}

export function getInsurancePayers() {
  return apiFetch<InsurancePayer[]>("/private-insurance/payers");
}

export function createInsurancePayer(payload: {
  facilityId: number;
  code: string;
  name: string;
  integrationBaseUrl?: string;
  eligibilityPath?: string;
  claimSubmissionPath?: string;
  apiToken?: string;
}) {
  return apiFetch<InsurancePayer>("/private-insurance/payers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getInsurancePolicies() {
  return apiFetch<PatientInsurancePolicy[]>("/private-insurance/policies");
}

export function createInsurancePolicy(payload: {
  branchId?: number;
  patientId: number;
  insurancePayerId: number;
  policyNumber: string;
  memberNumber?: string;
  principalMemberName?: string;
  relationshipToPrincipal?: string;
  coverStartAt?: string;
  coverEndAt?: string;
  benefitLimit?: number;
}) {
  return apiFetch<PatientInsurancePolicy>("/private-insurance/policies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyInsurancePolicy(id: number) {
  return apiFetch<PatientInsurancePolicy>(
    `/private-insurance/policies/${id}/verify`,
    { method: "POST" },
  );
}

export function getPrivateInsuranceClaims() {
  return apiFetch<PrivateInsuranceClaim[]>("/private-insurance/claims");
}

export function createPrivateInsuranceClaim(payload: {
  patientInsurancePolicyId: number;
  invoiceId: number;
}) {
  return apiFetch<PrivateInsuranceClaim>("/private-insurance/claims", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitPrivateInsuranceClaim(id: number) {
  return apiFetch<PrivateInsuranceClaim>(
    `/private-insurance/claims/${id}/submit`,
    { method: "POST" },
  );
}
