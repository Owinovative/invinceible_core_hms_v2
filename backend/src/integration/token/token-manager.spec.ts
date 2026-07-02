import { TokenManager } from './token-manager';

describe('TokenManager', () => {
  it('fetches a token once and caches it until expiry', async () => {
    const fetchToken = jest
      .fn()
      .mockResolvedValue({ accessToken: 'token-1', expiresInSeconds: 3600 });
    const manager = new TokenManager(fetchToken);

    expect(await manager.getToken()).toBe('token-1');
    expect(await manager.getToken()).toBe('token-1');
    expect(fetchToken).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight refresh between concurrent callers', async () => {
    let resolveFetch: (value: {
      accessToken: string;
      expiresInSeconds: number;
    }) => void = () => undefined;
    const fetchToken = jest.fn(
      () =>
        new Promise<{ accessToken: string; expiresInSeconds: number }>(
          (resolvePromise) => {
            resolveFetch = resolvePromise;
          },
        ),
    );
    const manager = new TokenManager(fetchToken);

    const first = manager.getToken();
    const second = manager.getToken();
    resolveFetch({ accessToken: 'shared', expiresInSeconds: 600 });

    expect(await first).toBe('shared');
    expect(await second).toBe('shared');
    expect(fetchToken).toHaveBeenCalledTimes(1);
  });

  it('refreshes after the token expires (respecting the skew)', async () => {
    const fetchToken = jest
      .fn()
      .mockResolvedValueOnce({ accessToken: 'short', expiresInSeconds: 61 })
      .mockResolvedValueOnce({ accessToken: 'fresh', expiresInSeconds: 3600 });
    // 61s lifetime - 60s skew = 1s effective life.
    const manager = new TokenManager(fetchToken, 60);

    expect(await manager.getToken()).toBe('short');
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 1100));
    expect(await manager.getToken()).toBe('fresh');
    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it('invalidate() forces the next call to refresh', async () => {
    const fetchToken = jest
      .fn()
      .mockResolvedValueOnce({ accessToken: 'first', expiresInSeconds: 3600 })
      .mockResolvedValueOnce({ accessToken: 'second', expiresInSeconds: 3600 });
    const manager = new TokenManager(fetchToken);

    expect(await manager.getToken()).toBe('first');
    manager.invalidate();
    expect(await manager.getToken()).toBe('second');
  });

  it('rejects empty tokens from the identity provider', async () => {
    const manager = new TokenManager(() =>
      Promise.resolve({ accessToken: '', expiresInSeconds: 300 }),
    );
    await expect(manager.getToken()).rejects.toThrow(/empty access token/);
  });

  it('propagates token endpoint failures and recovers on retry', async () => {
    const fetchToken = jest
      .fn()
      .mockRejectedValueOnce(new Error('identity provider down'))
      .mockResolvedValueOnce({
        accessToken: 'recovered',
        expiresInSeconds: 3600,
      });
    const manager = new TokenManager(fetchToken);

    await expect(manager.getToken()).rejects.toThrow('identity provider down');
    expect(await manager.getToken()).toBe('recovered');
  });
});
