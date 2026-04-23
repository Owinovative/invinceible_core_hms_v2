export interface NotificationItem {
  id: number;
  title?: string | null;
  message?: string | null;
  notificationType?: string | null;
  severity?: string | null;
  moduleName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  facilityId?: number | null;
  branchId?: number | null;
  isRead?: boolean;
  isResolved?: boolean;
  createdAt?: string;
  resolvedAt?: string | null;
}
