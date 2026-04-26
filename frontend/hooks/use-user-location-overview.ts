"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserLocationOverview } from "@/services/user-location-service";

export function useUserLocationOverview() {
  return useQuery({
    queryKey: ["platform-user-location-overview"],
    queryFn: getUserLocationOverview,
    refetchInterval: 15000,
  });
}
