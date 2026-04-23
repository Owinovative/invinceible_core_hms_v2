"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDepartment } from "@/services/department-service";

export function useUpdateDepartmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateDepartment(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
