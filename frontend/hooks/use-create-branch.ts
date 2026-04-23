"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBranch,
  type CreateBranchPayload,
} from "@/services/branch-service";

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => createBranch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
