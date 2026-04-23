import { apiFetch } from "@/lib/api";

export interface IpdFacility {
  id: number;
  name?: string;
  code?: string;
}

export interface IpdBranch {
  id: number;
  name?: string;
  code?: string;
}

export interface WardItem {
  id: number;
  code: string;
  name: string;
  wardType?: string | null;
  capacity?: number | null;
  isActive?: boolean;
  facilityId?: number | null;
  branchId?: number | null;
  facility?: IpdFacility | null;
  branch?: IpdBranch | null;
  beds?: BedItem[];
}

export interface BedItem {
  id: number;
  bedNumber: string;
  bedLabel?: string | null;
  wardId: number;
  facilityId?: number | null;
  branchId?: number | null;
  statusCode?: string | null;
  isActive?: boolean;
  ward?: WardItem | null;
  facility?: IpdFacility | null;
  branch?: IpdBranch | null;
}

export interface AdmissionItem {
  id: number;
  admissionNumber: string;
  admissionReason?: string | null;
  admissionSource?: string | null;
  statusCode: string;
  admittedAt?: string;
  dischargedAt?: string | null;
  expectedDischargeAt?: string | null;
  notes?: string | null;
  facilityId: number;
  branchId?: number | null;
  patientId: number;
  appointmentId?: number | null;
  consultationId?: number | null;
  admittedByStaffId?: number | null;
  wardId: number;
  bedId?: number | null;
  facility?: IpdFacility | null;
  branch?: IpdBranch | null;
  patient?: {
    id: number;
    patientNumber?: string;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    gender?: string | null;
    phonePrimary?: string | null;
  } | null;
  appointment?: {
    id: number;
    appointmentNumber?: string;
  } | null;
  consultation?: {
    id: number;
    consultationNumber?: string;
  } | null;
  admittedBy?: {
    id: number;
    firstName?: string;
    lastName?: string;
  } | null;
  ward?: WardItem | null;
  bed?: BedItem | null;
}

export interface CreateAdmissionPayload {
  admissionNumber: string;
  patientId: number;
  appointmentId?: number;
  consultationId?: number;
  admittedByStaffId?: number;
  wardId: number;
  bedId?: number;
  admissionReason?: string;
  admissionSource?: string;
  expectedDischargeAt?: string;
  notes?: string;
}

export interface TransferAdmissionBedPayload {
  wardId: number;
  bedId?: number;
  notes?: string;
}

export interface CreateWardPayload {
  code: string;
  name: string;
  wardType?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface UpdateWardPayload {
  code?: string;
  name?: string;
  wardType?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface CreateBedPayload {
  bedNumber: string;
  bedLabel?: string;
  wardId: number;
  statusCode?: string;
  isActive?: boolean;
}

export interface UpdateBedPayload {
  bedNumber?: string;
  bedLabel?: string;
  wardId?: number;
  statusCode?: string;
  isActive?: boolean;
}

export interface UpdateBedStatusPayload {
  statusCode: string;
}

export async function createWard(payload: CreateWardPayload) {
  return apiFetch<WardItem>("/ipd/wards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWard(id: number, payload: UpdateWardPayload) {
  return apiFetch<WardItem>(`/ipd/wards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createBed(payload: CreateBedPayload) {
  return apiFetch<BedItem>("/ipd/beds", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBed(id: number, payload: UpdateBedPayload) {
  return apiFetch<BedItem>(`/ipd/beds/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateBedStatus(
  id: number,
  payload: UpdateBedStatusPayload,
) {
  return apiFetch<BedItem>(`/ipd/beds/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getWards() {
  return apiFetch<WardItem[]>("/ipd/wards", {
    method: "GET",
  });
}

export async function getBeds() {
  return apiFetch<BedItem[]>("/ipd/beds", {
    method: "GET",
  });
}

export async function createAdmission(payload: CreateAdmissionPayload) {
  return apiFetch<AdmissionItem>("/ipd/admissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function transferAdmissionBed(
  id: number,
  payload: TransferAdmissionBedPayload,
) {
  return apiFetch<AdmissionItem>(`/ipd/admissions/${id}/transfer-bed`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdmissions() {
  return apiFetch<AdmissionItem[]>("/ipd/admissions", {
    method: "GET",
  });
}

export async function getActiveAdmissions() {
  return apiFetch<AdmissionItem[]>("/ipd/admissions/active", {
    method: "GET",
  });
}

export async function getAdmissionById(id: number) {
  return apiFetch<AdmissionItem>(`/ipd/admissions/${id}`, {
    method: "GET",
  });
}

export async function dischargeAdmission(id: number) {
  return apiFetch<AdmissionItem>(`/ipd/admissions/${id}/discharge`, {
    method: "PATCH",
  });
}
