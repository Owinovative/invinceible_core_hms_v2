"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAdmissionLabOrder } from "@/services/lab-service";

export function useCreateAdmissionLabOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdmissionLabOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["ipd-clinical-dashboard"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["lab-orders"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["lab-queue"],
      });
    },
  });
}
