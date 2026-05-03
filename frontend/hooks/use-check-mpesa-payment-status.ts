"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkMpesaPaymentStatus } from "@/services/billing-service";

export function useCheckMpesaPaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checkoutRequestId: string) =>
      checkMpesaPaymentStatus(checkoutRequestId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
      if (result.payment?.invoice?.id) {
        queryClient.invalidateQueries({
          queryKey: ["billing-invoice", result.payment.invoice.id],
        });
      }
    },
  });
}
