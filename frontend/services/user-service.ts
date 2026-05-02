import { apiFetch } from "@/lib/api";

export interface UserRole {
  id: number;
  code?: string;
  name?: string;
}

export interface UserFacility {
  id: number;
  code?: string;
  name?: string;
}

export interface UserBranch {
  id: number;
  code?: string;
  name?: string;
}

export interface UserItem {
  id: number;
  username: string;
  email?: string | null;
  fullName?: string | null;
  isActive?: boolean;
  failedLoginAttempts?: number;
  lockedAt?: string | null;
  lockReason?: string | null;
  pendingDeactivationAt?: string | null;
  pendingDeactivationReason?: string | null;
  canAccessAllBranchesInFacility?: boolean;
  roleId: number;
  homeFacilityId?: number | null;
  homeBranchId?: number | null;
  role?: UserRole | null;
  homeFacility?: UserFacility | null;
  homeBranch?: UserBranch | null;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  email?: string;
  fullName?: string;
  roleId: number;
  homeFacilityId?: number;
  homeBranchId?: number;
  canAccessAllBranchesInFacility?: boolean;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  roleId?: number;
  homeFacilityId?: number;
  homeBranchId?: number;
  canAccessAllBranchesInFacility?: boolean;
  isActive?: boolean;
}

export interface AdminResetPasswordPayload {
  newPassword: string;
}

export async function getUsers() {
  return apiFetch<UserItem[]>("/users", {
    method: "GET",
  });
}

export async function createUser(payload: CreateUserPayload) {
  return apiFetch<UserItem>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: number, payload: UpdateUserPayload) {
  return apiFetch<UserItem>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminResetUserPassword(
  id: number,
  payload: AdminResetPasswordPayload,
) {
  return apiFetch<UserItem>(`/users/${id}/reset-password`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: number) {
  return apiFetch<UserItem>(`/users/${id}`, {
    method: "DELETE",
  });
}
