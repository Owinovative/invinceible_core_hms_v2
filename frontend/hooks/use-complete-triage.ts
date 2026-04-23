"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeTriage, type UpdateTriagePayload } from "@/services/triage-service";

export function useCompleteTriage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTriagePayload }) =>
      completeTriage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
