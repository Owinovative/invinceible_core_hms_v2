"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeInvoice } from "@/services/billing-service";

export function useCloseInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: number) => closeInvoice(invoiceId),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
      queryClient.setQueryData(["billing-invoice", invoice.id], invoice);
    },
  });
}
