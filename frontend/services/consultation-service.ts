import { apiFetch } from "@/lib/api";
import type { PrescriptionRecord } from "@/services/prescription-service";


export interface ConsultationItem {
  id: number;
  consultationNumber: string;
  appointmentId: number;
  patientId: number;
  doctorId: number;
  chiefComplaint?: string | null;
  historyOfPresenting?: string | null;
  examinationFindings?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  notes?: string | null;
  statusCode?: string | null;
  completedAt?: string | null;
  facilityId: number;
  branchId?: number | null;
  patient?: {
    id: number;
    patientNumber: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender?: string | null;
    phonePrimary?: string | null;
  } | null;
  doctor?: {
    id: number;
    firstName: string;
    lastName: string;
    designation?: string | null;
  } | null;
  appointment?: {
    id: number;
    appointmentNumber: string;
    statusCode?: string | null;
    appointmentDate?: string | null;
    triagePriority?: string | null;
  } | null;
}

export interface ConsultationWorkspaceResponse {
  consultation: ConsultationItem;
  latestTriage?: Record<string, any> | null;
  recentConsultations: ConsultationItem[];
  consultationPrescriptions: PrescriptionRecord[];
  patientPrescriptions: PrescriptionRecord[];
  labOrders: Array<Record<string, any>>;
  activeAdmission?: Record<string, any> | null;
  meta?: {
    durationMs?: number;
    limitedHistory?: boolean;
  };
}


export interface CreateConsultationPayload {
  consultationNumber: string;
  appointmentId: number;
  patientId: number;
  doctorId: number;
  chiefComplaint?: string;
  historyOfPresenting?: string;
  examinationFindings?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  notes?: string;
  statusCode?: string;
}


export interface UpdateConsultationPayload {
  chiefComplaint?: string;
  historyOfPresenting?: string;
  examinationFindings?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  notes?: string;
  statusCode?: string;
}


export async function createConsultation(payload: CreateConsultationPayload) {
  return apiFetch<ConsultationItem>("/consultations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function getConsultations() {
  return apiFetch<ConsultationItem[]>("/consultations", {
    method: "GET",
  });
}


export async function getConsultationById(id: number) {
  return apiFetch<ConsultationItem>(`/consultations/${id}`, {
    method: "GET",
  });
}

export async function getConsultationWorkspace(id: number) {
  return apiFetch<ConsultationWorkspaceResponse>(
    `/consultations/${id}/workspace`,
    { method: "GET" },
  );
}


export async function updateConsultation(
  id: number,
  payload: UpdateConsultationPayload,
) {
  return apiFetch<ConsultationItem>(`/consultations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export async function getConsultationsByPatientId(patientId: number) {
  return apiFetch<ConsultationItem[]>(`/consultations/patient/${patientId}`, {
    method: "GET",
  });
}


export async function completeConsultation(id: number) {
  return apiFetch<ConsultationItem>(`/consultations/${id}/complete`, {
    method: "PATCH",
  });
}
