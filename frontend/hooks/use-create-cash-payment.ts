"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCashPayment } from "@/services/billing-service";

export function useCreateCashPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCashPayment,
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
      if (payment.invoiceId) {
        queryClient.invalidateQueries({
          queryKey: ["billing-invoice", payment.invoiceId],
        });
      }
    },
  });
}
