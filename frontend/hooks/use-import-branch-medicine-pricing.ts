"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importBranchMedicinePricing } from "@/services/pharmacy-stock-service";

export function useImportBranchMedicinePricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      csvText,
    }: {
      branchId: number;
      csvText: string;
    }) => importBranchMedicinePricing(branchId, csvText),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: ["branch-pharmacy-stock", payload.branchId],
      });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-medicines"] });
      queryClient.invalidateQueries({ queryKey: ["low-pharmacy-stock"] });
    },
  });
}
