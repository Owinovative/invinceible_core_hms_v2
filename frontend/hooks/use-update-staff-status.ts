"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStaff } from "@/services/staff-service";

export function useUpdateStaffStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateStaff(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
