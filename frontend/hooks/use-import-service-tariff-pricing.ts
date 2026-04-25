"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importServiceTariffPricing } from "@/services/billing-service";

export function useImportServiceTariffPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importServiceTariffPricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-tariffs"] });
    },
  });
}
