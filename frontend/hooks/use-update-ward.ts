"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateWard, type UpdateWardPayload } from "@/services/ipd-service";

export function useUpdateWard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateWardPayload }) =>
      updateWard(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
    },
  });
}
