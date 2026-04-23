"use client";

import { useQuery } from "@tanstack/react-query";
import { getFacilities } from "@/services/facility-service";

export function useFacilities() {
  return useQuery({
    queryKey: ["facilities"],
    queryFn: getFacilities,
  });
}
