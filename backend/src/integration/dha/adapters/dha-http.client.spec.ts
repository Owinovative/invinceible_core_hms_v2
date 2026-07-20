import { DhaHttpClient } from './dha-http.client';
import { DhaApiError } from '../dha.types';
import type { IntegrationHttpClient } from '../../http/integration-http.client';
import { IntegrationHttpError } from '../../http/retry-policy';
import { makeConfig } from '../../testing/test-support';

interface ScriptedResponse {
  data?: unknown;
  error?: Error;
}

function makeClient(script: ScriptedResponse[]) {
  let index = 0;
  const calls: Array<Record<string, any>> = [];
  const http = {
    request: jest.fn((options: Record<string, unknown>) => {
      calls.push(options as Record<string, any>);
      const next = script[Math.min(index, script.length - 1)];
      index += 1;
      if (next.error) return Promise.reject(next.error);
      return Promise.resolve({
        status: 200,
        data: next.data,
        requestId: 'req-1',
        latencyMs: 5,
        retryCount: 0,
      });
    }),
  } as unknown as IntegrationHttpClient;
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
  const client = new DhaHttpClient(
    http,
    makeConfig({ DHA_MODE: 'sandbox' }),
    logger,
  );
  return { client, calls };
}

const TOKEN_RESPONSE = {
  data: { token: 'dha-token-1', expires_in: 3600 },
};
const PATIENT_QUERY = {
  nationalId: '12345678',
  identificationType: 'National ID',
};

