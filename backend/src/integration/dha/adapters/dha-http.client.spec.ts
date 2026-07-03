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
  const client = new DhaHttpClient(http, makeConfig({ DHA_MODE: 'sandbox' }));
  return { client, calls };
}

const TOKEN_RESPONSE = {
  data: { access_token: 'dha-token-1', expires_in: 3600 },
};

describe('DhaHttpClient', () => {
  it('authenticates with client credentials, then calls versioned FHIR endpoints', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { status: 'VERIFIED', reference: 'PAT-1' } },
    ]);

    const result = await client.verifyPatient(
      { nationalId: '12345678' },
      { correlationId: 'corr-1' },
    );

    // First call: token endpoint with basic auth and form body.
    expect(calls[0]).toMatchObject({
      method: 'POST',
      body: 'grant_type=client_credentials',
    });
    expect(calls[0].headers.Authorization).toMatch(/^Basic /);

    // Second call: the API itself with the bearer token and version headers.
    expect(calls[1]).toMatchObject({
      path: '/api/v1/patients/verify',
      correlationId: 'corr-1',
    });
    expect(calls[1].headers.Authorization).toBe('Bearer dha-token-1');
    expect(calls[1].headers['X-API-Version']).toBe('v1');
    expect(calls[1].headers['X-Facility-Code']).toBe('KMHFL-001');

    expect(result.status).toBe('VERIFIED');
    expect(result.externalRef).toBe('PAT-1');
  });

  it('reuses the cached token across calls', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { status: 'VERIFIED' } },
      { data: { status: 'VERIFIED' } },
    ]);
    await client.verifyPatient({ nationalId: '1' });
    await client.verifyFacility({ facilityCode: 'F1' });

    const tokenCalls = calls.filter(
      (call) => call.body === 'grant_type=client_credentials',
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it('refreshes the token and retries once on 401 (invalid token)', async () => {
    const { client, calls } = makeClient([
      { data: { access_token: 'expired-token', expires_in: 3600 } },
      { error: new IntegrationHttpError('unauthorized', 'HTTP_ERROR', 401) },
      { data: { access_token: 'fresh-token', expires_in: 3600 } },
      { data: { status: 'VERIFIED', reference: 'PAT-2' } },
    ]);

    const result = await client.verifyPatient({ nationalId: '1' });

    expect(result.status).toBe('VERIFIED');
    const apiCalls = calls.filter((call) =>
      String(call.path).includes('patients/verify'),
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
    await expect(
      client.verifyPatient({ nationalId: '1' }),
    ).rejects.toBeInstanceOf(DhaApiError);
  });

  it('maps HTTP failures to DhaApiError preserving retryability', async () => {
    const { client } = makeClient([
      TOKEN_RESPONSE,
      { error: new IntegrationHttpError('bad gateway', 'HTTP_ERROR', 502) },
    ]);
    await expect(
      client.verifyPatient({ nationalId: '1' }),
    ).rejects.toMatchObject({ httpStatus: 502, retryable: true });
  });

  it('normalizes negative statuses from the DHA envelope', async () => {
    const { client } = makeClient([
      TOKEN_RESPONSE,
      { data: { status: 'NOT_FOUND' } },
    ]);
    const result = await client.verifyPractitioner({
      registrationNumber: 'X',
    });
    expect(result.status).toBe('NOT_FOUND');
  });

  it('covers the remaining FHIR submission endpoints', async () => {
    const { client, calls } = makeClient([
      TOKEN_RESPONSE,
      { data: { status: 'ACCEPTED', id: 'ref-1' } },
      { data: { status: 'ACCEPTED' } },
      { data: { status: 'ACCEPTED' } },
      { data: { status: 'ACCEPTED' } },
      { data: { status: 'ACCEPTED' } },
      { data: { status: 'ELIGIBLE' } },
      { data: { status: 'ACCEPTED' } },
    ]);
    const bundle = {
      resourceType: 'Bundle' as const,
      type: 'transaction' as const,
    };

    expect((await client.submitEncounter(bundle)).status).toBe('ACCEPTED');
    expect((await client.exchangeHealthRecord(bundle)).status).toBe('ACCEPTED');
    expect(
      (
        await client.submitReferral({
          resourceType: 'ServiceRequest',
          status: 'active',
          intent: 'order',
        })
      ).status,
    ).toBe('ACCEPTED');
    expect(
      (
        await client.recordConsent({
          resourceType: 'Consent',
          status: 'active',
        })
      ).status,
    ).toBe('ACCEPTED');
    expect((await client.submitClaim(bundle)).status).toBe('ACCEPTED');
    expect(
      (
        await client.checkEligibility({
          memberNumber: 'M-1',
        })
      ).status,
    ).toBe('ELIGIBLE');
    expect(
      (
        await client.submitAuditEvent({
          resourceType: 'AuditEvent',
        })
      ).status,
    ).toBe('ACCEPTED');

    const paths = calls.slice(1).map((call) => call.path);
    expect(paths).toEqual([
      '/api/v1/Encounter',
      '/api/v1/Bundle',
      '/api/v1/ServiceRequest',
      '/api/v1/Consent',
      '/api/v1/Claim',
      '/api/v1/CoverageEligibilityRequest',
      '/api/v1/AuditEvent',
    ]);
  });
});
