import { Injectable } from '@nestjs/common';
import type {
  FhirBundle,
  FhirConsent,
  FhirCoverageEligibilityRequest,
  FhirEncounter,
  FhirOrganization,
  FhirPatient,
  FhirPractitioner,
  FhirResource,
  FhirServiceRequest,
} from './fhir.types';

import { FhirSystemsService } from './fhir-systems';

export interface HmsPatientLike {
  id: number;
  patientNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: Date | null;
  phonePrimary?: string | null;
  email?: string | null;
  isDeceased?: boolean;
}

export interface HmsFacilityLike {
  id: number;
  code: string;
  name: string;
  facilityType?: string | null;
  county?: string | null;
  town?: string | null;
  country?: string | null;
}

export interface HmsStaffLike {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  registrationNumber?: string | null;
  cadre?: string | null;
}

export interface HmsEncounterLike {
  id: number;
  patientId: number;
  startedAt?: Date | null;
  endedAt?: Date | null;
  encounterClass?: 'AMB' | 'IMP' | 'EMER';
  diagnosisText?: string | null;
  diagnosisCode?: string | null;
  practitionerRef?: string | null;
}

/**
 * Maps HMS domain entities to FHIR R4 resources for DHA exchange.
 * Pure transformations — no I/O.
 */
@Injectable()
export class FhirMapperService {
  constructor(private readonly systems: FhirSystemsService) {}

  toFhirPatient(patient: HmsPatientLike, nationalId?: string): FhirPatient {
    const gender = (patient.gender ?? '').toLowerCase();
    return {
      resourceType: 'Patient',
      identifier: [
        { system: 'urn:hms:patient-number', value: patient.patientNumber },
        ...(nationalId
          ? [{ system: this.systems.nationalId, value: nationalId }]
          : []),
      ],
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName, patient.middleName ?? ''].filter(Boolean),
          text: [patient.firstName, patient.middleName, patient.lastName]
            .filter(Boolean)
            .join(' '),
        },
      ],
      telecom: patient.phonePrimary
        ? [{ system: 'phone', value: patient.phonePrimary }]
        : undefined,
      gender: gender === 'male' || gender === 'female' ? gender : 'unknown',
      birthDate: patient.dateOfBirth
        ? patient.dateOfBirth.toISOString().slice(0, 10)
        : undefined,
      deceasedBoolean: patient.isDeceased === true ? true : undefined,
    };
  }

  toFhirOrganization(facility: HmsFacilityLike): FhirOrganization {
    return {
      resourceType: 'Organization',
      identifier: [
        { system: this.systems.facilityIdentifier, value: facility.code },
      ],
      name: facility.name,
      type: facility.facilityType
        ? [{ text: facility.facilityType }]
        : undefined,
      address: [
        {
          city: facility.town ?? undefined,
          district: facility.county ?? undefined,
          country: facility.country ?? 'KE',
        },
      ],
    };
  }

  toFhirPractitioner(staff: HmsStaffLike): FhirPractitioner {
    return {
      resourceType: 'Practitioner',
      identifier: staff.registrationNumber
        ? [
            {
              system: this.systems.practitionerRegistry,
              value: staff.registrationNumber,
            },
          ]
        : undefined,
      name: [
        {
          family: staff.lastName ?? undefined,
          given: staff.firstName ? [staff.firstName] : undefined,
          text: [staff.firstName, staff.lastName].filter(Boolean).join(' '),
        },
      ],
      qualification: staff.cadre
        ? [{ code: { text: staff.cadre } }]
        : undefined,
    };
  }

  toFhirEncounter(
    encounter: HmsEncounterLike,
    patientRef: string,
    facilityRef: string,
  ): FhirEncounter {
    return {
      resourceType: 'Encounter',
      status: encounter.endedAt ? 'finished' : 'in-progress',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: encounter.encounterClass ?? 'AMB',
      },
      subject: { reference: patientRef },
      participant: encounter.practitionerRef
        ? [{ individual: { reference: encounter.practitionerRef } }]
        : undefined,
      period: {
        start: encounter.startedAt?.toISOString(),
        end: encounter.endedAt?.toISOString(),
      },
      reasonCode: encounter.diagnosisText
        ? [
            {
              coding: encounter.diagnosisCode
                ? [
                    {
                      system: this.systems.icd11,
                      code: encounter.diagnosisCode,
                    },
                  ]
                : undefined,
              text: encounter.diagnosisText,
            },
          ]
        : undefined,
      serviceProvider: { reference: facilityRef },
    };
  }

  toFhirReferral(params: {
    patientRef: string;
    requesterRef: string;
    performerFacilityRef?: string;
    reason?: string;
    serviceText?: string;
  }): FhirServiceRequest {
    return {
      resourceType: 'ServiceRequest',
      status: 'active',
      intent: 'order',
      code: params.serviceText ? { text: params.serviceText } : undefined,
      subject: { reference: params.patientRef },
      requester: { reference: params.requesterRef },
      performer: params.performerFacilityRef
        ? [{ reference: params.performerFacilityRef }]
        : undefined,
      note: params.reason ? [{ text: params.reason }] : undefined,
    };
  }

  toFhirConsent(params: {
    patientRef: string;
    permit: boolean;
    purposeCode?: string;
  }): FhirConsent {
    return {
      resourceType: 'Consent',
      status: 'active',
      scope: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/consentscope',
            code: 'patient-privacy',
          },
        ],
      },
      patient: { reference: params.patientRef },
      dateTime: new Date().toISOString(),
      provision: {
        type: params.permit ? 'permit' : 'deny',
        purpose: params.purposeCode
          ? [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
                code: params.purposeCode,
              },
            ]
          : undefined,
      },
    };
  }

  toEligibilityRequest(params: {
    memberNumber: string;
    patientRef?: string;
    serviceDate?: string;
  }): FhirCoverageEligibilityRequest {
    return {
      resourceType: 'CoverageEligibilityRequest',
      status: 'active',
      purpose: ['validation', 'benefits'],
      patient: params.patientRef
        ? { reference: params.patientRef }
        : { display: params.memberNumber },
      created: params.serviceDate ?? new Date().toISOString(),
      insurer: { display: 'Social Health Authority' },
    };
  }

  toTransactionBundle(resources: Array<Record<string, unknown>>): FhirBundle {
    return {
      resourceType: 'Bundle',
      type: 'transaction',
      timestamp: new Date().toISOString(),
      entry: resources.map((resource) => ({
        resource: resource as unknown as FhirResource,
        request: {
          method: 'POST' as const,
          url:
            typeof resource.resourceType === 'string'
              ? resource.resourceType
              : 'Resource',
        },
      })),
    };
  }
}
