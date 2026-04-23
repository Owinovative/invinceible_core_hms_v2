"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMpesaPaymentRequest } from "@/services/billing-service";

export function useCreateMpesaPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMpesaPaymentRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
    },
  });
}
