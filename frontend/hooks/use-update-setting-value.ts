"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSettingValue } from "@/services/settings-service";

export function useUpdateSettingValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      settingKey,
      value,
    }: {
      settingKey: string;
      value: string;
    }) => updateSettingValue(settingKey, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
