"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateFacility,
  type UpdateFacilityPayload,
} from "@/services/facility-service";

export function useUpdateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateFacilityPayload;
    }) => updateFacility(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
    },
  });
}
