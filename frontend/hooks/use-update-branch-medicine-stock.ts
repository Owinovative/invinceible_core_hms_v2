"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateBranchMedicineStock,
  type UpdateBranchMedicineStockPayload,
} from "@/services/pharmacy-stock-service";

export function useUpdateBranchMedicineStock(branchId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stockId,
      payload,
    }: {
      stockId: number;
      payload: UpdateBranchMedicineStockPayload;
    }) => updateBranchMedicineStock(stockId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["branch-pharmacy-stock", branchId],
      });
      queryClient.invalidateQueries({ queryKey: ["low-pharmacy-stock"] });
    },
  });
}
