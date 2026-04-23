"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPatient,
  type CreatePatientPayload,
} from "@/services/patient-service";

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePatientPayload) => createPatient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
