"use client";

import { useQuery } from "@tanstack/react-query";
import { getProfitAnalytics } from "@/services/report-service";

export function useProfitAnalytics(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["profit-analytics", dateFrom, dateTo],
    queryFn: () => getProfitAnalytics(dateFrom, dateTo),
  });
}
