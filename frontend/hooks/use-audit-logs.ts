"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAuditLogs,
  type AuditLogFilters,
} from "@/services/audit-log-service";

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => getAuditLogs(filters),
  });
}
