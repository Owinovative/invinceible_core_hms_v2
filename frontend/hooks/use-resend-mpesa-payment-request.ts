"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resendMpesaPaymentRequest } from "@/services/billing-service";

export function useResendMpesaPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: number) => resendMpesaPaymentRequest(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
    },
  });
}
