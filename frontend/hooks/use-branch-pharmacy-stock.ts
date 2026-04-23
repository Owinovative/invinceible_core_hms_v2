"use client";

import { useQuery } from "@tanstack/react-query";
import { getBranchPharmacyStock } from "@/services/pharmacy-stock-service";

export function useBranchPharmacyStock(branchId?: number) {
  return useQuery({
    queryKey: ["branch-pharmacy-stock", branchId],
    queryFn: () => getBranchPharmacyStock(branchId as number),
    enabled: !!branchId,
  });
}
