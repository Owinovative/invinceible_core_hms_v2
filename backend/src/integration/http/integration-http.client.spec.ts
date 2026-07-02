import { IntegrationHttpClient } from './integration-http.client';
import { IntegrationHttpError } from './retry-policy';
import { InMemoryPrisma } from '../testing/in-memory-prisma';
import {
  abortError,
  installFetchMock,
  jsonResponse,
  makeAudit,
  makeLogger,
  textResponse,
} from '../testing/test-support';

describe('IntegrationHttpClient', () => {
  let prisma: InMemoryPrisma;
  let client: IntegrationHttpClient;
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    prisma = new InMemoryPrisma();
    client = new IntegrationHttpClient(makeLogger(), makeAudit(prisma));
    // Speed up transport backoff sleeps.
    jest
      .spyOn(
        client as unknown as { sleep: (ms: number) => Promise<void> },
        'sleep',
      )
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    restoreFetch?.();
    restoreFetch = undefined;
    jest.restoreAllMocks();
  });

  function baseRequest() {
    return {
      integration: 'ETIMS' as const,
      baseUrl: 'https://api.example.test',
      path: '/saveTrnsSalesOsdc',
      method: 'POST' as const,
      body: { invcNo: 1 },
      correlationId: 'corr-1',
      facilityId: 5,
      timeoutMs: 1_000,
    };
  }

  it('returns parsed JSON on success and logs one audit row', async () => {
    const mock = installFetchMock([jsonResponse(200, { resultCd: '000' })]);
    restoreFetch = mock.restore;

    const response = await client.request(baseRequest());

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ resultCd: '000' });
    expect(response.retryCount).toBe(0);
    expect(response.requestId).toMatch(/[0-9a-f-]{36}/);

    const logs = prisma.integrationApiLog.rows;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      integration: 'ETIMS',
      endpoint: '/saveTrnsSalesOsdc',
      method: 'POST',
      outcome: 'SUCCESS',
      httpStatus: 200,
      retryCount: 0,
      correlationId: 'corr-1',
      facilityId: 5,
    });
  });

  it('sends correlation and request id headers but never logs header values', async () => {
    const mock = installFetchMock([jsonResponse(200, {})]);
    restoreFetch = mock.restore;

    await client.request({
      ...baseRequest(),
      headers: { cmcKey: 'super-secret-key' },
    });

    const headers = mock.calls[0].init.headers as Record<string, string>;
    expect(headers['X-Correlation-Id']).toBe('corr-1');
    expect(headers['X-Request-Id']).toBeDefined();
    expect(headers.cmcKey).toBe('super-secret-key');

    // The persisted audit row must not contain the secret anywhere.
    const persisted = JSON.stringify(prisma.integrationApiLog.rows);
    expect(persisted).not.toContain('super-secret-key');
  });

  it('appends query parameters and passes string bodies through unchanged', async () => {
    const mock = installFetchMock([textResponse(200, 'ok')]);
    restoreFetch = mock.restore;

    const response = await client.request({
      ...baseRequest(),
      body: 'grant_type=client_credentials',
      query: { page: 2, empty: undefined },
    });

    expect(mock.calls[0].url).toContain('?page=2');
    expect(mock.calls[0].url).not.toContain('empty');
    expect(mock.calls[0].init.body).toBe('grant_type=client_credentials');
    expect(response.data).toBe('ok');
  });

  it('retries 5xx responses and succeeds within the attempt budget', async () => {
    const mock = installFetchMock([
      jsonResponse(503, { message: 'unavailable' }),
      jsonResponse(200, { ok: true }),
    ]);
    restoreFetch = mock.restore;

    const response = await client.request({
      ...baseRequest(),
      maxAttempts: 3,
    });

    expect(response.data).toEqual({ ok: true });
    expect(response.retryCount).toBe(1);
    expect(mock.calls).toHaveLength(2);

    const outcomes = prisma.integrationApiLog.rows.map((row) => row.outcome);
    expect(outcomes).toEqual(['HTTP_ERROR', 'SUCCESS']);
  });

  it('does not retry non-retryable client errors', async () => {
    const mock = installFetchMock([
      jsonResponse(400, { message: 'bad request' }),
    ]);
    restoreFetch = mock.restore;

    await expect(
      client.request({ ...baseRequest(), maxAttempts: 3 }),
    ).rejects.toMatchObject({
      outcome: 'HTTP_ERROR',
      httpStatus: 400,
    });
    expect(mock.calls).toHaveLength(1);
  });

  it('classifies aborted requests as timeouts', async () => {
    const mock = installFetchMock([abortError()]);
    restoreFetch = mock.restore;

    await expect(client.request(baseRequest())).rejects.toMatchObject({
      outcome: 'TIMEOUT',
    });
    expect(prisma.integrationApiLog.rows[0].outcome).toBe('TIMEOUT');
  });

  it('surfaces network failures after exhausting retries', async () => {
    const mock = installFetchMock([
      new Error('socket hang up'),
      new Error('socket hang up'),
      new Error('socket hang up'),
    ]);
    restoreFetch = mock.restore;

    await expect(
      client.request({ ...baseRequest(), maxAttempts: 3 }),
    ).rejects.toBeInstanceOf(IntegrationHttpError);
    expect(mock.calls).toHaveLength(3);
    expect(
      prisma.integrationApiLog.rows.every(
        (row) => row.outcome === 'NETWORK_ERROR',
      ),
    ).toBe(true);
  });

  it('returns raw text when the response is not JSON', async () => {
    const mock = installFetchMock([textResponse(200, 'not-json')]);
    restoreFetch = mock.restore;

    const response = await client.request(baseRequest());
    expect(response.data).toBe('not-json');
  });

  it('captures error payloads on HTTP errors for callers to inspect', async () => {
    const mock = installFetchMock([
      jsonResponse(422, { resultCd: '801', resultMsg: 'duplicate' }),
    ]);
    restoreFetch = mock.restore;

    try {
      await client.request(baseRequest());
      throw new Error('expected request to fail');
    } catch (error) {
      const httpError = error as IntegrationHttpError;
      expect(httpError.httpStatus).toBe(422);
      expect(httpError.responseBody).toEqual({
        resultCd: '801',
        resultMsg: 'duplicate',
      });
    }
  });
});
