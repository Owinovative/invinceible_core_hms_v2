"use client";

import { useQuery } from "@tanstack/react-query";
import { getRevenueIntegrity } from "@/services/billing-service";

export function useRevenueIntegrity() {
  return useQuery({
    queryKey: ["billing-revenue-integrity"],
    queryFn: getRevenueIntegrity,
  });
}
