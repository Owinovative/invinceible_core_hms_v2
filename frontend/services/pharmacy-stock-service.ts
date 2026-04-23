import { apiFetch } from "@/lib/api";

export interface PharmacyStockMedicine {
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

export interface BranchMedicineStockItem {
  id: number;
  facilityId: number;
  branchId: number;
  medicineId: number;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  isActive: boolean;
  medicine?: PharmacyStockMedicine | null;
  branch?: {
    id: number;
    name?: string;
  } | null;
  facility?: {
    id: number;
    name?: string;
  } | null;
}

export interface LowStockSummaryItem {
  id: number;
  facilityId: number;
  facilityName?: string | null;
  branchId: number;
  branchName?: string | null;
  medicineId: number;
  medicineCode?: string | null;
  medicineName?: string | null;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
}

export interface LowStockResponse {
  filters: {
    facilityId?: number | null;
    branchId?: number | null;
  };
  summary: {
    totalChecked: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  lowStockItems: LowStockSummaryItem[];
  outOfStockItems: LowStockSummaryItem[];
}

export interface RestockBranchMedicinePayload {
  quantityToAdd: number;
  reorderLevel?: number;
  unitPrice?: number;
}

export async function getBranchPharmacyStock(branchId: number) {
  return apiFetch<BranchMedicineStockItem[]>(
    `/pharmacy-stock/branch/${branchId}`,
    {
      method: "GET",
    },
  );
}

export async function getLowPharmacyStock() {
  return apiFetch<{
    filters: {
      facilityId?: number | null;
      branchId?: number | null;
    };
    summary: {
      totalChecked: number;
      lowStockCount: number;
      outOfStockCount: number;
    };
    lowStockItems: Array<{
      id: number;
      medicineName?: string | null;
      stockQuantity: number;
      reorderLevel: number;
    }>;
    outOfStockItems: Array<{
      id: number;
      medicineName?: string | null;
      stockQuantity: number;
      reorderLevel: number;
    }>;
  }>("/pharmacy-stock/low-stock", {
    method: "GET",
  });
}


export async function restockBranchMedicine(
  stockId: number,
  payload: RestockBranchMedicinePayload,
) {
  return apiFetch<BranchMedicineStockItem>(`/pharmacy-stock/${stockId}/restock`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
