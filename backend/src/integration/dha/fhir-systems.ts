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
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DEFAULT_FHIR_BASE_URL = 'https://fhir.sha.go.ke';

@Injectable()
export class FhirSystemsService {
  public readonly shaNumber: string;
  public readonly nationalId: string;
  public readonly interventionCodes: string;
  public readonly icd11: string;
  public readonly facilityIdentifier: string;
  public readonly practitionerRegistry: string;

  constructor(config: ConfigService) {
    const baseUrl = config.get<string>(
      'DHA_FHIR_BASE_URL',
      DEFAULT_FHIR_BASE_URL,
    );
    const base = baseUrl.replace(/\/+$/, '');

    this.shaNumber = `${base}/fhir/identifier/shanumber`;
    this.nationalId = `${base}/fhir/identifier/nationalid`;
    this.interventionCodes = `${base}/fhir/CodeSystem/intervention-codes`;
    this.icd11 = `${base}/fhir/terminology/CodeSystem/icd-11`;
    this.facilityIdentifier = `${base}/fhir/terminology/CodeSystem/facility-identifier-types`;
    this.practitionerRegistry = `${base}/fhir/Practitioner/PractitionerRegistryID`;
  }
}
