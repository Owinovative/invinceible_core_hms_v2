import { apiFetch } from "@/lib/api";
import type { Patient } from "@/types/patient";

export interface CreatePatientPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  email?: string;
  occupation?: string;
  facilityId: number;
  isDeceased?: boolean;
  isActive?: boolean;
}

export async function getPatients() {
  return apiFetch<Patient[]>("/patients", {
    method: "GET",
  });
}

export async function getPatientById(id: number) {
  return apiFetch<Patient>(`/patients/${id}`, {
    method: "GET",
  });
}

export async function createPatient(payload: CreatePatientPayload) {
  return apiFetch<Patient>("/patients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
