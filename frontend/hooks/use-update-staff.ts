"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStaff, type UpdateStaffPayload } from "@/services/staff-service";

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateStaffPayload;
    }) => updateStaff(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
