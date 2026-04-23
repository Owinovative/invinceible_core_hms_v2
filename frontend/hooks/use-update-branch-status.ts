"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBranch } from "@/services/branch-service";

export function useUpdateBranchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateBranch(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
