"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createServiceTariff,
  type CreateServiceTariffPayload,
} from "@/services/billing-service";

export function useCreateServiceTariff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateServiceTariffPayload) =>
      createServiceTariff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-tariffs"] });
    },
  });
}
