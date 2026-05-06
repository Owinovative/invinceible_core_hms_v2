export interface RequestUser {
  userId: number;
  username: string;
  roleId: number;
  roleCode?: string | null;
  sessionVersion?: number | null;
  sessionId?: string | null;

  homeFacilityId?: number | null;
  homeFacilityName?: string | null;
  facilityAccessStatus?: {
    complianceStatus?: string | null;
    complianceReason?: string | null;
    complianceGraceEndsAt?: Date | null;
    complianceWriteLocked?: boolean;
    complianceLoginBlocked?: boolean;
    subscriptionPaidThrough?: Date | null;
    subscriptionLoginBlockedAt?: Date | null;
    subscriptionWriteLocked?: boolean;
    subscriptionLoginBlocked?: boolean;
    writeLocked?: boolean;
    loginBlocked?: boolean;
    lockReason?: string | null;
  } | null;

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
  pendingDeactivationAt?: Date | null;
  pendingDeactivationReason?: string | null;
}
