"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPharmacyMedicine,
  type CreatePharmacyMedicinePayload,
} from "@/services/pharmacy-service";

export function useCreatePharmacyMedicine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePharmacyMedicinePayload) =>
      createPharmacyMedicine(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-medicines"] });
    },
  });
}
