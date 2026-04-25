"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBranchMedicineStock,
  type CreateBranchMedicineStockPayload,
} from "@/services/pharmacy-stock-service";

export function useCreateBranchMedicineStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBranchMedicineStockPayload) =>
      createBranchMedicineStock(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: ["branch-pharmacy-stock", payload.branchId],
      });
      queryClient.invalidateQueries({ queryKey: ["low-pharmacy-stock"] });
    },
  });
}
