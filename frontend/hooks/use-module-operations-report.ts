"use client";

import { useQuery } from "@tanstack/react-query";
import { getModuleOperationsReport } from "@/services/report-service";

export function useModuleOperationsReport(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["module-operations-report", dateFrom, dateTo],
    queryFn: () => getModuleOperationsReport(dateFrom, dateTo),
  });
}
