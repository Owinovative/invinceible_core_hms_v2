import { apiFetch } from "@/lib/api";

export interface PharmacyMedicine {
  id: number;
  code?: string;
  name: string;
  dosageForm?: string | null;
  strength?: string | null;
  manufacturer?: string | null;
  unitPrice?: number | null;
  stockQuantity?: number | null;
  reorderLevel?: number | null;
  isActive?: boolean;
}

export interface CreatePharmacyMedicinePayload {
  code: string;
  name: string;
  dosageForm?: string;
  strength?: string;
  manufacturer?: string;
  unitPrice?: number;
  stockQuantity?: number;
  reorderLevel?: number;
  isActive?: boolean;
}
export interface DispenseItemRecord {
  id: number;
  quantityPrescribed: number;
  quantityDispensed: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
  medicine?: {
    id: number;
    name: string;
    code?: string;
    dosageForm?: string | null;
    strength?: string | null;
  } | null;
  prescriptionItem?: {
    id: number;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  } | null;
}

export interface DispenseRecord {
  id: number;
  dispenseNumber: string;
  statusCode: string;
  notes?: string | null;
  dispensedAt?: string;
  dispensedBy?: {
    id: number;
    firstName?: string;
    lastName?: string;
    staffCode?: string;
  } | null;
  items?: DispenseItemRecord[];
}

export interface PharmacyPrescriptionItem {
  id: number;
  prescriptionId: number;
  medicineId: number;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity: number;
  instructions?: string | null;
  medicineNameSnapshot?: string | null;
  stockStatusAtPrescribing?: string | null;
  acceptedAlternativeForMedicineId?: number | null;
  statusCode: string;
  medicine?: PharmacyMedicine | null;
}

export interface PharmacyDispenseItem {
  id: number;
  dispenseId: number;
  prescriptionItemId: number;
  medicineId: number;
  quantityPrescribed: number;
  quantityDispensed: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
  medicine?: PharmacyMedicine | null;
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

export interface PharmacyDispenseRecord {
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
  items?: PharmacyDispenseItem[];
}

export interface PharmacyPrescriptionRecord {
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
  prescribedBy?: {
    id: number;
    firstName?: string;
    lastName?: string;
    staffCode?: string;
  } | null;
  branch?: {
    id: number;
    name?: string;
  } | null;
  facility?: {
    id: number;
    name?: string;
  } | null;
  items?: PharmacyPrescriptionItem[];
  dispenses?: PharmacyDispenseRecord[];
}

export async function getPharmacyQueue() {
  return apiFetch<PharmacyPrescriptionRecord[]>("/pharmacy/queue", {
    method: "GET",
  });
}

export async function getPharmacyMedicines() {
  return apiFetch<PharmacyMedicine[]>("/pharmacy/medicines", {
    method: "GET",
  });
}

export async function createPharmacyMedicine(
  payload: CreatePharmacyMedicinePayload,
) {
  return apiFetch<PharmacyMedicine>("/pharmacy/medicines", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPharmacyPrescriptionById(id: number) {
  return apiFetch<PharmacyPrescriptionRecord>(`/pharmacy/prescriptions/${id}`, {
    method: "GET",
  });
}

export interface DispensePrescriptionPayload {
  notes?: string;
  items?: Array<{
    prescriptionItemId: number;
    medicineId: number;
    quantityDispensed: number;
    notes?: string;
  }>;
}

export interface DirectMedicineAdministrationPayload {
  consultationId: number;
  patientId: number;
  medicineId: number;
  quantity: number;
  mode: "DIRECT_DISPENSE" | "INJECTION";
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  notes?: string;
}

export async function dispensePharmacyPrescription(
  id: number,
  payload?: DispensePrescriptionPayload,
) {
  return apiFetch<PharmacyPrescriptionRecord>(`/pharmacy/prescriptions/${id}/dispense`, {
    method: "PATCH",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function directMedicineAdministration(
  payload: DirectMedicineAdministrationPayload,
) {
  return apiFetch<PharmacyPrescriptionRecord>("/pharmacy/direct-administrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
