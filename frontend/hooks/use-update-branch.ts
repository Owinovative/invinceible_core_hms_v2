"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateBranch,
  type UpdateBranchPayload,
} from "@/services/branch-service";

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateBranchPayload;
    }) => updateBranch(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
