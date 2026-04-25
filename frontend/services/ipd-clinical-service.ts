import { apiDownload, apiFetch } from "@/lib/api";

export interface IpdStaffMini {
  id: number;
  firstName?: string;
  lastName?: string;
  staffCode?: string;
}

export interface IpdProgressNoteItem {
  id: number;
  admissionId: number;
  recordedByStaffId?: number | null;
  noteType?: string | null;
  noteText: string;
  createdAt?: string;
  updatedAt?: string;
  recordedBy?: IpdStaffMini | null;
}

export interface CreateIpdProgressNotePayload {
  admissionId: number;
  recordedByStaffId?: number;
  noteType?: string;
  noteText: string;
}

export interface IpdVitalRecordItem {
  id: number;
  admissionId: number;
  recordedByStaffId?: number | null;
  recordedAt?: string;
  temperatureC?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  painScore?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  recordedBy?: IpdStaffMini | null;
}

export interface CreateIpdVitalRecordPayload {
  admissionId: number;
  recordedByStaffId?: number;
  recordedAt?: string;
  temperatureC?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  painScore?: number;
  notes?: string;
}

export interface IpdDoctorReviewItem {
  id: number;
  admissionId: number;
  reviewedByStaffId?: number | null;
  reviewDate?: string;
  chiefComplaint?: string | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  reviewNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  reviewedBy?: IpdStaffMini | null;
}

export interface CreateIpdDoctorReviewPayload {
  admissionId: number;
  reviewedByStaffId?: number;
  reviewDate?: string;
  chiefComplaint?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  reviewNotes?: string;
}

export interface TreatmentChartEntryItem {
  id: number;
  admissionId: number;
  orderedByStaffId?: number | null;
  administeredByStaffId?: number | null;
  treatmentType?: string | null;
  treatmentName: string;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  statusCode?: string | null;
  scheduledAt?: string | null;
  administeredAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  orderedBy?: IpdStaffMini | null;
  administeredBy?: IpdStaffMini | null;
}

export interface CreateTreatmentChartEntryPayload {
  admissionId: number;
  orderedByStaffId?: number;
  administeredByStaffId?: number;
  treatmentType?: string;
  treatmentName: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  statusCode?: string;
  scheduledAt?: string;
  administeredAt?: string;
  notes?: string;
}

export interface AdministerTreatmentPayload {
  administeredByStaffId?: number;
}

export interface IpdDischargeSummaryItem {
  id: number;
  admissionId: number;
  dischargeDiagnosis: string;
  hospitalCourse: string;
  conditionOnDischarge: string;
  dischargeMedications?: string | null;
  followUpInstructions?: string | null;
  dischargedByStaffId?: number | null;
  dischargeDate?: string;
  createdAt?: string;
  updatedAt?: string;
  dischargedBy?: IpdStaffMini | null;
}

export interface CreateIpdDischargeSummaryPayload {
  admissionId: number;
  dischargeDiagnosis: string;
  hospitalCourse: string;
  conditionOnDischarge: string;
  dischargeMedications?: string;
  followUpInstructions?: string;
  dischargedByStaffId?: number;
  dischargeDate?: string;
}

export interface AdmissionLabOrderItemResult {
  id: number;
  resultValue: string;
  remarks?: string | null;
  recordedAt?: string;
}

export interface AdmissionLabOrderItem {
  id: number;
  testId: number;
  instructions?: string | null;
  status?: string | null;
  test?: {
    id: number;
    testName?: string;
    category?: string | null;
    specimenType?: string | null;
  } | null;
  results?: AdmissionLabOrderItemResult[];
}

export interface AdmissionLabOrder {
  id: number;
  orderNumber: string;
  clinicalNotes?: string | null;
  urgency?: string | null;
  status?: string | null;
  createdAt?: string;
  requestedBy?: IpdStaffMini | null;
  items?: AdmissionLabOrderItem[];
}

export interface IpdClinicalDashboard {
  admission: unknown;
  doctorReviews: IpdDoctorReviewItem[];
  vitalRecords: IpdVitalRecordItem[];
  progressNotes: IpdProgressNoteItem[];
  treatmentChart: TreatmentChartEntryItem[];
  dischargeSummary?: IpdDischargeSummaryItem | null;
  labOrders: AdmissionLabOrder[];
}

