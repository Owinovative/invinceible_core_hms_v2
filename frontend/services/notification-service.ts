import { apiFetch } from "@/lib/api";

export interface NotificationFacility {
  id: number;
  code?: string;
  name?: string;
}

export interface NotificationBranch {
  id: number;
  code?: string;
  name?: string;
}

export interface NotificationTargetUser {
  id: number;
  username?: string;
  fullName?: string | null;
  email?: string | null;
}

export interface NotificationTargetStaff {
  id: number;
  staffCode?: string;
  firstName?: string;
  lastName?: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notificationType?: string | null;
  severity?: string | null;
  moduleName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  facilityId?: number | null;
  branchId?: number | null;
  targetUserId?: number | null;
  targetStaffId?: number | null;
  isRead: boolean;
  readAt?: string | null;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt?: string;
  facility?: NotificationFacility | null;
  branch?: NotificationBranch | null;
  targetUser?: NotificationTargetUser | null;
  targetStaff?: NotificationTargetStaff | null;
  resolvedByUser?: NotificationTargetUser | null;
  resolvedByStaff?: NotificationTargetStaff | null;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  resolved: number;
  unresolved: number;
  severity: {
    info: number;
    warning: number;
    critical: number;
  };
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
  notificationType?: string;
  severity?: string;
  moduleName?: string;
  entityType?: string;
  entityId?: string;
  facilityId?: number;
  branchId?: number;
  targetUserId?: number;
  targetStaffId?: number;
}

export interface ResolveNotificationPayload {
  resolvedByUserId?: number;
  resolvedByStaffId?: number;
  resolutionNote?: string;
}

export interface NotificationRecipients {
  canNotifySystem: boolean;
  canNotifyFacility: boolean;
  users: Array<{
    id: number;
    username: string;
    fullName?: string | null;
    roleCode?: string | null;
    facilityId?: number | null;
    branchId?: number | null;
    photoUrl?: string | null;
  }>;
  staff: Array<{
    id: number;
    staffCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    designation?: string | null;
    facilityId?: number | null;
    branchId?: number | null;
    photoUrl?: string | null;
  }>;
}

export type NotificationQueryParams = {
  facilityId?: number;
  branchId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  moduleName?: string;
  notificationType?: string;
  isRead?: boolean;
  isResolved?: boolean;
};

export interface PaginatedNotifications {
  data: NotificationItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

function buildNotificationQuery(params?: NotificationQueryParams) {
  const search = new URLSearchParams();

  if (params?.facilityId) search.set("facilityId", String(params.facilityId));
  if (params?.branchId) search.set("branchId", String(params.branchId));
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.search?.trim()) search.set("search", params.search.trim());
  if (params?.moduleName) search.set("moduleName", params.moduleName);
  if (params?.notificationType) {
    search.set("notificationType", params.notificationType);
  }
  if (typeof params?.isRead === "boolean") {
    search.set("isRead", String(params.isRead));
  }
  if (typeof params?.isResolved === "boolean") {
    search.set("isResolved", String(params.isResolved));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function getNotifications(params?: NotificationQueryParams) {
  return apiFetch<PaginatedNotifications>(
    `/notifications${buildNotificationQuery(params)}`,
    {
      method: "GET",
    },
  );
}

export async function getNotificationStats(params?: NotificationQueryParams) {
  return apiFetch<NotificationStats>(
    `/notifications/stats${buildNotificationQuery(params)}`,
    {
      method: "GET",
    },
  );
}

export async function getNotificationRecipients() {
  return apiFetch<NotificationRecipients>("/notifications/recipients", {
    method: "GET",
  });
}

export async function markNotificationsAsRead(
  params?: NotificationQueryParams,
) {
  return apiFetch<{ message: string; count: number }>(
    `/notifications/read-all${buildNotificationQuery(params)}`,
    {
      method: "PATCH",
    },
  );
}

export async function createNotification(payload: CreateNotificationPayload) {
  return apiFetch<NotificationItem>("/notifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function markNotificationAsRead(id: number) {
  return apiFetch<NotificationItem>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function resolveNotification(
  id: number,
  payload: ResolveNotificationPayload,
) {
  return apiFetch<NotificationItem>(`/notifications/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
