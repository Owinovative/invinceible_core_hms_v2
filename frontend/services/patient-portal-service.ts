import { apiFetch } from "@/lib/api";

export interface PatientPortalLabResult {
  id: number;
  resultValue: string;
  remarks?: string | null;
  attachmentFileName?: string | null;
  attachmentMimeType?: string | null;
  recordedAt: string;
  statusCode: "RELEASED";
  validatedAt?: string | null;
  releasedAt?: string | null;
}

export interface PatientPortalLabOrder {
  id: number;
  orderNumber: string;
  urgency?: string | null;
  status: string;
  createdAt: string;
  items: Array<{
    id: number;
    status: string;
    test: {
      id: number;
      testName: string;
      category?: string | null;
    };
    results: PatientPortalLabResult[];
  }>;
}

export function getPatientPortalLabResults() {
  return apiFetch<PatientPortalLabOrder[]>("/patient-portal/lab-results");
}
