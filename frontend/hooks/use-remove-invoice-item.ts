"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeInvoiceItem } from "@/services/billing-service";

export function useRemoveInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      reason,
    }: {
      id: number;
      reason: string;
    }) => removeInvoiceItem(id, { reason }),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      if (invoice?.id) {
        queryClient.invalidateQueries({
          queryKey: ["billing-invoice", invoice.id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
    },
  });
}
