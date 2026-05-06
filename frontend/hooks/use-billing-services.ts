"use client";

import { useQuery } from "@tanstack/react-query";
import { queryStaleTime } from "@/lib/query-stale-times";
import { getBillingServices } from "@/services/billing-service";

export function useBillingServices() {
  return useQuery({
    queryKey: ["billing-services"],
    queryFn: getBillingServices,
    staleTime: queryStaleTime.tariffs,
  });
}
