"use client";

import { useQuery } from "@tanstack/react-query";
import { queryStaleTime } from "@/lib/query-stale-times";
import { getPatientTurnaroundReport } from "@/services/report-service";

export function usePatientTurnaroundReport(
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery({
    queryKey: ["reports", "patient-turnaround", dateFrom, dateTo],
    queryFn: () => getPatientTurnaroundReport(dateFrom, dateTo),
    staleTime: queryStaleTime.reports,
  });
}
