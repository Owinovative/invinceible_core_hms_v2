import { apiFetch } from "@/lib/api";

export interface LabTestCatalogItem {
  id: number;
  testName: string;
  category?: string | null;
  specimenType?: string | null;
  isActive?: boolean;
}

export interface CreateAdmissionLabOrderItemPayload {
  testId: number;
  instructions?: string;
}

export interface CreateAdmissionLabOrderPayload {
  patientId: number;
  admissionId: number;
  requestedByStaffId?: number;
  urgency?: string;
  clinicalNotes?: string;
  items: CreateAdmissionLabOrderItemPayload[];
}

export async function getLabTests() {
  return apiFetch<LabTestCatalogItem[]>("/lab/tests", {
    method: "GET",
  });
}

export async function createAdmissionLabOrder(
  payload: CreateAdmissionLabOrderPayload,
) {
  return apiFetch("/lab/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export interface LabTestItem {
  id: number;
  testName: string;
  category?: string | null;
  specimenType?: string | null;
  isActive?: boolean;
}


export interface LabResultItem {
  id: number;
  orderItemId: number;
  resultValue: string;
  remarks?: string | null;
  attachmentFileName?: string | null;
  attachmentMimeType?: string | null;
  attachmentDataUrl?: string | null;
  recordedBy?: number | null;
  recordedAt?: string;
  statusCode?: string;
  validatedAt?: string | null;
  validationNotes?: string | null;
  releasedAt?: string | null;
  amendmentReason?: string | null;
}


export interface LabOrderItem {
  id: number;
  instructions?: string | null;
  status: string;
  testId: number;
  test?: LabTestItem | null;
  results?: LabResultItem[];
}


export interface LabOrderRecord {
  id: number;
  orderNumber: string;
  clinicalNotes?: string | null;
  urgency?: string | null;
  status: string;
  createdAt?: string;
  patientId: number;
  appointmentId?: number | null;
  requestedByStaffId?: number | null;
  patient?: {
    id: number;
    patientNumber?: string;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    gender?: string | null;
    phonePrimary?: string | null;
  } | null;
  facility?: {
    id: number;
    name?: string;
  } | null;
  branch?: {
    id: number;
    name?: string;
  } | null;
  requestedBy?: {
    id: number;
    firstName?: string;
    lastName?: string;
  } | null;
  items?: LabOrderItem[];
}

export interface ExternalLabReferral {
  id: number;
  referralNumber: string;
  referringFacilityName: string;
  externalPatientName: string;
  sampleReference: string;
  statusCode: string;
  billingStatus: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  receivedAt: string;
  items: Array<{
    id: number;
    statusCode: string;
    priceAmount: number;
    test: LabTestItem;
    result?: ExternalLabResult | null;
  }>;
  payments?: Array<{
    id: number;
    paymentNumber: string;
    amount: number;
    paymentMethod: string;
    paidAt: string;
  }>;
}

export function createExternalLabPayment(input: {
  referralId: number;
  amount: number;
  paymentMethod: "CASH" | "MPESA" | "CARD" | "BANK_TRANSFER" | "INSURANCE";
  transactionReference?: string;
}) {
  const { referralId, ...payload } = input;
  return apiFetch<ExternalLabReferral>(
    `/lab/external-referrals/${referralId}/payments`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function createExternalLabReportShare(input: {
  referralId: number;
  expiresInHours?: number;
}) {
  const { referralId, ...payload } = input;
  return apiFetch<{ id: number; expiresAt: string; accessPath: string }>(
    `/lab/external-referrals/${referralId}/report-shares`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export interface ExternalLabResult {
  id: number;
  externalLabOrderItemId: number;
  resultValue: string;
  remarks?: string | null;
  statusCode: string;
  recordedAt: string;
  validatedAt?: string | null;
  releasedAt?: string | null;
}

export function getExternalLabReferrals() {
  return apiFetch<ExternalLabReferral[]>("/lab/external-referrals");
}

export function createExternalLabReferral(payload: {
  facilityId: number;
  branchId?: number;
  referringFacilityName: string;
  referringFacilityContact?: string;
  referringClinicianName?: string;
  externalPatientName: string;
  externalPatientIdentifier?: string;
  patientPhone?: string;
  sampleReference: string;
  specimenType?: string;
  clinicalNotes?: string;
  urgency?: string;
  items: Array<{ testId: number; instructions?: string }>;
}) {
  return apiFetch<ExternalLabReferral>("/lab/external-referrals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createExternalLabResult(input: {
  itemId: number;
  resultValue: string;
  remarks?: string;
}) {
  const { itemId, ...payload } = input;
  return apiFetch<ExternalLabResult>(
    `/lab/external-referrals/items/${itemId}/result`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function validateExternalLabResult(input: {
  resultId: number;
  validationNotes?: string;
}) {
  const { resultId, ...payload } = input;
  return apiFetch<ExternalLabResult>(
    `/lab/external-results/${resultId}/validate`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function releaseExternalLabResult(resultId: number) {
  return apiFetch<ExternalLabResult>(
    `/lab/external-results/${resultId}/release`,
    { method: "POST" },
  );
}

export interface CreateLabOrderPayload {
  patientId: number;
  appointmentId?: number;
  admissionId?: number;
  encounterRef?: string;
  requestedByStaffId?: number;
  clinicalNotes?: string;
  urgency?: string;
  items: Array<{
    testId: number;
    instructions?: string;
  }>;
}



export interface CreateLabResultPayload {
  orderItemId: number;
  resultValue: string;
  remarks?: string;
  attachmentFileName?: string;
  attachmentMimeType?: string;
  attachmentDataUrl?: string;
  recordedBy?: number;
}


export async function createLabOrder(payload: CreateLabOrderPayload) {
  return apiFetch<LabOrderRecord>("/lab/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function getLabOrders() {
  return apiFetch<LabOrderRecord[]>("/lab/orders", {
    method: "GET",
  });
}


export async function getLabQueue() {
  return apiFetch<LabOrderRecord[]>("/lab/queue", {
    method: "GET",
  });
}


export async function getLabOrderById(id: number) {
  return apiFetch<LabOrderRecord>(`/lab/orders/${id}`, {
    method: "GET",
  });
}


export async function getLabResultsByOrder(orderId: number) {
  return apiFetch<LabResultItem[]>(`/lab/orders/${orderId}/results`, {
    method: "GET",
  });
}


export async function createLabResult(payload: CreateLabResultPayload) {
  return apiFetch<LabResultItem>("/lab/results", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function validateLabResult(input: {
  resultId: number;
  validationNotes?: string;
}) {
  const { resultId, ...payload } = input;
  return apiFetch<LabResultItem>(`/lab/results/${resultId}/validate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function releaseLabResult(resultId: number) {
  return apiFetch<LabResultItem>(`/lab/results/${resultId}/release`, {
    method: "POST",
  });
}

export function amendLabResult(input: {
  resultId: number;
  resultValue: string;
  remarks?: string;
  amendmentReason: string;
}) {
  const { resultId, ...payload } = input;
  return apiFetch<LabResultItem>(`/lab/results/${resultId}/amend`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
