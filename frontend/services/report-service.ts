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
}

export async function getReportsDashboard(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();

  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const query = params.toString();
  const path = query ? `/reports/dashboard?${query}` : "/reports/dashboard";

  return apiFetch<ReportsDashboardRecord>(path, {
    method: "GET",
  });
}
