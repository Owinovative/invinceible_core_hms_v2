"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
// Update the import name here to match the service export
import { dispensePharmacyPrescription } from "@/services/pharmacy-service";

export function useDispensePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    // Use the updated function name here
    mutationFn: (id: number) => dispensePharmacyPrescription(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-queue"] });
      queryClient.invalidateQueries({ queryKey: ["prescription-by-id", id] });
      queryClient.invalidateQueries({ queryKey: ["branch-medicine-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
    },
  });
}
