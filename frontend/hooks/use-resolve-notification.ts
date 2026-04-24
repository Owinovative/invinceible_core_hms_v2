"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  resolveNotification,
  type ResolveNotificationPayload,
} from "@/services/notification-service";

export function useResolveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ResolveNotificationPayload }) =>
      resolveNotification(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-stats"] });
      queryClient.invalidateQueries({ queryKey: ["unresolved-counts"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["system-health"] });
    },
  });
}
