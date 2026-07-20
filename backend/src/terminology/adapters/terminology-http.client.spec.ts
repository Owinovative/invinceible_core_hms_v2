import { makeConfig } from '../../integration/testing/test-support';
import { TerminologyHttpClient } from './terminology-http.client';
import { DhaAccessTokenService } from '../../integration/dha/dha-access-token.service';

describe('TerminologyHttpClient DHA contract', () => {
  it('uses AfyaLink authentication for terminology calls', async () => {
    const calls: Array<Record<string, any>> = [];
    const http = {
      request: jest.fn((request: Record<string, unknown>) => {
        calls.push(request);
        return Promise.resolve({
          status: 200,
          data:
            calls.length === 1
              ? { token: 'token-1', expires_in: 3600 }
              : { results: [], count: 0 },
        });
      }),
    };
    const config = makeConfig({ DHA_MODE: 'sandbox' });
    const logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as never;
    const tokens = new DhaAccessTokenService(http as never, config, logger);
    const client = new TerminologyHttpClient(
      http as never,
      config,
      logger,
      tokens,
    );

    await client.searchConcepts({ search: 'malaria' });

    expect(calls[0]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'client_id=test-client-id&client_secret=test-client-secret',
    });
    expect(calls[1]).toMatchObject({
      method: 'GET',
      path: '/concepts',
      headers: {
        Authorization: 'Bearer token-1',
      },
      query: { search: 'malaria' },
    });
  });
});
