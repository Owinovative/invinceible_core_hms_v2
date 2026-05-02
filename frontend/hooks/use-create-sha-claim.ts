"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createShaClaim,
  type CreateShaClaimPayload,
} from "@/services/sha-claim-service";

export function useCreateShaClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateShaClaimPayload) => createShaClaim(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sha-claims"] });
      queryClient.invalidateQueries({ queryKey: ["sha-claim-summary"] });
    },
  });
}
