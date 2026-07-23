import { apiFetch } from "@/lib/api";

export interface DentalEncounter {
  id: number;
  encounterNumber: string;
  chiefComplaint?: string | null;
  treatmentPlan?: string | null;
  statusCode: string;
  patient: { id: number; patientNumber: string; firstName: string; lastName: string };
  chartEntries: Array<{ id: number; toothCode: string; conditionCode: string }>;
  procedures: Array<{ id: number; procedureName: string; toothCode?: string | null }>;
}

export function getDentalEncounters() {
  return apiFetch<DentalEncounter[]>("/clinical-specialties/dental/encounters");
}

export function createDentalEncounter(payload: {
  branchId?: number;
  patientId: number;
  chiefComplaint?: string;
  examinationNotes?: string;
  treatmentPlan?: string;
  nextReviewAt?: string;
}) {
  return apiFetch<DentalEncounter>("/clinical-specialties/dental/encounters", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addDentalChartEntry(input: {
  encounterId: number;
  toothCode: string;
  surfaceCode?: string;
  conditionCode: string;
  diagnosisCode?: string;
  notes?: string;
}) {
  const { encounterId, ...payload } = input;
  return apiFetch(`/clinical-specialties/dental/encounters/${encounterId}/chart`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addDentalProcedure(input: {
  encounterId: number;
  toothCode?: string;
  procedureCode: string;
  procedureName: string;
  procedureNotes?: string;
}) {
  const { encounterId, ...payload } = input;
  return apiFetch(
    `/clinical-specialties/dental/encounters/${encounterId}/procedures`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export interface OrthopedicCase {
  id: number;
  caseNumber: string;
  anatomicalSite: string;
  fractureClassification?: string | null;
  managementPlan?: string | null;
  statusCode: string;
  patient: { id: number; patientNumber: string; firstName: string; lastName: string };
  implants: Array<{ id: number; implantName: string; lotNumber?: string | null }>;
  physiotherapyReferrals: Array<{ id: number; referralReason: string; statusCode: string }>;
}

export function getOrthopedicCases() {
  return apiFetch<OrthopedicCase[]>("/clinical-specialties/orthopedic/cases");
}

export function createOrthopedicCase(payload: {
  branchId?: number;
  patientId: number;
  anatomicalSite: string;
  injuryMechanism?: string;
  laterality?: string;
  fractureClassification?: string;
  imagingSummary?: string;
  managementPlan?: string;
  procedureDocumentation?: string;
  followUpAt?: string;
}) {
  return apiFetch<OrthopedicCase>("/clinical-specialties/orthopedic/cases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addOrthopedicImplant(input: {
  caseId: number;
  implantName: string;
  manufacturer?: string;
  lotNumber?: string;
  serialNumber?: string;
  removalDueAt?: string;
  notes?: string;
}) {
  const { caseId, ...payload } = input;
  return apiFetch(`/clinical-specialties/orthopedic/cases/${caseId}/implants`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createPhysiotherapyReferral(input: {
  caseId: number;
  referralReason: string;
  goals?: string;
  precautions?: string;
}) {
  const { caseId, ...payload } = input;
  return apiFetch(
    `/clinical-specialties/orthopedic/cases/${caseId}/physiotherapy-referrals`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
