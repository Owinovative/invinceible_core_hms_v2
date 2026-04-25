"use client";

import { useQuery } from "@tanstack/react-query";
import { getBillingServices } from "@/services/billing-service";

export function useBillingServices() {
  return useQuery({
    queryKey: ["billing-services"],
    queryFn: getBillingServices,
  });
}
