export interface AuthRole {
  id: number;
  name?: string | null;
  code?: string | null;
}

export interface AuthAllowedBranch {
  id: number;
  name: string;
  code?: string | null;
  facilityId: number;
}
export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
export interface AuthUser {
  userId: number;
  username: string;
  roleId: number;
  roleCode?: string | null;

  homeFacilityId?: number | null;
  homeFacilityName?: string | null;

  homeBranchId?: number | null;
  homeBranchName?: string | null;

  canAccessAllBranchesInFacility?: boolean;

  allowedBranchIds?: number[];
  allowedBranches?: AuthAllowedBranch[];

  staffId?: number | null;
}
