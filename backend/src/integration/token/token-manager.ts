export interface TokenFetchResult {
  accessToken: string;
  /** Lifetime reported by the identity provider. */
  expiresInSeconds: number;
}

/**
 * Caches an access token until shortly before expiry and refreshes it on
 * demand. Single-flight: concurrent callers share one refresh request.
 * `invalidate()` lets adapters force a refresh after a 401.
 */
export class TokenManager {
  private accessToken?: string;
  private expiresAtMs = 0;
  private inflight?: Promise<string>;

  constructor(
    private readonly fetchToken: () => Promise<TokenFetchResult>,
    private readonly refreshSkewSeconds = 60,
  ) {}

  async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAtMs) {
      return this.accessToken;
    }
    if (!this.inflight) {
      this.inflight = this.refresh().finally(() => {
        this.inflight = undefined;
      });
    }
    return this.inflight;
  }

  invalidate(): void {
    this.accessToken = undefined;
    this.expiresAtMs = 0;
  }

  private async refresh(): Promise<string> {
    const result = await this.fetchToken();
    if (!result?.accessToken) {
      throw new Error('Token endpoint returned an empty access token');
    }
    this.accessToken = result.accessToken;
    const lifetimeSeconds = Math.max(
      result.expiresInSeconds - this.refreshSkewSeconds,
      1,
    );
    this.expiresAtMs = Date.now() + lifetimeSeconds * 1_000;
    return this.accessToken;
  }
}
