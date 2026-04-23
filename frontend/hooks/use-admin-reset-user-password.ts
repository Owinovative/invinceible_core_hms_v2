"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminResetUserPassword } from "@/services/user-service";

export function useAdminResetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      newPassword,
    }: {
      id: number;
      newPassword: string;
    }) => adminResetUserPassword(id, { newPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
