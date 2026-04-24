"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser, type UpdateUserPayload } from "@/services/user-service";

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
