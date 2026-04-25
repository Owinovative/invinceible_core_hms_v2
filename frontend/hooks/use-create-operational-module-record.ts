"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOperationalModuleRecord,
  type CreateOperationalModuleRecordPayload,
} from "@/services/operational-module-service";

export function useCreateOperationalModuleRecord(moduleSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOperationalModuleRecordPayload) =>
      createOperationalModuleRecord(moduleSlug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["operational-module-records", moduleSlug],
      });
      queryClient.invalidateQueries({ queryKey: ["reports-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["module-operations-report"] });
    },
  });
}
