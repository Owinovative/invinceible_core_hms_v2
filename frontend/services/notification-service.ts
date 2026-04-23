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

export async function getNotifications() {
  return apiFetch<NotificationItem[]>("/notifications", {
    method: "GET",
  });
}

export async function getNotificationStats() {
  return apiFetch<NotificationStats>("/notifications/stats", {
    method: "GET",
  });
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
