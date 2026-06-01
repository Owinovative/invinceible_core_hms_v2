"use client";

import { useQuery } from "@tanstack/react-query";

import { queryStaleTime } from "@/lib/query-stale-times";
import { getOtcSalesReport } from "@/services/report-service";

export function useOtcSalesReport(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["otc-sales-report", dateFrom, dateTo],
    queryFn: () => getOtcSalesReport(dateFrom, dateTo),
    staleTime: queryStaleTime.reports,
  });
}
