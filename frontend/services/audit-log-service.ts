import { apiFetch } from "@/lib/api";

export interface AuditLogEntry {
  id: number;
  moduleName: string;
  actionName: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  facilityId?: number | null;
  branchId?: number | null;
  actorUserId?: number | null;
  actorStaffId?: number | null;
  beforeData?: string | null;
  afterData?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  facility?: { id: number; name: string } | null;
  branch?: { id: number; name: string } | null;
  actorUser?: { id: number; username: string; fullName?: string | null } | null;
  actorStaff?: {
    id: number;
    firstName: string;
    lastName: string;
    staffCode?: string | null;
  } | null;
}

export interface AuditLogFilters {
  moduleName?: string;
  actionName?: string;
  entityType?: string;
  entityId?: string;
}

export interface AuditLogExportResponse {
  fileName: string;
  rowCount: number;
  csvText: string;
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return apiFetch<AuditLogEntry[]>(
    query ? `/audit-logs?${query}` : "/audit-logs",
    {
      method: "GET",
    },
  );
}

export async function getAuditLogsExport(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return apiFetch<AuditLogExportResponse>(
    query ? `/audit-logs/export?${query}` : "/audit-logs/export",
    {
      method: "GET",
    },
  );
}
