import { apiFetch } from "@/lib/api";

export interface StaffRole {
  id: number;
  code?: string;
  name?: string;
}

export interface StaffFacility {
  id: number;
  code?: string;
  name?: string;
}

export interface StaffBranch {
  id: number;
  code?: string;
  name?: string;
}

export interface StaffDepartment {
  id: number;
  code?: string;
  name?: string;
}

export interface StaffLinkedUser {
  id: number;
  username?: string;
  fullName?: string | null;
  email?: string | null;
}

export interface StaffItem {
  id: number;
  staffCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  designation?: string | null;
  nationalIdNumber?: string | null;
  nationalIdImageUrl?: string | null;
  passportPhotoUrl?: string | null;
  clinicianRegistrationNumber?: string | null;
  clinicianBoard?: string | null;
  isClinician?: boolean;
  isPrescriber?: boolean;
  canLogin?: boolean;
  isActive?: boolean;
  facilityId: number;
  branchId?: number | null;
  departmentId?: number | null;
  roleId: number;
  userId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  facility?: StaffFacility | null;
  branch?: StaffBranch | null;
  department?: StaffDepartment | null;
  role?: StaffRole | null;
  user?: StaffLinkedUser | null;
}

export interface CreateStaffPayload {
  staffCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: string;
  designation?: string;
  nationalIdNumber?: string;
  nationalIdImageUrl?: string;
  passportPhotoUrl?: string;
  clinicianRegistrationNumber?: string;
  clinicianBoard?: string;
  isClinician?: boolean;
  isPrescriber?: boolean;
  canLogin?: boolean;
  isActive?: boolean;
  facilityId: number;
  branchId?: number;
  departmentId?: number;
  roleId: number;
  userId?: number;
}

export interface UpdateStaffPayload {
  staffCode?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  designation?: string;
  nationalIdNumber?: string;
  nationalIdImageUrl?: string;
  passportPhotoUrl?: string;
  clinicianRegistrationNumber?: string;
  clinicianBoard?: string;
  isClinician?: boolean;
  isPrescriber?: boolean;
  canLogin?: boolean;
  isActive?: boolean;
  facilityId?: number;
  branchId?: number;
  departmentId?: number;
  roleId?: number;
  userId?: number;
}

export async function getStaff() {
  return apiFetch<StaffItem[]>("/staff", {
    method: "GET",
  });
}

export async function createStaff(payload: CreateStaffPayload) {
  return apiFetch<StaffItem>("/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaff(id: number, payload: UpdateStaffPayload) {
  return apiFetch<StaffItem>(`/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStaff(id: number) {
  return apiFetch<StaffItem>(`/staff/${id}`, {
    method: "DELETE",
  });
}
