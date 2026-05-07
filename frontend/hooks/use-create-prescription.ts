"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPrescription } from "@/services/prescription-service";

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["consultation-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-queue"] });
    },
  });
}
