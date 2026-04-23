"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWard, type CreateWardPayload } from "@/services/ipd-service";

export function useCreateWard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWardPayload) => createWard(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
  });
}
