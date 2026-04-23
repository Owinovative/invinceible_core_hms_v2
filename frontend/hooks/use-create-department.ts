"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDepartment,
  type CreateDepartmentPayload,
} from "@/services/department-service";

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) =>
      createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
