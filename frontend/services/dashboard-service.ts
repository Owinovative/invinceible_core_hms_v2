import { apiFetch } from "@/lib/api";
import type {
  NotificationCountResponse,
  PharmacyAlertsResponseItem,
  SystemHealthSummaryResponse,
} from "@/types/dashboard";

export async function getSystemHealth(params?: {
  facilityId?: number;
  branchId?: number;
}) {
  const search = new URLSearchParams();

  if (params?.facilityId) {
    search.set("facilityId", String(params.facilityId));
  }

  if (params?.branchId) {
    search.set("branchId", String(params.branchId));
  }

  const query = search.toString();
  return apiFetch<SystemHealthSummaryResponse>(
    `/reports/system-health${query ? `?${query}` : ""}`,
  );
}

export async function getUnresolvedCount(params?: {
  facilityId?: number;
  branchId?: number;
  moduleName?: string;
}) {
  const search = new URLSearchParams();

  if (params?.facilityId) {
    search.set("facilityId", String(params.facilityId));
  }

  if (params?.branchId) {
    search.set("branchId", String(params.branchId));
  }

  if (params?.moduleName) {
    search.set("moduleName", params.moduleName);
  }

  const query = search.toString();
  return apiFetch<NotificationCountResponse>(
    `/notifications/unresolved-count${query ? `?${query}` : ""}`,
  );
}

export async function getPharmacyAlerts(params?: {
  facilityId?: number;
  branchId?: number;
}) {
  const search = new URLSearchParams();

  if (params?.facilityId) {
    search.set("facilityId", String(params.facilityId));
  }

  if (params?.branchId) {
    search.set("branchId", String(params.branchId));
  }

  const query = search.toString();
  return apiFetch<PharmacyAlertsResponseItem[]>(
    `/notifications/pharmacy-alerts${query ? `?${query}` : ""}`,
  );
}
