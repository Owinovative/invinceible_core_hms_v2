"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { seedDefaultSettings } from "@/services/settings-service";

export function useSeedSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seedDefaultSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
