import { apiFetch } from "@/lib/api";

export interface ReportsDashboardRecord {
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
  };
  counts: {
    patients: number;
    appointments: number;
    admissions: number;
    activeAdmissions: number;
    labOrders: number;
    pendingLabOrders: number;
    prescriptions: number;
    dispensedPrescriptions: number;
    invoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    lowStockItems: number;
    outOfStockItems: number;
    moduleRecords: number;
    activeModuleRecords: number;
    completedModuleRecords: number;
  };
  money: {
    totalInvoiced: number;
    totalCollected: number;
    outstandingBalance: number;
  };
  beds: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
  };
  charts: {
    appointmentsByStatus: Array<{
      label: string;
      value: number;
    }>;
    invoicesByStatus: Array<{
      label: string;
      value: number;
    }>;
    paymentsByMethod: Array<{
      label: string;
      value: number;
    }>;
    moduleRecordsByStatus: Array<{
      label: string;
      value: number;
    }>;
    moduleRecordsByModule: Array<{
      label: string;
      moduleSlug: string;
      value: number;
    }>;
  };
  lowStockList: Array<{
    id: number;
    medicineName: string;
    branchName: string;
    stockQuantity: number;
    reorderLevel: number;
    isOutOfStock: boolean;
  }>;
  recentInvoices: Array<{
    id: number;
    invoiceNumber: string;
    statusCode: string;
    totalAmount: number;
    balanceAmount: number;
    issuedAt: string;
    patientName: string;
  }>;
  recentModuleRecords: Array<{
    id: number;
    moduleSlug: string;
    moduleTitle: string;
    recordNumber: string;
    title: string;
    workflowStage: string;
    statusCode: string;
    priorityCode: string;
    dueAt?: string | null;
    updatedAt: string;
  }>;
}

export interface CsvExportResponse {
  fileName: string;
  rowCount: number;
  csvText: string;
}

export interface ModuleOperationsReport {
  filters: {
    startDate?: string | null;
    endDate?: string | null;
    facilityId?: number | null;
    branchId?: number | null;
  };
  summary: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
  byModule: Array<{
    moduleSlug: string;
    moduleTitle: string;
    count: number;
  }>;
  byStatus: Array<{
    label: string;
    value: number;
  }>;
  recentRecords: Array<{
    id: number;
    moduleSlug: string;
    moduleTitle: string;
    recordNumber: string;
    title: string;
    workflowStage: string;
    statusCode: string;
    priorityCode: string;
    dueAt?: string | null;
    updatedAt: string;
  }>;
}

function reportParams(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();

  if (dateFrom) params.set("startDate", dateFrom);
  if (dateTo) params.set("endDate", dateTo);

  return params.toString();
}

export async function getReportsDashboard(dateFrom?: string, dateTo?: string) {
  const query = reportParams(dateFrom, dateTo);
  const path = query ? `/reports/dashboard?${query}` : "/reports/dashboard";

  return apiFetch<ReportsDashboardRecord>(path, {
    method: "GET",
  });
}

export async function getReportsDashboardExport(
  dateFrom?: string,
  dateTo?: string,
) {
  const query = reportParams(dateFrom, dateTo);
  const path = query
    ? `/reports/dashboard/export?${query}`
    : "/reports/dashboard/export";

  return apiFetch<CsvExportResponse>(path, {
    method: "GET",
  });
}

export async function getModuleOperationsReport(
  dateFrom?: string,
  dateTo?: string,
) {
  const query = reportParams(dateFrom, dateTo);
  const path = query ? `/reports/modules?${query}` : "/reports/modules";

  return apiFetch<ModuleOperationsReport>(path, {
    method: "GET",
  });
}

export async function getModuleOperationsExport(
  dateFrom?: string,
  dateTo?: string,
) {
  const query = reportParams(dateFrom, dateTo);
  const path = query
    ? `/reports/modules/export?${query}`
    : "/reports/modules/export";

  return apiFetch<CsvExportResponse>(path, {
    method: "GET",
  });
}
