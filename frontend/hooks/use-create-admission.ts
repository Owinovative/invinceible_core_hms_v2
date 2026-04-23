"use client";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAdmission,
  type CreateAdmissionPayload,
} from "@/services/ipd-service";


export function useCreateAdmission() {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: (payload: CreateAdmissionPayload) => createAdmission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ipd-admissions"] });
      queryClient.invalidateQueries({ queryKey: ["ipd-active-admissions"] });
      queryClient.invalidateQueries({ queryKey: ["ipd-beds"] });
    },
  });
}
