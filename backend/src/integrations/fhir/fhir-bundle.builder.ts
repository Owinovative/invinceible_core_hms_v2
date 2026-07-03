import { FHIR } from './fhir.types';
import { ClaimSubmissionRequest } from '../interfaces/claims.interface';

export class FhirBundleBuilder {
  private entries: FHIR.BundleEntry[] = [];

  addPatient(patientData: { id: string; name: string; memberNumber?: string; birthDate?: string }): this {
    const patient: FHIR.Patient = {
      resourceType: 'Patient',
      id: patientData.id,
      name: [{ text: patientData.name }],
      identifier: patientData.memberNumber
        ? [{ system: 'http://dha.go.ke/identifiers/sha-member', value: patientData.memberNumber }]
        : undefined,
      birthDate: patientData.birthDate,
    };

    this.entries.push({
      fullUrl: `urn:uuid:${patientData.id}`,
      resource: patient,
    });
    return this;
  }

  addFacility(facilityData: { code: string; name: string }): this {
    const org: FHIR.Organization = {
      resourceType: 'Organization',
      id: facilityData.code,
      identifier: [{ system: 'http://dha.go.ke/identifiers/facility-code', value: facilityData.code }],
      name: facilityData.name,
    };

    this.entries.push({
      fullUrl: `urn:uuid:${facilityData.code}`,
      resource: org,
    });
    return this;
  }

  addClaim(claimRequest: ClaimSubmissionRequest): this {
    const claim: FHIR.Claim = {
      resourceType: 'Claim',
      id: `claim-${claimRequest.claimId}`,
      identifier: [
        {
          system: 'http://dha.go.ke/identifiers/claim-number',
          value: claimRequest.localClaimNumber,
        },
      ],
      status: 'active',
      type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: 'institutional' }] },
      use: 'claim',
      patient: { reference: `urn:uuid:${claimRequest.patientId}` },
      created: new Date().toISOString(),
      provider: { reference: `urn:uuid:${claimRequest.facilityCode}` },
      priority: { coding: [{ code: 'normal' }] },
      insurance: [
        {
          sequence: 1,
          focal: true,
          coverage: { reference: `urn:uuid:coverage-${claimRequest.patientId}` },
        },
      ],
      item: claimRequest.items.map((item, index) => ({
        sequence: index + 1,
        productOrService: {
          coding: [{ code: item.serviceCode }],
          text: item.description,
        },
        quantity: { value: item.quantity },
        unitPrice: { value: item.unitPrice, currency: 'KES' },
        net: { value: item.netAmount, currency: 'KES' },
      })),
      total: { value: claimRequest.totalAmount, currency: 'KES' },
    };

    this.entries.push({
      fullUrl: `urn:uuid:claim-${claimRequest.claimId}`,
      resource: claim,
    });
    return this;
  }

  build(): FHIR.Bundle {
    return {
      resourceType: 'Bundle',
      type: 'transaction',
      timestamp: new Date().toISOString(),
      total: this.entries.length,
      entry: this.entries,
    };
  }
}
