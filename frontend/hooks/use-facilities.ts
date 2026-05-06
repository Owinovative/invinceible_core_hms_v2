"use client";

import { useQuery } from "@tanstack/react-query";
import { queryStaleTime } from "@/lib/query-stale-times";
import { getFacilities } from "@/services/facility-service";

export function useFacilities() {
  return useQuery({
    queryKey: ["facilities"],
    queryFn: getFacilities,
    staleTime: queryStaleTime.facilities,
  });
}
