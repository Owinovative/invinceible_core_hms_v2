/**
 * Canonical SHA/AfyaLink FHIR system URIs, per the official DHA claim
 * integration guide (https://afyalink.dha.go.ke/claim-integration).
 *
 * The environment prefix differs between UAT and production:
 *   - Dev/UAT:     https://qa-mis.apeiro-digital.com
 *   - Production:  https://fhir.sha.go.ke
 *
 * The prefix is configurable via DHA_FHIR_BASE_URL so the same builder
 * emits certifiable bundles in every environment without code changes.
 */
export const DEFAULT_FHIR_BASE_URL = 'https://fhir.sha.go.ke';

export function buildFhirSystems(baseUrl: string = DEFAULT_FHIR_BASE_URL) {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    /** Patient SHA membership number. */
    shaNumber: `${base}/fhir/identifier/shanumber`,
    /** Patient national identification number. */
    nationalId: `${base}/fhir/identifier/nationalid`,
    /** SHA/PFMS intervention (service) codes on claim items. */
    interventionCodes: `${base}/fhir/CodeSystem/intervention-codes`,
    /** ICD-11 diagnosis codes (mandatory on every claim). */
    icd11: `${base}/fhir/terminology/CodeSystem/icd-11`,
    /** KMHFL facility identifier types. */
    facilityIdentifier: `${base}/fhir/terminology/CodeSystem/facility-identifier-types`,
    /** Practitioner registry identifier. */
    practitionerRegistry: `${base}/fhir/Practitioner/PractitionerRegistryID`,
  } as const;
}

export type FhirSystems = ReturnType<typeof buildFhirSystems>;
