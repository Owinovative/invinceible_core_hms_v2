"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { openPatientInvoice } from "@/services/billing-service";

export function useOpenPatientInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      patientId,
      payload,
    }: {
      patientId: number;
      payload?: { branchId?: number; createdByStaffId?: number };
    }) => openPatientInvoice(patientId, payload),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
      queryClient.invalidateQueries({
        queryKey: ["patient-billing-workspace", invoice.patientId],
      });
      queryClient.setQueryData(["billing-invoice", invoice.id], invoice);
    },
  });
}
