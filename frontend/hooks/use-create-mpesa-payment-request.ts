"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMpesaPaymentRequest } from "@/services/billing-service";

export function useCreateMpesaPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMpesaPaymentRequest,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
      if (result.payment?.invoiceId) {
        queryClient.invalidateQueries({
          queryKey: ["billing-invoice", result.payment.invoiceId],
        });
      }
    },
  });
}
