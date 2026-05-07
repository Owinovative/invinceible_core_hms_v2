import { apiFetch } from "@/lib/api";

export interface MedicineSummary {
  id: number;
  code?: string;
  name: string;
  dosageForm?: string | null;
  strength?: string | null;
  manufacturer?: string | null;
}

export interface PrescriptionItemSummary {
  id: number;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity: number;
  instructions?: string | null;
  statusCode?: string | null;
  medicineNameSnapshot?: string | null;
  stockStatusAtPrescribing?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | string | null;
  acceptedAlternativeForMedicineId?: number | null;
  medicineId: number;
  medicine?: MedicineSummary | null;
}

export interface DispenseItemRecord {
  id: number;
  dispenseId: number;
  prescriptionItemId: number;
  medicineId: number;
  quantityPrescribed: number;
  quantityDispensed: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
  medicine?: MedicineSummary | null;
  prescriptionItem?: {
    id: number;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    quantity: number;
    instructions?: string | null;
    statusCode?: string | null;
  } | null;
}

export interface DispenseRecord {
  id: number;
  dispenseNumber: string;
  prescriptionId: number;
  patientId: number;
  facilityId: number;
  branchId?: number | null;
  dispensedByStaffId?: number | null;
  statusCode: string;
  notes?: string | null;
  dispensedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  dispensedBy?: {
    id: number;
    firstName?: string;
    lastName?: string;
    staffCode?: string;
  } | null;
  items?: DispenseItemRecord[];
}

export interface PrescriptionRecord {
  id: number;
  prescriptionNumber: string;
  notes?: string | null;
  statusCode: string;
  prescribedAt?: string;
  dispensedAt?: string | null;
  consultationId: number;
  patientId: number;
  prescribedByStaffId: number;
  facilityId: number;
  branchId?: number | null;
  patient?: {
    id: number;
    patientNumber?: string;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    gender?: string | null;
    phonePrimary?: string | null;
  } | null;
  consultation?: {
    id: number;
    consultationNumber?: string;
  } | null;
  prescribedBy?: {
    id: number;
    firstName?: string;
    lastName?: string;
    staffCode?: string;
  } | null;
  items?: PrescriptionItemSummary[];
  dispenses?: DispenseRecord[];
}

export interface CreatePrescriptionItemPayload {
  medicineId: number;
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  instructions?: string;
  stockStatusAtPrescribing?: string;
  acceptedAlternativeForMedicineId?: number;
}

export interface CreatePrescriptionPayload {
  consultationId: number;
  patientId: number;
  prescribedByStaffId: number;
  notes?: string;
  items: CreatePrescriptionItemPayload[];
}

export async function createPrescription(payload: CreatePrescriptionPayload) {
  return apiFetch<PrescriptionRecord>("/pharmacy/prescriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPrescriptions() {
  return apiFetch<PrescriptionRecord[]>("/pharmacy/prescriptions", {
    method: "GET",
  });
}

export async function getPrescriptionById(id: number) {
  return apiFetch<PrescriptionRecord>(`/pharmacy/prescriptions/${id}`, {
    method: "GET",
  });
}

export async function getPharmacyQueue() {
  return apiFetch<PrescriptionRecord[]>("/pharmacy/queue", {
    method: "GET",
  });
}
export async function getPrescriptionsByConsultationId(consultationId: number) {
  return apiFetch<PrescriptionRecord[]>(
    `/prescriptions/consultation/${consultationId}`,
  );
}

export async function getPrescriptionsByPatientId(patientId: number) {
  return apiFetch<PrescriptionRecord[]>(`/prescriptions/patient/${patientId}`);
}

export async function dispensePrescription(id: number) {
  return apiFetch<PrescriptionRecord>(`/pharmacy/prescriptions/${id}/dispense`, {
    method: "PATCH",
  });
}
