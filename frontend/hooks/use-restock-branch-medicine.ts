"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restockBranchMedicine } from "@/services/pharmacy-stock-service";

export function useRestockBranchMedicine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stockId,
      payload,
    }: {
      stockId: number;
      payload: {
        quantityToAdd: number;
        reorderLevel?: number;
        buyingPrice?: number;
        unitPrice?: number;
      };
    }) => restockBranchMedicine(stockId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-pharmacy-stock"] });
      queryClient.invalidateQueries({ queryKey: ["low-pharmacy-stock"] });
    },
  });
}
