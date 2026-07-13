/**
 * Base interface for all SHR FHIR Builders.
 * Each builder is responsible for producing one FHIR Resource type
 * from the HMS clinical data.
 */
export interface FhirBuilder {
  /** The FHIR resource type this builder produces (e.g. 'Patient') */
  readonly resourceType: string;

  /**
   * Build one or more FHIR resources for a given clinical context.
   * @param context Contains patientId, encounterId, and a reference map.
   * @returns Array of FHIR resources (could be multiple, e.g. multiple Observations)
   */
  build(context: BuilderContext): Promise<any[]>;
}

export interface BuilderContext {
  patientId: number;
  encounterId?: number;
  facilityId: number;
  /** Map of "ResourceType/hmsId" -> "urn:uuid:xxx" for cross-referencing */
  resolvedReferences: Map<string, string>;
}
