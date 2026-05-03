"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateShaClaim,
  type UpdateShaClaimPayload,
} from "@/services/sha-claim-service";

export function useUpdateShaClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateShaClaimPayload;
    }) => updateShaClaim(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sha-claims"] });
      queryClient.invalidateQueries({ queryKey: ["sha-claim-summary"] });
      queryClient.invalidateQueries({ queryKey: ["billing-invoice"] });
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
    },
  });
}
