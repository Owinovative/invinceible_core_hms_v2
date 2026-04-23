"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateBedStatus,
  type UpdateBedStatusPayload,
} from "@/services/ipd-service";

export function useUpdateBedStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateBedStatusPayload;
    }) => updateBedStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["active-admissions"] });
    },
  });
}
