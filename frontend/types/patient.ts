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
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientsQueryParams {
  search?: string;
}
