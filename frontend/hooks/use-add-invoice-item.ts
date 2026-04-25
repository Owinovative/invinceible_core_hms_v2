"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addInvoiceItem,
  type AddInvoiceItemPayload,
} from "@/services/billing-service";

export function useAddInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: number;
      payload: AddInvoiceItemPayload;
    }) => addInvoiceItem(invoiceId, payload),
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
      queryClient.invalidateQueries({
        queryKey: ["patient-billing-workspace", updatedInvoice.patientId],
      });
      queryClient.setQueryData(
        ["billing-invoice", updatedInvoice.id],
        updatedInvoice,
      );
    },
  });
}
