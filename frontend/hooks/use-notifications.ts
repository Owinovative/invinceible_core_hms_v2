"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/services/notification-service";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });
}
