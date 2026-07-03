export interface PatientEligibility {
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE' | 'PENDING';
  shaStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  eccifStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  pcifStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  pomfStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  ecdfStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  covers: CoverageDetails[];
  lastVerifiedAt: Date;
}

export interface CoverageDetails {
  coverageId: string;
  schemeName: string;
  memberNumber: string;
  status: string;
  expiryDate?: Date;
  dependents: DependentInfo[];
}

export interface DependentInfo {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth?: Date;
}

export interface PatientRegistryRecord {
  id: string; // The CR ID
  nationalId?: string;
  memberNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  dateOfBirth: Date;
  phone?: string;
  eligibility?: PatientEligibility;
}

export interface IClientRegistry {
  searchPatient(query: { nationalId?: string; memberNumber?: string; phone?: string; }): Promise<PatientRegistryRecord[]>;
  getPatientEligibility(patientId: string): Promise<PatientEligibility>;
  registerPatient(patientData: Partial<PatientRegistryRecord>): Promise<PatientRegistryRecord>;
  updatePatient(patientId: string, updates: Partial<PatientRegistryRecord>): Promise<PatientRegistryRecord>;
}
