import { apiFetch } from "@/lib/api";

export interface MedicineItem {
  id: number;
  code: string;
  name: string;
  dosageForm?: string | null;
  strength?: string | null;
  manufacturer?: string | null;
  unitPrice?: number | null;
  stockQuantity?: number | null;
  reorderLevel?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getMedicines() {
  return apiFetch<MedicineItem[]>("/pharmacy/medicines", {
    method: "GET",
  });
}

export async function getMedicineById(id: number) {
  return apiFetch<MedicineItem>(`/pharmacy/medicines/${id}`, {
    method: "GET",
  });
}
