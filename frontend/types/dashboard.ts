export type SystemHealthStatus = "healthy" | "warning" | "critical";

export interface SystemHealthAlertItem {
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
  createdAt?: string | null;
}

export interface SystemHealthSummaryResponse {
  filters: {
    facilityId: number | null;
    branchId: number | null;
    startDate: string | null;
    endDate: string | null;
  };
  status: SystemHealthStatus;
  healthScore: number;
  summary: {
    unresolvedCriticalAlerts: number;
    unresolvedWarnings: number;
    billingFailures: number;
    lowStock: number;
    activeAdmissions: number;
    pendingLabQueue: number;
  };
  panels: {
    recentCriticalAlerts: SystemHealthAlertItem[];
    recentWarnings: SystemHealthAlertItem[];
    lowStockItems: Array<{
      id: number;
      facilityId: number;
      facilityName: string | null;
      branchId: number | null;
      branchName: string | null;
      medicineId: number;
      medicineName: string | null;
      stockQuantity: number;
      reorderLevel: number;
    }>;
  };
}

export interface NotificationCountResponse {
  filters: {
    facilityId: number | null;
    branchId: number | null;
    moduleName: string | null;
  };
  counts: {
    total: number;
    unread: number;
    lowStock: number;
    outOfStock: number;
  };
}

export interface PharmacyAlertsResponseItem {
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
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
}
