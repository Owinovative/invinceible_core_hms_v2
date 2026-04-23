"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFacility } from "@/services/facility-service";

export function useUpdateFacilityStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateFacility(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
    },
  });
}
