import { apiFetch } from "@/lib/api";

export interface OperationalModuleRecord {
  id: number;
  moduleSlug: string;
  moduleTitle: string;
  recordNumber: string;
  title: string;
  description?: string | null;
  workflowStage: string;
  statusCode: string;
  priorityCode: string;
  facilityId: number;
  branchId?: number | null;
  patientId?: number | null;
  assignedStaffId?: number | null;
  createdByUserId?: number | null;
  dueAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  closedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalModuleRecordsResponse {
  records: OperationalModuleRecord[];
  summary: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
  statusBreakdown: Array<{
    label: string;
    value: number;
  }>;
  priorityBreakdown: Array<{
    label: string;
    value: number;
  }>;
}

export interface CreateOperationalModuleRecordPayload {
  moduleTitle?: string;
  title: string;
  description?: string;
  workflowStage?: string;
  statusCode?: string;
  priorityCode?: string;
  facilityId?: number;
  branchId?: number;
  patientId?: number;
  assignedStaffId?: number;
  dueAt?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateOperationalModuleRecordPayload =
  Partial<CreateOperationalModuleRecordPayload>;

export async function getOperationalModuleRecords(moduleSlug: string) {
  return apiFetch<OperationalModuleRecordsResponse>(
    `/operational-modules/${moduleSlug}/records`,
    {
      method: "GET",
    },
  );
}

export async function createOperationalModuleRecord(
  moduleSlug: string,
  payload: CreateOperationalModuleRecordPayload,
) {
  return apiFetch<OperationalModuleRecord>(
    `/operational-modules/${moduleSlug}/records`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateOperationalModuleRecord(
  moduleSlug: string,
  recordId: number,
  payload: UpdateOperationalModuleRecordPayload,
) {
  return apiFetch<OperationalModuleRecord>(
    `/operational-modules/${moduleSlug}/records/${recordId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
