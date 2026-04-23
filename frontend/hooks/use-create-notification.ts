"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createNotification,
  type CreateNotificationPayload,
} from "@/services/notification-service";

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNotificationPayload) =>
      createNotification(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-stats"] });
    },
  });
}
