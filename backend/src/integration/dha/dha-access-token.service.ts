import { Injectable } from '@nestjs/common';
import { IntegrationHttpClient } from '../http/integration-http.client';
import { IntegrationConfigService } from '../integration-config.service';
import { INTEGRATION_NAMES } from '../integration.constants';
import { IntegrationLoggerService } from '../integration-logger.service';
import { TokenManager } from '../token/token-manager';

/** Single-flight, process-local DHA OAuth token provider shared by adapters. */
@Injectable()
export class DhaAccessTokenService {
  private readonly manager: TokenManager;

  constructor(
    private readonly http: IntegrationHttpClient,
    private readonly config: IntegrationConfigService,
    logger: IntegrationLoggerService,
  ) {
    this.manager = new TokenManager(() => this.fetchToken(), 60, logger);
  }

  getToken(): Promise<string> {
    return this.manager.getToken();
  }

  invalidate(): void {
    this.manager.invalidate();
  }

  private async fetchToken() {
    if (this.config.dhaAuthStrategy === 'oauth2') {
      const form = new URLSearchParams({
        client_id: this.config.dhaClientId,
        client_secret: this.config.dhaClientSecret,
      });
      const response = await this.http.request<{
        access_token?: string;
        token?: string;
        expires_in?: number;
        data?: { access_token?: string; expires_in?: number };
      }>({
        integration: INTEGRATION_NAMES.DHA,
        baseUrl: this.config.dhaTokenUrl,
        path: '',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        timeoutMs: this.config.dhaTimeoutMs,
      });
      const payload = response.data ?? {};
      return {
        accessToken:
          payload.access_token ??
          payload.token ??
          payload.data?.access_token ??
          '',
        expiresInSeconds: payload.expires_in ?? payload.data?.expires_in ?? 300,
      };
    }

    const credentials = Buffer.from(
      `${this.config.dhaUsername}:${this.config.dhaPassword}`,
      'utf8',
    ).toString('base64');
    const response = await this.http.request<{
      token?: string;
      access_token?: string;
      expires_in?: number;
    }>({
      integration: INTEGRATION_NAMES.DHA,
      baseUrl: this.config.dhaTokenUrl,
      path: '',
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
      query: { key: this.config.dhaConsumerKey },
      timeoutMs: this.config.dhaTimeoutMs,
    });
    return {
      accessToken: response.data?.token ?? response.data?.access_token ?? '',
      expiresInSeconds: response.data?.expires_in ?? 300,
    };
  }
}
