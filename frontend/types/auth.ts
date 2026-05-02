export interface AuthRole {
  id: number;
  name?: string | null;
  code?: string | null;
  description?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
}

export interface AuthAllowedBranch {
  id: number;
  name: string;
  code?: string | null;
  facilityId: number;
}

export interface AuthUser {
  id: number;
  userId?: number;
  username: string;
  email?: string | null;
  fullName?: string | null;
  isActive: boolean;

  role?: AuthRole | null;
  roleId?: number;
  roleCode?: string | null;

  homeFacilityId?: number | null;
  homeFacilityName?: string | null;

  homeBranchId?: number | null;
  homeBranchName?: string | null;

  canAccessAllBranchesInFacility?: boolean;

  allowedBranchIds?: number[];
  allowedBranches?: AuthAllowedBranch[];

  staffId?: number | null;
  staffPassportPhotoUrl?: string | null;
  pendingDeactivationAt?: string | null;
  pendingDeactivationReason?: string | null;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  user: AuthUser;
}