export async function createIpdProgressNote(
  payload: CreateIpdProgressNotePayload,
) {
  return apiFetch<IpdProgressNoteItem>("/ipd-clinical/progress-notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getIpdProgressNotesByAdmission(admissionId: number) {
  return apiFetch<IpdProgressNoteItem[]>(
    `/ipd-clinical/progress-notes/admission/${admissionId}`,
    {
      method: "GET",
    },
  );
}

export async function createIpdVitalRecord(
  payload: CreateIpdVitalRecordPayload,
) {
  return apiFetch<IpdVitalRecordItem>("/ipd-clinical/vitals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getIpdVitalRecordsByAdmission(admissionId: number) {
  return apiFetch<IpdVitalRecordItem[]>(
    `/ipd-clinical/vitals/admission/${admissionId}`,
    {
      method: "GET",
    },
  );
}

export async function createIpdDoctorReview(
  payload: CreateIpdDoctorReviewPayload,
) {
  return apiFetch<IpdDoctorReviewItem>("/ipd-clinical/doctor-reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getIpdDoctorReviewsByAdmission(admissionId: number) {
  return apiFetch<IpdDoctorReviewItem[]>(
    `/ipd-clinical/doctor-reviews/admission/${admissionId}`,
    {
      method: "GET",
    },
  );
}

export async function createTreatmentEntry(
  payload: CreateTreatmentChartEntryPayload,
) {
  return apiFetch<TreatmentChartEntryItem>("/ipd-clinical/treatment-chart", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTreatmentChartByAdmission(admissionId: number) {
  return apiFetch<TreatmentChartEntryItem[]>(
    `/ipd-clinical/treatment-chart/admission/${admissionId}`,
    {
      method: "GET",
    },
  );
}

export async function administerTreatment(
  entryId: number,
  payload: AdministerTreatmentPayload,
) {
  return apiFetch<TreatmentChartEntryItem>(
    `/ipd-clinical/treatment-chart/${entryId}/administer`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function createOrUpdateIpdDischargeSummary(
  payload: CreateIpdDischargeSummaryPayload,
) {
  return apiFetch<IpdDischargeSummaryItem>("/ipd-clinical/discharge-summary", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getIpdDischargeSummaryByAdmission(admissionId: number) {
  return apiFetch<IpdDischargeSummaryItem | null>(
    `/ipd-clinical/discharge-summary/admission/${admissionId}`,
    {
      method: "GET",
    },
  );
}

export async function getAdmissionLabOrders(admissionId: number) {
  return apiFetch<AdmissionLabOrder[]>(
    `/ipd-clinical/lab-orders/admission/${admissionId}`,
    {
      method: "GET",
    },
  );
}

export async function getIpdClinicalDashboard(admissionId: number) {
  return apiFetch<IpdClinicalDashboard>(
    `/ipd-clinical/dashboard/admission/${admissionId}`,
    {
      method: "GET",
    },
  );
}

export function downloadAdmissionMedicalSummaryPdf(
  admissionId: number,
  admissionNumber?: string,
) {
  return apiDownload(
    `/ipd-clinical/documents/admissions/${admissionId}/medical-summary.pdf`,
    `${admissionNumber || `admission-${admissionId}`}-medical-summary.pdf`,
  );
}

export function downloadAdmissionDischargeSummaryPdf(
  admissionId: number,
  admissionNumber?: string,
) {
  return apiDownload(
    `/ipd-clinical/documents/admissions/${admissionId}/discharge-summary.pdf`,
    `${admissionNumber || `admission-${admissionId}`}-discharge-summary.pdf`,
  );
}

export function downloadAdmissionTreatmentChartPdf(
  admissionId: number,
  admissionNumber?: string,
) {
  return apiDownload(
    `/ipd-clinical/documents/admissions/${admissionId}/treatment-chart.pdf`,
    `${admissionNumber || `admission-${admissionId}`}-treatment-chart.pdf`,
  );
}
