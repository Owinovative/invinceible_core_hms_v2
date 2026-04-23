import { apiFetch } from "@/lib/api";

export interface ClinicFacility {
  id: number;
  code?: string;
  name?: string;
}

export interface ClinicBranch {
  id: number;
  code?: string;
  name?: string;
  facilityId?: number;
}

export interface ClinicDepartment {
  id: number;
  code?: string;
  name?: string;
  facilityId?: number;
  branchId?: number | null;
}

export interface ClinicItem {
  id: number;
  code: string;
  name: string;
  clinicType: string;
  roomLocation?: string | null;
  phoneExtension?: string | null;
  consultationMinutes?: number | null;
  maxDailyCapacity?: number | null;
  serviceStartTime?: string | null;
  serviceEndTime?: string | null;
  isWalkInAllowed?: boolean;
  isReferralRequired?: boolean;
  isActive?: boolean;
  notes?: string | null;
  facilityId: number;
  branchId?: number | null;
  departmentId: number;
  facility?: ClinicFacility | null;
  branch?: ClinicBranch | null;
  department?: ClinicDepartment | null;
}

export interface CreateClinicPayload {
  name: string;
  clinicType: string;
  facilityId: number;
  branchId?: number;
  departmentId: number;
  roomLocation?: string;
  phoneExtension?: string;
  consultationMinutes?: number;
  maxDailyCapacity?: number;
  serviceStartTime?: string;
  serviceEndTime?: string;
  isWalkInAllowed?: boolean;
  isReferralRequired?: boolean;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateClinicPayload {
  code?: string;
  name?: string;
  clinicType?: string;
  facilityId?: number;
  branchId?: number;
  departmentId?: number;
  roomLocation?: string;
  phoneExtension?: string;
  consultationMinutes?: number;
  maxDailyCapacity?: number;
  serviceStartTime?: string;
  serviceEndTime?: string;
  isWalkInAllowed?: boolean;
  isReferralRequired?: boolean;
  isActive?: boolean;
  notes?: string;
}

export async function getClinics() {
  return apiFetch<ClinicItem[]>("/clinics", {
    method: "GET",
  });
}

export async function createClinic(payload: CreateClinicPayload) {
  return apiFetch<ClinicItem>("/clinics", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateClinic(id: number, payload: UpdateClinicPayload) {
  return apiFetch<ClinicItem>(`/clinics/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
