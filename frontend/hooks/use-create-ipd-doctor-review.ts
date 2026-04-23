"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIpdDoctorReview } from "@/services/ipd-clinical-service";

export function useCreateIpdDoctorReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createIpdDoctorReview,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ipd-clinical-dashboard", variables.admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ipd-doctor-reviews", variables.admissionId],
      });
    },
  });
}
