"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
// Update the import name here to match the service export
import {
  dispensePharmacyPrescription,
  type DispensePrescriptionPayload,
} from "@/services/pharmacy-service";

export function useDispensePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    // Use the updated function name here
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload?: DispensePrescriptionPayload;
    }) => dispensePharmacyPrescription(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-queue"] });
      queryClient.invalidateQueries({
        queryKey: ["prescription-by-id", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["branch-medicine-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
    },
  });
}
