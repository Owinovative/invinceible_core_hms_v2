"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPharmacyAlerts,
  getSystemHealth,
  getUnresolvedCount,
} from "@/services/dashboard-service";

type DashboardScope = {
  facilityId?: number;
  branchId?: number;
};

export function useSystemHealth(scope?: DashboardScope) {
  return useQuery({
    queryKey: ["system-health", scope],
    queryFn: () => getSystemHealth(scope),
  });
}

export function useUnresolvedCounts(scope?: DashboardScope) {
  return useQuery({
    queryKey: ["unresolved-counts", scope],
    queryFn: () => getUnresolvedCount(scope),
  });
}

export function usePharmacyAlerts(scope?: DashboardScope) {
  return useQuery({
    queryKey: ["pharmacy-alerts", scope],
    queryFn: () => getPharmacyAlerts(scope),
  });
}
