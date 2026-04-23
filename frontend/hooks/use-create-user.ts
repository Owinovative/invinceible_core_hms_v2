"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser, type CreateUserPayload } from "@/services/user-service";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
