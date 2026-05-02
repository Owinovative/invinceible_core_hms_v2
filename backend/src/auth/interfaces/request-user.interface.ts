export interface RequestUser {
  userId: number;
  username: string;
  roleId: number;
  roleCode?: string | null;
  sessionVersion?: number | null;
  sessionId?: string | null;

  homeFacilityId?: number | null;
  homeFacilityName?: string | null;

  homeBranchId?: number | null;
  homeBranchName?: string | null;

  canAccessAllBranchesInFacility?: boolean;

  allowedBranchIds?: number[];
  allowedBranches?: Array<{
    id: number;
    name: string;
    code?: string | null;
    facilityId: number;
  }>;

  staffId?: number | null;
  staffPassportPhotoUrl?: string | null;
}
