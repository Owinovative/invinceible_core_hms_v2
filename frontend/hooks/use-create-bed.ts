"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBed, type CreateBedPayload } from "@/services/ipd-service";

export function useCreateBed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBedPayload) => createBed(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
  });
}
