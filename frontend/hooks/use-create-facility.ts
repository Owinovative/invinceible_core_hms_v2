"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFacility,
  type CreateFacilityPayload,
} from "@/services/facility-service";

export function useCreateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFacilityPayload) => createFacility(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
    },
  });
}
