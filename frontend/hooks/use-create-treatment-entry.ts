"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTreatmentEntry } from "@/services/ipd-clinical-service";

export function useCreateTreatmentEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTreatmentEntry,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ipd-clinical-dashboard", variables.admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["treatment-chart", variables.admissionId],
      });
    },
  });
}
