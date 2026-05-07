import { apiFetch } from "@/lib/api";

// Legacy file.
// Prescription items are now created inside POST /pharmacy/prescriptions.
// Do not use this service in new code.


export interface PrescriptionItemRecord {
  id: number;
  prescriptionId: number;
  medicineId: number;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity: number;
  instructions?: string | null;
  statusCode: string;
  medicineNameSnapshot?: string | null;
  stockStatusAtPrescribing?: string | null;
  acceptedAlternativeForMedicineId?: number | null;
  medicine?: {
    id: number;
    code?: string;
    name: string;
    dosageForm?: string | null;
    strength?: string | null;
    manufacturer?: string | null;
  } | null;
}


export interface CreatePrescriptionItemPayload {
  prescriptionId: number;
  medicineId: number;
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  instructions?: string;
  stockStatusAtPrescribing?: string;
  acceptedAlternativeForMedicineId?: number;
  statusCode?: string;
}


export async function createPrescriptionItem(payload: CreatePrescriptionItemPayload) {
  return apiFetch<PrescriptionItemRecord>("/prescription-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function getPrescriptionItemsByPrescriptionId(prescriptionId: number) {
  return apiFetch<PrescriptionItemRecord[]>(
    `/prescription-items/prescription/${prescriptionId}`,
    {
      method: "GET",
    },
  );
}
