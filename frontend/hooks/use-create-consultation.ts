"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createConsultation,
  type CreateConsultationPayload,
} from "@/services/consultation-service";

export function useCreateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConsultationPayload) =>
      createConsultation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["triage"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
