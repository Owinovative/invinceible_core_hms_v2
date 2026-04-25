"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateOperationalModuleRecord,
  type UpdateOperationalModuleRecordPayload,
} from "@/services/operational-module-service";

export function useUpdateOperationalModuleRecord(moduleSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordId,
      payload,
    }: {
      recordId: number;
      payload: UpdateOperationalModuleRecordPayload;
    }) => updateOperationalModuleRecord(moduleSlug, recordId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["operational-module-records", moduleSlug],
      });
      queryClient.invalidateQueries({ queryKey: ["reports-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["module-operations-report"] });
    },
  });
}
