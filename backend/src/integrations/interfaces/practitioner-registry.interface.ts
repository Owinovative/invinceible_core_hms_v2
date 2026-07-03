export interface PractitionerRegistryRecord {
  id: string;
  registrationNumber: string;
  board: string;
  firstName: string;
  lastName: string;
  cadre: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  licenseExpiryDate?: Date;
}

export interface IPractitionerRegistry {
  searchPractitioner(query: { registrationNumber?: string; board?: string; name?: string }): Promise<PractitionerRegistryRecord[]>;
  getPractitionerByRegNumber(registrationNumber: string, board?: string): Promise<PractitionerRegistryRecord | null>;
  validateLicense(registrationNumber: string): Promise<{ valid: boolean; status: string; expiry?: Date }>;
}
