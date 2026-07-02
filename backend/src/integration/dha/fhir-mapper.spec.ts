import { FhirMapperService } from './fhir-mapper';

describe('FhirMapperService', () => {
  const mapper = new FhirMapperService();

  const patient = {
    id: 1,
    patientNumber: 'PT-000001',
    firstName: 'Jane',
    middleName: 'Akinyi',
    lastName: 'Wanjiku',
    gender: 'FEMALE',
    dateOfBirth: new Date('1990-05-01T00:00:00Z'),
    phonePrimary: '+254700000001',
    isDeceased: false,
  };

  describe('toFhirPatient', () => {
    it('maps demographics, identifiers and telecom', () => {
      const resource = mapper.toFhirPatient(patient, '12345678');

      expect(resource.resourceType).toBe('Patient');
      expect(resource.identifier).toEqual([
        { system: 'urn:hms:patient-number', value: 'PT-000001' },
        {
          system: 'https://dha.go.ke/identifier/national-id',
          value: '12345678',
        },
      ]);
      expect(resource.name?.[0]).toMatchObject({
        family: 'Wanjiku',
        given: ['Jane', 'Akinyi'],
      });
      expect(resource.gender).toBe('female');
      expect(resource.birthDate).toBe('1990-05-01');
      expect(resource.telecom?.[0]).toEqual({
        system: 'phone',
        value: '+254700000001',
      });
      expect(resource.deceasedBoolean).toBeUndefined();
    });

    it('handles unknown gender, missing phone, and deceased patients', () => {
      const resource = mapper.toFhirPatient({
        ...patient,
        gender: 'OTHER-TEXT',
        phonePrimary: null,
        dateOfBirth: null,
        isDeceased: true,
      });
      expect(resource.gender).toBe('unknown');
      expect(resource.telecom).toBeUndefined();
      expect(resource.birthDate).toBeUndefined();
      expect(resource.deceasedBoolean).toBe(true);
    });
  });

  describe('toFhirOrganization', () => {
    it('maps facility identity and address', () => {
      const resource = mapper.toFhirOrganization({
        id: 1,
        code: 'FAC001',
        name: 'Mock Hospital',
        facilityType: 'HOSPITAL',
        county: 'Nairobi',
        town: 'Westlands',
        country: null,
      });
      expect(resource.identifier?.[0]).toEqual({
        system: 'https://dha.go.ke/identifier/facility-code',
        value: 'FAC001',
      });
      expect(resource.name).toBe('Mock Hospital');
      expect(resource.address?.[0]).toEqual({
        city: 'Westlands',
        district: 'Nairobi',
        country: 'KE',
      });
    });
  });

  describe('toFhirPractitioner', () => {
    it('maps registration number and qualification', () => {
      const resource = mapper.toFhirPractitioner({
        id: 4,
        firstName: 'Achieng',
        lastName: 'Odhiambo',
        registrationNumber: 'KMPDC-12345',
        cadre: 'Medical Officer',
      });
      expect(resource.identifier?.[0].value).toBe('KMPDC-12345');
      expect(resource.qualification?.[0].code?.text).toBe('Medical Officer');
    });

    it('omits identifiers when there is no registration number', () => {
      const resource = mapper.toFhirPractitioner({
        id: 5,
        firstName: 'Ben',
        lastName: null,
        registrationNumber: null,
        cadre: null,
      });
      expect(resource.identifier).toBeUndefined();
      expect(resource.qualification).toBeUndefined();
    });
  });

  describe('toFhirEncounter', () => {
    it('maps an in-progress encounter with diagnosis coding', () => {
      const resource = mapper.toFhirEncounter(
        {
          id: 9,
          patientId: 1,
          startedAt: new Date('2026-07-01T08:00:00Z'),
          endedAt: null,
          diagnosisText: 'Pneumonia',
          diagnosisCode: 'J18.9',
          practitionerRef: 'Practitioner/ST-001',
        },
        'Patient/PT-000001',
        'Organization/FAC001',
      );
      expect(resource.status).toBe('in-progress');
      expect(resource.subject?.reference).toBe('Patient/PT-000001');
      expect(resource.participant?.[0].individual?.reference).toBe(
        'Practitioner/ST-001',
      );
      expect(resource.reasonCode?.[0].coding?.[0]).toEqual({
        system: 'http://hl7.org/fhir/sid/icd-10',
        code: 'J18.9',
      });
      expect(resource.serviceProvider?.reference).toBe('Organization/FAC001');
    });

    it('marks completed encounters finished', () => {
      const resource = mapper.toFhirEncounter(
        {
          id: 9,
          patientId: 1,
          startedAt: new Date(),
          endedAt: new Date(),
          diagnosisText: null,
        },
        'Patient/1',
        'Organization/1',
      );
      expect(resource.status).toBe('finished');
      expect(resource.reasonCode).toBeUndefined();
    });
  });

  describe('referral, consent, and eligibility', () => {
    it('builds an active referral order', () => {
      const referral = mapper.toFhirReferral({
        patientRef: 'Patient/PT-000001',
        requesterRef: 'Organization/FAC001',
        performerFacilityRef: 'Organization/KMHFL-999',
        reason: 'Specialist review',
        serviceText: 'Cardiology',
      });
      expect(referral.status).toBe('active');
      expect(referral.intent).toBe('order');
      expect(referral.performer?.[0].reference).toBe('Organization/KMHFL-999');
      expect(referral.note?.[0].text).toBe('Specialist review');
    });

    it('builds permit and deny consent provisions', () => {
      const permit = mapper.toFhirConsent({
        patientRef: 'Patient/1',
        permit: true,
        purposeCode: 'TREAT',
      });
      expect(permit.provision?.type).toBe('permit');
      expect(permit.provision?.purpose?.[0].code).toBe('TREAT');

      const deny = mapper.toFhirConsent({
        patientRef: 'Patient/1',
        permit: false,
      });
      expect(deny.provision?.type).toBe('deny');
      expect(deny.provision?.purpose).toBeUndefined();
    });

    it('builds an eligibility request for a member number', () => {
      const request = mapper.toEligibilityRequest({
        memberNumber: 'SHA-MEM-1',
      });
      expect(request.resourceType).toBe('CoverageEligibilityRequest');
      expect(request.purpose).toEqual(['validation', 'benefits']);
      expect(request.patient?.display).toBe('SHA-MEM-1');
    });
  });

  describe('toTransactionBundle', () => {
    it('wraps resources in POST transaction entries', () => {
      const bundle = mapper.toTransactionBundle([
        { resourceType: 'Patient' },
        { resourceType: 'Claim' },
        { noType: true },
      ]);
      expect(bundle.type).toBe('transaction');
      expect(bundle.entry?.map((entry) => entry.request?.url)).toEqual([
        'Patient',
        'Claim',
        'Resource',
      ]);
      expect(
        bundle.entry?.every((entry) => entry.request?.method === 'POST'),
      ).toBe(true);
    });
  });
});
