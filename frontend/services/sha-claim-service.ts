import { apiDownload, apiFetch } from "@/lib/api";
import type { Facility } from "@/services/facility-service";
import type { Branch } from "@/services/branch-service";
import type { InvoiceRecord } from "@/services/billing-service";

export interface ShaClaimRecord {
  id: number;
  claimNumber: string;
  statusCode: string;
  fidCode?: string | null;
  memberNumber?: string | null;
  diagnosisCode?: string | null;
  diagnosisText?: string | null;
  servicePeriodStart?: string | null;
  servicePeriodEnd?: string | null;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  rejectedAmount: number;
  rejectionReason?: string | null;
  patientSignatureUrl?: string | null;
  facilitySignatureUrl?: string | null;
  rubberStampUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
  facilityId: number;
  branchId?: number | null;
  patientId: number;
  invoiceId?: number | null;
  facility?: Facility | null;
  branch?: Branch | null;
  invoice?: InvoiceRecord | null;
  patient?: {
    id: number;
    patientNumber?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    phonePrimary?: string | null;
  } | null;
}

export interface ShaClaimSummary {
  count: number;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  rejectedAmount: number;
  coveredAmount?: number;
  lossAmount?: number;
  outstandingAmount: number;
  byStatus: Record<string, number>;
}

export interface CreateShaClaimPayload {
  facilityId: number;
  branchId?: number;
  patientId: number;
  invoiceId?: number;
  memberNumber?: string;
  diagnosisCode?: string;
  diagnosisText?: string;
  servicePeriodStart?: string;
  servicePeriodEnd?: string;
  claimedAmount?: number;
  notes?: string;
  patientSignatureUrl?: string;
  facilitySignatureUrl?: string;
  rubberStampUrl?: string;
}

export interface UpdateShaClaimPayload {
  branchId?: number | null;
  invoiceId?: number | null;
  statusCode?: string;
  memberNumber?: string;
  diagnosisCode?: string;
  diagnosisText?: string;
  servicePeriodStart?: string;
  servicePeriodEnd?: string;
  claimedAmount?: number;
  approvedAmount?: number;
  paidAmount?: number;
  rejectedAmount?: number;
  rejectionReason?: string | null;
  notes?: string | null;
  patientSignatureUrl?: string | null;
  facilitySignatureUrl?: string | null;
  rubberStampUrl?: string | null;
}

export function getShaClaims() {
  return apiFetch<ShaClaimRecord[]>("/sha-claims", { method: "GET" });
}

export function getShaClaimSummary() {
  return apiFetch<ShaClaimSummary>("/sha-claims/summary", { method: "GET" });
}

export function createShaClaim(payload: CreateShaClaimPayload) {
  return apiFetch<ShaClaimRecord>("/sha-claims", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateShaClaim(id: number, payload: UpdateShaClaimPayload) {
  return apiFetch<ShaClaimRecord>(`/sha-claims/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function downloadShaClaimPdf(id: number, claimNumber?: string) {
  return apiDownload(
    `/sha-claims/${id}/pdf`,
    `${claimNumber || `sha-claim-${id}`}.pdf`,
  );
}
