export interface FacilityRegistryRecord {
  id: string; // FID
  code: string;
  name: string;
  type: string;
  level?: string;
  county?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface IFacilityRegistry {
  searchFacility(query: { name?: string; code?: string; county?: string }): Promise<FacilityRegistryRecord[]>;
  getFacilityByCode(code: string): Promise<FacilityRegistryRecord | null>;
  validateFacilityCode(code: string): Promise<boolean>;
}
