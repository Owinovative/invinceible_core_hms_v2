"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getNotifications,
  type NotificationQueryParams,
} from "@/services/notification-service";

export function useNotifications(params?: NotificationQueryParams) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => getNotifications(params),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}
