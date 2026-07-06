export interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  email?: string | null;
  occupation?: string | null;
  facilityId?: number | null;
  branchId?: number | null;
  isDeceased?: boolean;
  isActive?: boolean;
  /** SHA member number stored after eligibility verification */
  shaMemberNumber?: string | null;
  /** SHA eligibility status: ACTIVE | INACTIVE | EXPIRED */
  shaStatus?: string | null;
  shaEligibilityUpdatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientsQueryParams {
  search?: string;
}
