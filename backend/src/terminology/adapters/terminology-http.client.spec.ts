import { makeConfig } from '../../integration/testing/test-support';
import { TerminologyHttpClient } from './terminology-http.client';

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
    const client = new TerminologyHttpClient(
      http as never,
      makeConfig({ DHA_MODE: 'sandbox' }),
      {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as never,
    );

    await client.searchConcepts({ search: 'malaria' });

    expect(calls[0]).toMatchObject({
      method: 'GET',
      query: { key: 'test-consumer-key' },
    });
    expect(calls[0].headers.Authorization).toBe(
      `Basic ${Buffer.from('test-user:test-password').toString('base64')}`,
    );
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
