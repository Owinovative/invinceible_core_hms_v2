import { apiFetch } from "@/lib/api";

export interface LegalDocument {
  id: number;
  type: "TERMS" | "PRIVACY" | "COOKIES";
  version: string;
  title: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getPublishedLegalDocuments() {
  return apiFetch<LegalDocument[]>("/legal/documents/published");
}

export async function acceptLegalDocument(type: string, version: string) {
  return apiFetch("/legal/accept", {
    method: "POST",
    body: JSON.stringify({ type, version }),
  });
}

// Admin APIs

export async function getAllLegalDocuments() {
  return apiFetch<LegalDocument[]>("/legal/admin/documents");
}

export async function saveLegalDocumentDraft(payload: {
  type: string;
  version: string;
  title: string;
  content: string;
}) {
  return apiFetch<LegalDocument>("/legal/admin/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function publishLegalDocument(id: number) {
  return apiFetch<LegalDocument>(`/legal/admin/documents/${id}/publish`, {
    method: "POST",
  });
}
