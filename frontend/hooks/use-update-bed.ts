"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBed, type UpdateBedPayload } from "@/services/ipd-service";

export function useUpdateBed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateBedPayload }) =>
      updateBed(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["active-admissions"] });
    },
  });
}
