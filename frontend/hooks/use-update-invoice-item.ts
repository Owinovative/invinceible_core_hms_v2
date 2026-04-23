"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateInvoiceItem,
  type UpdateInvoiceItemPayload,
} from "@/services/billing-service";

export function useUpdateInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateInvoiceItemPayload;
    }) => updateInvoiceItem(id, payload),
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
      queryClient.setQueryData(
        ["billing-invoice", updatedInvoice.id],
        updatedInvoice,
      );
    },
  });
}
