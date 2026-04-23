"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createIpdVitalRecord,
  type CreateIpdVitalRecordPayload,
} from "@/services/ipd-clinical-service";

export function useCreateIpdVitalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateIpdVitalRecordPayload) =>
      createIpdVitalRecord(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["ipd-clinical-dashboard", data.admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ipd-vital-records", data.admissionId],
      });
    },
  });
}
