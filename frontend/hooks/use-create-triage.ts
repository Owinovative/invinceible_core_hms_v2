"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTriage, type CreateTriagePayload } from "@/services/triage-service";

export function useCreateTriage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTriagePayload) => createTriage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
