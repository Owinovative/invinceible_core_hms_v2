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
  buyingPrice: number;
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

export interface BranchMedicineStockListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface PaginatedBranchMedicineStockResponse {
  data: BranchMedicineStockItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface BranchMedicineAlternativeItem extends BranchMedicineStockItem {
  score: number;
  reasons: string[];
  safetyNote: string;
}

export interface MedicineStockAlternativesResponse {
  branch: {
    id: number;
    name: string;
    facilityId: number;
    facilityName?: string | null;
  };
  selectedMedicine: PharmacyStockMedicine;
  selectedStock?: BranchMedicineStockItem | null;
  selectedStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  alternatives: BranchMedicineAlternativeItem[];
  safetyNotice: string;
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
  buyingPrice: number;
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
  buyingPrice?: number;
  unitPrice?: number;
}

export interface CreateBranchMedicineStockPayload {
  facilityId: number;
  branchId: number;
  medicineId: number;
  stockQuantity?: number;
  reorderLevel?: number;
  buyingPrice?: number;
  unitPrice?: number;
  isActive?: boolean;
}

export interface UpdateBranchMedicineStockPayload {
  stockQuantity?: number;
  reorderLevel?: number;
  buyingPrice?: number;
  unitPrice?: number;
  isActive?: boolean;
}

export interface BranchMedicinePricingTemplate {
  fileName: string;
  branch: {
    id: number;
    name: string;
    facilityId: number;
    facilityName?: string | null;
  };
  columns: string[];
  rowCount: number;
  csvText: string;
}

export interface BranchMedicinePricingImportResult {
  branch: {
    id: number;
    name: string;
    facilityId: number;
  };
  processed: number;
  created: number;
  updated: number;
  masterCreated?: number;
  masterUpdated?: number;
  skipped: number;
  errors: Array<{
    row: number;
    medicineCode?: string;
    message: string;
  }>;
}

export async function getBranchPharmacyStock(
  branchId: number,
  params?: BranchMedicineStockListParams,
) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.sortBy) query.set("sortBy", params.sortBy);
  if (params?.sortDirection) query.set("sortDirection", params.sortDirection);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  return apiFetch<PaginatedBranchMedicineStockResponse>(
    `/pharmacy-stock/branch/${branchId}${suffix}`,
    { method: "GET" },
  );
}

export async function searchBranchPharmacyStock(
  branchId: number,
  search?: string,
) {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<BranchMedicineStockItem[]>(
    `/pharmacy-stock/branch/${branchId}/search${suffix}`,
    {
      method: "GET",
    },
  );
}

export async function getMedicineStockAlternatives(
  branchId: number,
  medicineId: number,
) {
  return apiFetch<MedicineStockAlternativesResponse>(
    `/pharmacy-stock/branch/${branchId}/medicine/${medicineId}/alternatives`,
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
  return apiFetch<BranchMedicineStockItem>(
    `/pharmacy-stock/${stockId}/restock`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function getBranchMedicinePricingTemplate(branchId: number) {
  return apiFetch<BranchMedicinePricingTemplate>(
    `/pharmacy-stock/branch/${branchId}/pricing-template`,
    {
      method: "GET",
    },
  );
}

export async function importBranchMedicinePricing(
  branchId: number,
  csvText: string,
) {
  return apiFetch<BranchMedicinePricingImportResult>(
    `/pharmacy-stock/branch/${branchId}/pricing-import`,
    {
      method: "POST",
      body: JSON.stringify({ csvText }),
    },
  );
}

export async function createBranchMedicineStock(
  payload: CreateBranchMedicineStockPayload,
) {
  return apiFetch<BranchMedicineStockItem>("/pharmacy-stock", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBranchMedicineStock(
  stockId: number,
  payload: UpdateBranchMedicineStockPayload,
) {
  return apiFetch<BranchMedicineStockItem>(`/pharmacy-stock/${stockId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