describe('DhaHttpClient', () => {
  it('authenticates with the current OAuth client credentials contract', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { message: { status: 'VERIFIED', id: 'PAT-1' } } },
    ]);

    const result = await client.verifyPatient(PATIENT_QUERY, {
      correlationId: 'corr-1',
    });

    expect(calls[0]).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'client_id=test-client-id&client_secret=test-client-secret',
    });

    expect(calls[1]).toMatchObject({
      path: '/patients',
      method: 'GET',
      query: {
        identification_number: '12345678',
        identification_type: 'National ID',
      },
      correlationId: 'corr-1',
    });
    expect(calls[1].headers.Authorization).toBe('Bearer dha-token-1');

    expect(result.status).toBe('VERIFIED');
    expect(result.externalRef).toBe('PAT-1');
  });

  it('reuses the cached token across calls', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { status: 'VERIFIED' } },
      { data: { status: 'VERIFIED' } },
    ]);
    await client.verifyPatient(PATIENT_QUERY);
    await client.verifyPatient({ ...PATIENT_QUERY, nationalId: '2' });

    const tokenCalls = calls.filter((call) => call.path === '');
    expect(tokenCalls).toHaveLength(1);
  });

  it('refreshes the token and retries once on 401 (invalid token)', async () => {
    const { client, calls } = makeClient([
      { data: { token: 'expired-token', expires_in: 3600 } },
      { error: new IntegrationHttpError('unauthorized', 'HTTP_ERROR', 401) },
      { data: { token: 'fresh-token', expires_in: 3600 } },
      { data: { status: 'VERIFIED', reference: 'PAT-2' } },
    ]);

    const result = await client.verifyPatient(PATIENT_QUERY);

    expect(result.status).toBe('VERIFIED');
    const apiCalls = calls.filter((call) => String(call.path) === '/patients');
    expect(apiCalls).toHaveLength(2);
    expect(apiCalls[0].headers.Authorization).toBe('Bearer expired-token');
    expect(apiCalls[1].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('fails when the token stays invalid after one refresh', async () => {
    const { client } = makeClient([
      TOKEN_RESPONSE,
      { error: new IntegrationHttpError('unauthorized', 'HTTP_ERROR', 401) },
      TOKEN_RESPONSE,
      { error: new IntegrationHttpError('unauthorized', 'HTTP_ERROR', 401) },
    ]);
    await expect(client.verifyPatient(PATIENT_QUERY)).rejects.toBeInstanceOf(
      DhaApiError,
    );
  });

  it('maps HTTP failures to DhaApiError preserving retryability', async () => {
    const { client } = makeClient([
      TOKEN_RESPONSE,
      { error: new IntegrationHttpError('bad gateway', 'HTTP_ERROR', 502) },
    ]);
    await expect(client.verifyPatient(PATIENT_QUERY)).rejects.toMatchObject({
      httpStatus: 502,
      retryable: true,
    });
  });

  it('normalizes negative patient statuses from the DHA envelope', async () => {
    const { client } = makeClient([
      TOKEN_RESPONSE,
      { data: { status: 'NOT_FOUND' } },
    ]);
    const result = await client.verifyPatient(PATIENT_QUERY);
    expect(result.status).toBe('NOT_FOUND');
  });

  it('uses the official eligibility query endpoint', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { message: { eligible: 1, id: 'CR-1' } } },
    ]);
    expect(
      (
        await client.checkEligibility({
          identificationNumber: '12345678',
          identificationType: 'national-id',
        })
      ).status,
    ).toBe('ELIGIBLE');
    expect(calls[1]).toMatchObject({
      path: '/patients/eligibility',
      method: 'GET',
      query: {
        identification_number: '12345678',
        identification_type: 'national-id',
      },
    });
  });

  it('fails closed for the retired legacy FHIR claim route', async () => {
    const { client, calls } = makeClient([TOKEN_RESPONSE]);
    await expect(
      client.submitClaim({ resourceType: 'Bundle', type: 'message' }),
    ).rejects.toThrow('current eClaims lifecycle');
    expect(calls).toHaveLength(0);
  });

  it('uses the documented facility and practitioner registry routes', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { message: { id: 'FID-1' } } },
      {
        data: {
          message: { registration_number: 123, found: 1, is_active: 'yes' },
        },
      },
    ]);
    await client.verifyFacility({ facilityCode: 'FID-1' });
    await client.verifyPractitioner({
      identificationType: 'ID',
      identificationNumber: '12345678',
    });
    expect(calls[1]).toMatchObject({
      path: '/facilities/search',
      query: { identifier: 'FID-1', 'identifier-type': 'fr-code' },
    });
    expect(calls[2]).toMatchObject({
      path: '/professionals',
      query: {
        identification_type: 'ID',
        identification_number: '12345678',
      },
    });
  });

  it('expands documented path parameters without leaking them into the query', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { status: 'SUCCESS' } },
    ]);

    await client.executeApiOperation(
      'REMOVE_PREAUTH_DIAGNOSIS',
      { icd_code: '1A00/1', consent_token: 'secret' },
      { facilityRegistryId: 'FID-LOCAL' },
    );

    expect(calls[1]).toMatchObject({
      path: '/preauths/diagnoses/1A00%2F1',
      method: 'DELETE',
      query: { consent_token: 'secret' },
    });
    expect(calls[1].headers['X-Facility-Id']).toBe('FID-LOCAL');
  });

  it('fails closed when required registry identifiers are missing', async () => {
    const { client, calls } = makeClient([TOKEN_RESPONSE]);

    await expect(client.verifyPatient({})).rejects.toBeInstanceOf(DhaApiError);
    await expect(client.verifyPractitioner({})).rejects.toBeInstanceOf(
      DhaApiError,
    );
    await expect(client.verifyFacility({})).rejects.toBeInstanceOf(DhaApiError);
    await expect(client.checkEligibility({})).rejects.toBeInstanceOf(
      DhaApiError,
    );

    expect(calls).toHaveLength(0);
  });

  it('fails closed for the retired legacy claim polling route', async () => {
    const { client, calls } = makeClient([TOKEN_RESPONSE]);
    await expect(client.pollClaimResponse('CLAIM-1')).rejects.toThrow(
      'current claim and remittance operations',
    );
    expect(calls).toHaveLength(0);
  });

  it('uses the consent-management routes and selects the authorization route', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { message: { status: 'SUCCESS' } } },
      { data: { message: { status: 'SUCCESS' } } },
      { data: { message: { status: 'SUCCESS' } } },
      { data: { message: { status: 'SUCCESS' } } },
      { data: { message: { status: 'SUCCESS' } } },
    ]);

    await client.getPatientContacts('PAT-1');
    await client.sendVisitOtp({ patient_id: 'PAT-1' } as never);
    await client.createAuthorization({ patient_id: 'PAT-1' } as never);
    await client.createAuthorization({ otp_code: '123456' } as never);
    await client.sendDischargeOtp({ patient_id: 'PAT-1' } as never);

    expect(calls.slice(1).map((call) => call.path)).toEqual([
      '/patients/contacts',
      '/claims/otp',
      '/claims/authorize',
      '/claims/visit',
      '/claims/otp/discharge',
    ]);
  });

  it('keeps uncertified legacy FHIR operations disabled', async () => {
    const { client, calls } = makeClient([TOKEN_RESPONSE]);

    await expect(client.submitEncounter({} as never)).rejects.toBeInstanceOf(
      DhaApiError,
    );
    await expect(
      client.exchangeHealthRecord({} as never),
    ).rejects.toBeInstanceOf(DhaApiError);
    await expect(client.submitReferral({} as never)).rejects.toBeInstanceOf(
      DhaApiError,
    );
    await expect(client.recordConsent({} as never)).rejects.toBeInstanceOf(
      DhaApiError,
    );
    await expect(client.submitAuditEvent({} as never)).rejects.toBeInstanceOf(
      DhaApiError,
    );

    expect(calls).toHaveLength(0);
  });

  it('executes only allowlisted catalog operations with facility headers', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { results: [{ intervention_code: 'SHA-12-001' }] } },
    ]);

    await client.executeApiOperation('INTERVENTION_COVERAGE', {
      patient_id: 'CR-1',
      sub_benefit_code: 'SHIF-IP',
    });

    expect(calls[1]).toMatchObject({
      method: 'GET',
      path: '/patients/benefits/interventions',
      query: { patient_id: 'CR-1', sub_benefit_code: 'SHIF-IP' },
    });
    expect(calls[1].headers).toMatchObject({
      'X-Facility-Id': 'FID-TEST-001',
      'X-Facility-Id-Type': 'fr-code',
    });
  });

  it('routes SHR bundles through the clinical API base', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { status: 'ACCEPTED' } },
    ]);

    await client.executeApiOperation('PUBLISH_SHR_BUNDLE', {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [],
    });

    expect(calls[1]).toMatchObject({
      baseUrl: 'https://ilm-dev.dha.go.ke/uat-middleware',
      path: '/clinical/fhir/bundle',
    });
  });
});
