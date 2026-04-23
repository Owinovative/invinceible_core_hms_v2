"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIpdVitalRecord } from "@/services/ipd-clinical-service";

export function useCreateIpdVital() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createIpdVitalRecord,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ipd-clinical-dashboard", variables.admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ipd-vitals", variables.admissionId],
      });
    },
  });
}
