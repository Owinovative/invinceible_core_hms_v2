"use client";

import { useQuery } from "@tanstack/react-query";
import { getBillingDashboard } from "@/services/billing-service";

export function useBillingDashboard() {
  return useQuery({
    queryKey: ["billing-dashboard"],
    queryFn: getBillingDashboard,
  });
}
