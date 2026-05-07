"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getBranchPharmacyStock,
  type BranchMedicineStockListParams,
} from "@/services/pharmacy-stock-service";

export function useBranchPharmacyStock(
  branchId?: number,
  params?: BranchMedicineStockListParams,
) {
  return useQuery({
    queryKey: ["branch-pharmacy-stock", branchId, params],
    queryFn: () => getBranchPharmacyStock(branchId as number, params),
    enabled: !!branchId,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });
}
