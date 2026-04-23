import { apiFetch } from "@/lib/api";

export interface CreateTriagePayload {
  patientId: number;
  facilityId: number;
  branchId?: number;
  clinicId?: number;
  appointmentId?: number;
  performedByStaffId?: number;
  routedDoctorId?: number;
  arrivalType?: string;
  chiefComplaint?: string;
  temperatureC?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
  painScore?: number;
  triagePriority?: string;
  statusCode?: string;
  notes?: string;
}

export interface UpdateTriagePayload {
  clinicId?: number;
  appointmentId?: number;
  performedByStaffId?: number;
  routedDoctorId?: number;
  chiefComplaint?: string;
  temperatureC?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
  painScore?: number;
  triagePriority?: string;
  statusCode?: string;
  notes?: string;
}

export interface TriageItem {
  id: number;
  triageNumber: string;
  patientId: number;
  arrivalType?:string | null;
  facilityId: number;
  branchId?: number | null;
  clinicId?: number | null;
  appointmentId?: number | null;
  performedByStaffId?: number | null;
  routedDoctorId?: number | null;
  chiefComplaint?: string | null;
  temperatureC?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  painScore?: number | null;
  triagePriority?: string | null;
  statusCode?: string | null;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  patient?: {
    id: number;
    patientNumber: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    phonePrimary?: string | null;
    gender?: string | null;
  } | null;
  clinic?: {
    id: number;
    name: string;
  } | null;
  routedDoctor?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

export async function createTriage(payload: CreateTriagePayload) {
  return apiFetch<TriageItem>("/triage", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function getReadyForDoctorTriage() {
  return apiFetch<TriageItem[]>("/triage/ready-for-doctor", {
    method: "GET",
  });
}
export async function getWaitingTriage() {
  return apiFetch<TriageItem[]>("/triage/waiting", {
    method: "GET",
  });
}
export async function getTriageByAppointmentId(appointmentId: number) {
  return apiFetch<TriageItem>(`/triage/appointment/${appointmentId}`, {
    method: "GET",
  });
}

export async function startTriage(id: number) {
  return apiFetch<TriageItem>(`/triage/${id}/start`, {
    method: "PATCH",
  });
}

export async function completeTriage(id: number, payload: UpdateTriagePayload) {
  return apiFetch<TriageItem>(`/triage/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
