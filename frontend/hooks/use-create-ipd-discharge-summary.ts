"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOrUpdateIpdDischargeSummary,
  type CreateIpdDischargeSummaryPayload,
} from "@/services/ipd-clinical-service";

export function useCreateIpdDischargeSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateIpdDischargeSummaryPayload) =>
      createOrUpdateIpdDischargeSummary(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["ipd-clinical-dashboard", data.admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ipd-discharge-summary", data.admissionId],
      });
    },
  });
}
