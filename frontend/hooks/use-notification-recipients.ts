"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotificationRecipients } from "@/services/notification-service";

export function useNotificationRecipients() {
  return useQuery({
    queryKey: ["notification-recipients"],
    queryFn: getNotificationRecipients,
  });
}
