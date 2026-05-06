"use client";

import { useQuery } from "@tanstack/react-query";
import { getMedicineStockAlternatives } from "@/services/pharmacy-stock-service";

export function useMedicineStockAlternatives(
  branchId?: number | null,
  medicineId?: number | null,
) {
  return useQuery({
    queryKey: ["medicine-stock-alternatives", branchId, medicineId],
    queryFn: () =>
      getMedicineStockAlternatives(branchId as number, medicineId as number),
    enabled: Boolean(branchId && medicineId),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
