"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getNotificationStats,
  type NotificationQueryParams,
} from "@/services/notification-service";

export function useNotificationStats(params?: NotificationQueryParams) {
  return useQuery({
    queryKey: ["notification-stats", params],
    queryFn: () => getNotificationStats(params),
  });
}
