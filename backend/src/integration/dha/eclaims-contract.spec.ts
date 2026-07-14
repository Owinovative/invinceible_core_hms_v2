import { DhaApiError } from './dha.types';
import { eclaimsRequest, resolveEclaimsOperation } from './eclaims-contract';

describe('DHA eClaims contract', () => {
  it('rejects a command missing a DHA-required field', () => {
    expect(() =>
      resolveEclaimsOperation({
        operation: 'ADD_LINE',
        payload: {
          consent_token: 'consent-1',
          intervention_code: 'SHA-01',
          unit_price: 100,
        },
      }),
    ).toThrow(DhaApiError);
  });

  it('keeps the preauth diagnosis code in the documented URL and JSON body', () => {
    const request = eclaimsRequest({
      operation: 'REMOVE_PREAUTH_DIAGNOSIS',
      payload: {
        consent_token: 'consent-1',
        icd_code: 'A09',
        intervention_code: 'SHA-01',
      },
    });

    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/preauths/diagnoses/A09');
    expect(request.payload).toEqual({
      consent_token: 'consent-1',
      icd_code: 'A09',
      intervention_code: 'SHA-01',
    });
  });

  it('sends the authorization token in the reject URL rather than the body', () => {
    const request = eclaimsRequest({
      operation: 'REJECT_AUTHORIZATION',
      payload: { consent_token: 'consent/1' },
    });

    expect(request.path).toBe('/claims/authorizations/consent%2F1/reject');
    expect(request.payload).toEqual({});
  });

  it('requires documented query parameters for preauth reads', () => {
    expect(() =>
      resolveEclaimsOperation({ operation: 'GET_PREAUTH', query: {} }),
    ).toThrow('requires query parameter consent_token');

    const request = eclaimsRequest({
      operation: 'GET_PREAUTH',
      query: { consent_token: 'consent-1' },
    });
    expect(request.method).toBe('GET');
    expect(request.query).toEqual({ consent_token: 'consent-1' });
  });

  it('accepts DHA biometric visits while requiring one consent strategy', () => {
    const request = eclaimsRequest({
      operation: 'CREATE_VISIT',
      payload: {
        intervention_codes: ['SHA-01'],
        patient_id: 'cr-1',
        service_type: 'OUTPATIENT',
        auth_guid: 'auth-1',
      },
    });

    expect(request.path).toBe('/claims/visit');
    expect(() =>
      resolveEclaimsOperation({
        operation: 'CREATE_VISIT',
        payload: {
          intervention_codes: ['SHA-01'],
          patient_id: 'cr-1',
          service_type: 'OUTPATIENT',
        },
      }),
    ).toThrow('requires otp or auth_guid');
  });

  it('requires DHA practitioner details to be supplied as a complete set', () => {
    expect(() =>
      resolveEclaimsOperation({
        operation: 'ADD_LINE',
        payload: {
          consent_token: 'consent-1',
          intervention_code: 'SHA-01',
          unit_price: '100',
          quantity: '1',
          practitioner_identification_number: 'KMPDC-1',
        },
      }),
    ).toThrow('requires all practitioner identification fields together');
  });
});
