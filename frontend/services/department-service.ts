import { apiFetch } from "@/lib/api";

export interface DepartmentFacility {
  id: number;
  code?: string;
  name?: string;
}

export interface DepartmentBranch {
  id: number;
  code?: string;
  name?: string;
  facilityId?: number;
}

export interface DepartmentItem {
  id: number;
  code: string;
  name: string;
  facilityId: number;
  branchId?: number | null;
  isActive?: boolean;
  facility?: DepartmentFacility | null;
  branch?: DepartmentBranch | null;
}

export interface CreateDepartmentPayload {
  name: string;
  facilityId: number;
  branchId?: number;
  isActive?: boolean;
}

export interface UpdateDepartmentPayload {
  code?: string;
  name?: string;
  facilityId?: number;
  branchId?: number;
  isActive?: boolean;
}

export async function getDepartments() {
  return apiFetch<DepartmentItem[]>("/departments", {
    method: "GET",
  });
}

export async function createDepartment(payload: CreateDepartmentPayload) {
  return apiFetch<DepartmentItem>("/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDepartment(
  id: number,
  payload: UpdateDepartmentPayload,
) {
  return apiFetch<DepartmentItem>(`/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
