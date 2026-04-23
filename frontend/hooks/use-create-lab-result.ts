"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLabResult } from "@/services/lab-service";

export function useCreateLabResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLabResult,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lab-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["lab-results"] });
      await queryClient.invalidateQueries({ queryKey: ["ipd-clinical-dashboard"] });
    },
  });
}
