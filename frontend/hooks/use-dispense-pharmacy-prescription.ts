"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dispensePharmacyPrescription } from "@/services/pharmacy-service";

export function useDispensePharmacyPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => dispensePharmacyPrescription(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-queue"] });
      queryClient.invalidateQueries({
        queryKey: ["pharmacy-prescription", data.id],
      });
      queryClient.invalidateQueries({ queryKey: ["branch-pharmacy-stock"] });
    },
  });
}
