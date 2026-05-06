"use client";

import { useQuery } from "@tanstack/react-query";
import { queryStaleTime } from "@/lib/query-stale-times";
import { getReportsDashboard } from "@/services/report-service";

export function useReportsDashboard(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["reports-dashboard", dateFrom, dateTo],
    queryFn: () => getReportsDashboard(dateFrom, dateTo),
    staleTime: queryStaleTime.reports,
  });
}
