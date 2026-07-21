import { DhaMockClient } from './dha-mock.client';

describe('DhaMockClient', () => {
  const client = new DhaMockClient();

  it('verifies known patients and rejects UNKNOWN markers', async () => {
    const verified = await client.verifyPatient({ nationalId: '12345678' });
    expect(verified.status).toBe('VERIFIED');
    expect(verified.externalRef).toMatch(/^PAT-MOCK-/);

    const missing = await client.verifyPatient({ nationalId: 'UNKNOWN-9' });
    expect(missing.status).toBe('NOT_FOUND');

    const missingSha = await client.verifyPatient({
      shaNumber: 'unknown-member',
    });
    expect(missingSha.status).toBe('NOT_FOUND');
  });

  it('verifies practitioners and facilities with negative paths', async () => {
    expect(
      (await client.verifyPractitioner({ registrationNumber: 'KMPDC-1' }))
        .status,
    ).toBe('VERIFIED');
    expect(
      (await client.verifyPractitioner({ registrationNumber: 'UNKNOWN' }))
        .status,
    ).toBe('NOT_FOUND');
    expect(
      (await client.verifyFacility({ facilityCode: 'KMHFL-001' })).status,
    ).toBe('VERIFIED');
    expect(
      (await client.verifyFacility({ facilityCode: 'UNKNOWN-F' })).status,
    ).toBe('NOT_FOUND');
  });

  it('checks eligibility for members', async () => {
    expect(
      (await client.checkEligibility({ memberNumber: 'SHA-1' })).status,
    ).toBe('ELIGIBLE');
    expect(
      (await client.checkEligibility({ memberNumber: 'UNKNOWN-1' })).status,
    ).toBe('NOT_ELIGIBLE');
    // FHIR-shaped requests (no memberNumber field) default to eligible.
    expect(
      (
        await client.checkEligibility({
          resourceType: 'CoverageEligibilityRequest',
          status: 'active',
          purpose: ['validation'],
        })
      ).status,
    ).toBe('ELIGIBLE');
  });

  it('accepts all document submissions with distinct reference prefixes', async () => {
    expect((await client.submitEncounter()).externalRef).toMatch(/^ENC-/);
    expect((await client.exchangeHealthRecord()).externalRef).toMatch(/^DOC-/);
    expect((await client.submitReferral()).externalRef).toMatch(/^REF-/);
    expect((await client.recordConsent()).externalRef).toMatch(/^CON-/);
    expect((await client.submitClaim()).externalRef).toMatch(/^CLM-/);
    expect((await client.submitAuditEvent()).externalRef).toMatch(/^AUD-/);
  });

  it('supports the closed DHA API operation catalogue in mock mode', async () => {
    const result = await client.executeApiOperation('BENEFITS', {
      patient_id: 'CR-123',
    });

    expect(result).toMatchObject({
      status: 'SUCCESS',
      data: {
        mock: true,
        operation: 'BENEFITS',
        accepted: true,
      },
    });
    expect(result.externalRef).toMatch(/^BENEFITS-MOCK-/);
  });

  it('returns deterministic mock responses for visit authorization helpers', async () => {
    expect((await client.getPatientContacts()).data).toEqual([
      expect.objectContaining({ relationship: 'SELF' }),
    ]);
    expect((await client.sendVisitOtp()).externalRef).toMatch(/^OTP-/);

    const authorization = await client.createAuthorization();
    expect(authorization.externalRef).toMatch(/^AUTH-/);
    expect(authorization.data).toEqual(
      expect.objectContaining({ consentToken: 'mock-token' }),
    );

    expect((await client.sendDischargeOtp()).externalRef).toMatch(/^OTP-/);
    expect((await client.pollClaimResponse('SHA-1')).externalRef).toMatch(
      /^CLR-/,
    );
  });
});
