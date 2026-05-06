"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPharmacyAlerts,
  getSystemHealth,
  getUnresolvedCount,
} from "@/services/dashboard-service";
import { queryStaleTime } from "@/lib/query-stale-times";

type DashboardScope = {
  facilityId?: number;
  branchId?: number;
};

export function useSystemHealth(scope?: DashboardScope) {
  return useQuery({
    queryKey: ["system-health", scope],
    queryFn: () => getSystemHealth(scope),
    staleTime: queryStaleTime.dashboard,
  });
}

export function useUnresolvedCounts(scope?: DashboardScope) {
  return useQuery({
    queryKey: ["unresolved-counts", scope],
    queryFn: () => getUnresolvedCount(scope),
    staleTime: queryStaleTime.dashboard,
  });
}

export function usePharmacyAlerts(scope?: DashboardScope) {
  return useQuery({
    queryKey: ["pharmacy-alerts", scope],
    queryFn: () => getPharmacyAlerts(scope),
    staleTime: queryStaleTime.dashboard,
  });
}
