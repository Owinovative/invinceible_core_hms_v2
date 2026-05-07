"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  directMedicineAdministration,
  type DirectMedicineAdministrationPayload,
} from "@/services/pharmacy-service";

export function useDirectMedicineAdministration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DirectMedicineAdministrationPayload) =>
      directMedicineAdministration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultation-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["branch-medicine-search"] });
      queryClient.invalidateQueries({ queryKey: ["branch-pharmacy-stock"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-queue"] });
    },
  });
}
