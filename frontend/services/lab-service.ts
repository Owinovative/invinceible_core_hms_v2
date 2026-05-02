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
