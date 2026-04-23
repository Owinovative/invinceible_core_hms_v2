"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  type CreateAppointmentPayload,
} from "@/services/appointment-service";

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) =>
      createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["queue", "today"] });
      queryClient.invalidateQueries({ queryKey: ["queue", "waiting"] });
      queryClient.invalidateQueries({ queryKey: ["queue", "stats"] });
    },
  });
}
