"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "@/services/user-service";

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
