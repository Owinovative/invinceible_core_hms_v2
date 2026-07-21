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
  identificationType: 'national-id',
};

describe('DhaHttpClient', () => {
  it('authenticates with AfyaLink Basic credentials and consumer key', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { message: { status: 'VERIFIED', id: 'PAT-1' } } },
    ]);

    const result = await client.verifyPatient(PATIENT_QUERY, {
      correlationId: 'corr-1',
    });

    expect(calls[0]).toMatchObject({
      method: 'GET',
      query: { key: 'test-consumer-key' },
    });
    expect(calls[0].headers.Authorization).toBe(
      `Basic ${Buffer.from('test-user:test-password').toString('base64')}`,
    );

    expect(calls[1]).toMatchObject({
      path: '/v3/client-registry/fetch-client',
      method: 'GET',
      query: {
        dynamic_id_search: 1,
        agent: 'TEST-AGENT',
        id: '12345678',
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

    const tokenCalls = calls.filter(
      (call) => call.query?.key === 'test-consumer-key',
    );
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
    const apiCalls = calls.filter(
      (call) => String(call.path) === '/v3/client-registry/fetch-client',
    );
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
      path: '/v2/eligibility',
      method: 'GET',
      query: {
        identification_number: '12345678',
        identification_type: 'national-id',
      },
    });
  });

  it('submits claims to the documented SHR-med bundle endpoint', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { message: { mediator_id: 'MED-1' } } },
    ]);
    const result = await client.submitClaim({
      resourceType: 'Bundle',
      type: 'message',
    });
    expect(calls[1]).toMatchObject({
      path: '/v1/shr-med/bundle',
      method: 'POST',
    });
    expect(result).toMatchObject({ status: 'ACCEPTED', externalRef: 'MED-1' });
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
      path: '/v2/facility-search',
      query: { 'facility-fid': 'FID-1' },
    });
    expect(calls[2]).toMatchObject({
      path: '/v1/practitioner-search',
      query: {
        identification_type: 'ID',
        identification_number: '12345678',
      },
    });
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

  it('maps claim status responses, including DHA claim-state extensions', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { message: { status: 'payment-completed' } } },
      {
        data: {
          message: {
            extension: [
              { url: 'https://dha.go.ke/claim-state', valueCode: 'rejected' },
            ],
          },
        },
      },
    ]);

    await expect(client.pollClaimResponse('CLAIM-1')).resolves.toMatchObject({
      status: 'SETTLED',
    });
    await expect(client.pollClaimResponse('CLAIM-2')).resolves.toMatchObject({
      status: 'REJECTED',
    });
    expect(calls.slice(1).map((call) => call.query)).toEqual([
      { claim_id: 'CLAIM-1' },
      { claim_id: 'CLAIM-2' },
    ]);
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
      '/claims/otp',
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
});
