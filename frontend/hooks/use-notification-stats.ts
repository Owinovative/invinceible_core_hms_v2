"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotificationStats } from "@/services/notification-service";

export function useNotificationStats() {
  return useQuery({
    queryKey: ["notification-stats"],
    queryFn: getNotificationStats,
  });
}
