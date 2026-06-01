import { apiDownload, apiFetch } from "@/lib/api";

export type OtcStockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type OtcSaleStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELLED"
  | "REFUNDED";
export type OtcPaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "PENDING_INSURANCE";
export type OtcPaymentMethod =
  | "CASH"
  | "MPESA_MANUAL"
  | "MPESA_STK"
  | "CARD"
  | "BANK"
  | "INSURANCE";
export type InsuranceClaimStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "PAID"
  | "CANCELLED";

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface OtcMedicineSearchItem {
  branchStockId: number;
  medicineId: number;
  code?: string | null;
  name: string;
  dosageForm?: string | null;
  strength?: string | null;
  manufacturer?: string | null;
  currentStock: number;
  reorderLevel: number;
  unitPrice: number;
  stockStatus: OtcStockStatus;
}

export interface OtcSaleItem {
  id: number;
  saleId: number;
  medicineId: number;
  medicineNameSnapshot: string;
  dosageFormSnapshot?: string | null;
  strengthSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  stockBefore?: number | null;
  stockAfter?: number | null;
  notes?: string | null;
}

export interface OtcSalePayment {
  id: number;
  paymentMethod: OtcPaymentMethod;
  statusCode: string;
  amount: number;
  transactionRef?: string | null;
  phoneNumber?: string | null;
  mpesaReceiptNumber?: string | null;
  merchantRequestId?: string | null;
  checkoutRequestId?: string | null;
  insuranceProviderName?: string | null;
  insuranceSchemeName?: string | null;
  insuranceMemberNumber?: string | null;
  principalMemberName?: string | null;
  relationshipToPrincipal?: string | null;
  authorizationNumber?: string | null;
  policyNumber?: string | null;
  insuranceCoveredAmount?: number | null;
  patientCoPayAmount?: number | null;
  insuranceClaimReference?: string | null;
  insuranceClaimStatus?: InsuranceClaimStatus | null;
  paidAt?: string | null;
  requestedAt?: string | null;
  confirmedAt?: string | null;
  notes?: string | null;
}

export interface OtcSale {
  id: number;
  saleNumber: string;
  saleType: "OTC";
  customerName?: string | null;
  customerPhone?: string | null;
  status: OtcSaleStatus;
  paymentStatus: OtcPaymentStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  soldAt?: string | null;
  notes?: string | null;
  facilityId: number;
  branchId: number;
  patientId?: number | null;
  createdByStaffId: number;
  items: OtcSaleItem[];
  payments: OtcSalePayment[];
  branch?: { id: number; code?: string | null; name: string } | null;
  facility?: { id: number; code?: string | null; name: string } | null;
  patient?: {
    id: number;
    patientNumber?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    phonePrimary?: string | null;
  } | null;
}

export interface OtcSalePaymentInput {
  paymentMethod: OtcPaymentMethod;
  amount?: number;
  transactionRef?: string;
  phoneNumber?: string;
  mpesaReceiptNumber?: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  insuranceProviderName?: string;
  insuranceSchemeName?: string;
  insuranceMemberNumber?: string;
  principalMemberName?: string;
  relationshipToPrincipal?: string;
  authorizationNumber?: string;
  policyNumber?: string;
  insuranceCoveredAmount?: number;
  patientCoPayAmount?: number;
  insuranceClaimReference?: string;
  insuranceClaimStatus?: InsuranceClaimStatus;
  notes?: string;
}

export function searchOtcMedicines(params: {
  query: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.branchId) search.set("branchId", String(params.branchId));
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 10));

  return apiFetch<PaginatedResponse<OtcMedicineSearchItem>>(
    `/pharmacy/otc/medicines/search?${search.toString()}`,
  );
}

export function createOtcSale(payload: {
  branchId?: number;
  customerName?: string;
  customerPhone?: string;
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
}) {
  return apiFetch<OtcSale>("/pharmacy/otc/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOtcSale(id: number) {
  return apiFetch<OtcSale>(`/pharmacy/otc/sales/${id}`);
}

export function addOtcSaleItem(
  saleId: number,
  payload: {
    medicineId: number;
    quantity: number;
    unitPrice?: number;
    notes?: string;
  },
) {
  return apiFetch<OtcSale>(`/pharmacy/otc/sales/${saleId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOtcSaleItem(
  saleId: number,
  itemId: number,
  payload: {
    quantity?: number;
    unitPrice?: number;
    notes?: string;
  },
) {
  return apiFetch<OtcSale>(`/pharmacy/otc/sales/${saleId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function removeOtcSaleItem(saleId: number, itemId: number) {
  return apiFetch<OtcSale>(`/pharmacy/otc/sales/${saleId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export function recordOtcSalePayment(
  saleId: number,
  payments: OtcSalePaymentInput[],
) {
  return apiFetch<OtcSale>(`/pharmacy/otc/sales/${saleId}/pay`, {
    method: "POST",
    body: JSON.stringify({ payments }),
  });
}

export function completeOtcSale(saleId: number) {
  return apiFetch<OtcSale>(`/pharmacy/otc/sales/${saleId}/complete`, {
    method: "POST",
  });
}

export function cancelOtcSale(saleId: number) {
  return apiFetch<OtcSale>(`/pharmacy/otc/sales/${saleId}/cancel`, {
    method: "POST",
  });
}

export function downloadOtcReceiptPdf(saleId: number, saleNumber?: string) {
  return apiDownload(
    `/pharmacy/otc/sales/${saleId}/receipt.pdf`,
    `${saleNumber || `otc-sale-${saleId}`}-receipt.pdf`,
  );
}
