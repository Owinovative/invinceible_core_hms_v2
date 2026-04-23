"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startTriage } from "@/services/triage-service";

export function useStartTriage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => startTriage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage"] });
    },
  });
}
