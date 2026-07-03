export interface TerminologyRecord {
  code: string;
  display: string;
  system: string; // e.g., 'http://hl7.org/fhir/sid/icd-11'
  version?: string;
  definition?: string;
}

export interface ITerminology {
  searchDiagnosis(query: string): Promise<TerminologyRecord[]>;
  getDiagnosisByCode(code: string): Promise<TerminologyRecord | null>;
  getFavorites(): Promise<TerminologyRecord[]>;
  addToFavorites(code: string): Promise<void>;
}
