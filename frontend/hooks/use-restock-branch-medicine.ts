"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  restockBranchMedicine,
  type RestockBranchMedicinePayload,
} from "@/services/pharmacy-stock-service";

export function useRestockBranchMedicine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stockId,
      payload,
    }: {
      stockId: number;
      payload: RestockBranchMedicinePayload;
    }) => restockBranchMedicine(stockId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-pharmacy-stock"] });
      queryClient.invalidateQueries({ queryKey: ["low-pharmacy-stock"] });
    },
  });
}
