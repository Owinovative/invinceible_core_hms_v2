"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  markNotificationsAsRead,
  type NotificationQueryParams,
} from "@/services/notification-service";

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params?: NotificationQueryParams) =>
      markNotificationsAsRead(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-stats"] });
      queryClient.invalidateQueries({ queryKey: ["unresolved-counts"] });
    },
  });
}
