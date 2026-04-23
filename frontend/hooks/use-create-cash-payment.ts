"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCashPayment } from "@/services/billing-service";

export function useCreateCashPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCashPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
    },
  });
}
