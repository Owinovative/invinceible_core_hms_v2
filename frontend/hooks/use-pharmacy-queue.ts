"use client";

import { useQuery } from "@tanstack/react-query";
import { getPharmacyQueue } from "@/services/pharmacy-service";

export function usePharmacyQueue() {
  return useQuery({
    queryKey: ["pharmacy-queue"],
    queryFn: getPharmacyQueue,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}
