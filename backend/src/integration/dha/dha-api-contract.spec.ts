import {
  DHA_API_OPERATIONS,
  isDhaApiOperation,
  redactDhaPayload,
  validateDhaApiPayload,
} from './dha-api-contract';

describe('DHA July 2026 API contract', () => {
  it('keeps operations on an explicit route allowlist', () => {
    expect(isDhaApiOperation('START_VISIT')).toBe(true);
    expect(isDhaApiOperation('ARBITRARY_PROXY')).toBe(false);
    expect(DHA_API_OPERATIONS.START_VISIT).toMatchObject({
      method: 'POST',
      path: '/claims/visit',
    });
  });

  it('rejects missing mandatory and alternative fields before transport', () => {
    expect(() =>
      validateDhaApiPayload('INTERVENTION_COVERAGE', { patient_id: 'CR-1' }),
    ).toThrow('sub_benefit_code');
    expect(() =>
      validateDhaApiPayload('START_VISIT', {
        patient_id: 'CR-1',
        intervention_codes: ['SHA-12-001'],
        service_type: 'OUTPATIENT',
      }),
    ).toThrow('otp or auth_guid');
  });

  it('accepts both OTP and biometric visit contracts', () => {
    const common = {
      patient_id: 'CR-1',
      intervention_codes: ['SHA-12-001'],
      service_type: 'OUTPATIENT',
    };
    expect(() =>
      validateDhaApiPayload('START_VISIT', { ...common, otp: '123456' }),
    ).not.toThrow();
    expect(() =>
      validateDhaApiPayload('START_VISIT', {
        ...common,
        auth_guid: 'guid-1',
      }),
    ).not.toThrow();
  });

  it('deeply redacts credentials, consent, biometrics, OTPs, and file bodies', () => {
    expect(
      redactDhaPayload({
        consent_token: 'secret',
        nested: [{ otp: '123456', safe: 'kept' }],
        attachment: { file_blob: 'base64-data' },
      }),
    ).toEqual({
      consent_token: '[REDACTED]',
      nested: [{ otp: '[REDACTED]', safe: 'kept' }],
      attachment: { file_blob: '[REDACTED]' },
    });
  });
});
