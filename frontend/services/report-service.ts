import { apiDownload, apiFetch } from "@/lib/api";

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

export interface ProfitAnalyticsReport {
  filters: {
    startDate?: string | null;
    endDate?: string | null;
    facilityId?: number | null;
    branchId?: number | null;
  };
  summary: {
    dispensedLines: number;
    quantityDispensed: number;
    revenue: number;
    cost: number;
    grossProfit: number;
    marginPercent: number;
  };
  byMedicine: Array<{
    medicineId: number;
    medicineCode?: string | null;
    medicineName: string;
    branchId?: number | null;
    branchName?: string | null;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  recentLines: Array<{
    id: number;
    dispensedAt?: string | null;
    dispenseNumber?: string | null;
    patientName?: string | null;
    medicineName?: string | null;
    branchName?: string | null;
    quantity: number;
    sellingPrice: number;
    buyingPrice: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

export interface OtcSalesReport {
  filters: {
    startDate?: string | null;
    endDate?: string | null;
    facilityId?: number | null;
    branchId?: number | null;
  };
  summary: {
    totalSales: number;
    paidSales: number;
    pendingInsuranceSales: number;
    cancelledSales: number;
    grossSales: number;
    discounts: number;
    taxes: number;
    netSales: number;
    paidAmount: number;
    outstandingBalance: number;
  };
  paymentsByMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  insuranceByStatus: Array<{
    status: string;
    count: number;
    coveredAmount: number;
    coPayAmount: number;
  }>;
  topMedicines: Array<{
    medicineId: number;
    medicineName: string;
    quantity: number;
    revenue: number;
  }>;
  recentSales: Array<{
    id: number;
    saleNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    soldAt?: string | null;
    createdAt: string;
    branchName?: string | null;
    customerName?: string | null;
    patientName?: string | null;
    createdBy?: string | null;
    itemCount: number;
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

export async function getProfitAnalytics(dateFrom?: string, dateTo?: string) {
  const query = reportParams(dateFrom, dateTo);
  const path = query ? `/reports/profit?${query}` : "/reports/profit";

  return apiFetch<ProfitAnalyticsReport>(path, {
    method: "GET",
  });
}

export async function getProfitAnalyticsExport(
  dateFrom?: string,
  dateTo?: string,
) {
  const query = reportParams(dateFrom, dateTo);
  const path = query
    ? `/reports/profit/export?${query}`
    : "/reports/profit/export";

  return apiFetch<CsvExportResponse>(path, {
    method: "GET",
  });
}

export async function getOtcSalesReport(dateFrom?: string, dateTo?: string) {
  const query = reportParams(dateFrom, dateTo);
  const path = query ? `/reports/otc-sales?${query}` : "/reports/otc-sales";

  return apiFetch<OtcSalesReport>(path, {
    method: "GET",
  });
}

export async function getOtcSalesReportExport(
  dateFrom?: string,
  dateTo?: string,
) {
  const query = reportParams(dateFrom, dateTo);
  const path = query
    ? `/reports/otc-sales/export?${query}`
    : "/reports/otc-sales/export";

  return apiFetch<CsvExportResponse>(path, {
    method: "GET",
  });
}

export function downloadConsultationMedicalReportPdf(
  consultationId: number,
  consultationNumber?: string,
) {
  return apiDownload(
    `/reports/medical/consultations/${consultationId}.pdf`,
    `${consultationNumber || `consultation-${consultationId}`}-medical-report.pdf`,
  );
}
