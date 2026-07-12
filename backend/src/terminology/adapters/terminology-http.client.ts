import { Injectable } from '@nestjs/common';
import { IntegrationHttpClient } from '../../integration/http/integration-http.client';
import { IntegrationHttpError } from '../../integration/http/retry-policy';
import { IntegrationConfigService } from '../../integration/integration-config.service';
import { INTEGRATION_NAMES } from '../../integration/integration.constants';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';
import { TokenManager } from '../../integration/token/token-manager';
import { DhaApiError } from '../../integration/dha/dha.types';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  TerminologyConceptQuery,
  TerminologyPaginatedResponse,
  TerminologyConcept,
} from '../terminology.types';

@Injectable()
export class TerminologyHttpClient {
  private tokenManager: TokenManager;

  constructor(
    private readonly http: IntegrationHttpClient,
    private readonly config: IntegrationConfigService,
    private readonly logger: IntegrationLoggerService,
    private readonly prisma: PrismaService,
  ) {
    this.tokenManager = new TokenManager(
      () => this.fetchToken(),
      60,
      this.logger,
    );
  }

  private async fetchToken() {
    const clientId = this.config.dhaClientId;
    const clientSecret = this.config.dhaClientSecret;

    const response = await this.http.request<{
      access_token?: string;
      expires_in?: number;
    }>({
      integration: INTEGRATION_NAMES.DHA,
      baseUrl: this.config.dhaTokenUrl || this.config.dhaBaseUrl,
      path: this.config.dhaTokenUrl ? '' : '/oauth2/token',
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      timeoutMs: this.config.dhaTimeoutMs,
    });

    return {
      accessToken: response.data?.access_token ?? '',
      expiresInSeconds: response.data?.expires_in ?? 300,
    };
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    let token = await this.tokenManager.getToken();

    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await this.http.request<T>({
          integration: INTEGRATION_NAMES.DHA,
          baseUrl: this.config.terminologyBaseUrl,
          path,
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          query,
          timeoutMs: this.config.dhaTimeoutMs,
          maxAttempts: 3,
        });
        return response.data;
      } catch (error) {
        if (
          attempt === 1 &&
          error instanceof IntegrationHttpError &&
          error.httpStatus === 401
        ) {
          this.logger.warn(
            'Terminology API returned 401, invalidating token and retrying',
          );
          this.tokenManager.invalidate();
          token = await this.tokenManager.getToken();
          continue;
        }
        if (error instanceof IntegrationHttpError) {
          this.logger.error(`Terminology API call failed: ${error.message}`, {
            httpStatus: error.httpStatus,
            retryable: error.retryable,
            path,
          });
          throw new DhaApiError(
            error.message,
            error.httpStatus,
            error.retryable,
          );
        }
        throw error;
      }
    }
  }

  async searchConcepts(
    query: TerminologyConceptQuery,
  ): Promise<TerminologyPaginatedResponse<TerminologyConcept>> {
    const queryParams: Record<string, string | number> = {};
    if (query.owner) queryParams.owner = query.owner;
    if (query.source) queryParams.source = query.source;
    if (query.collection) queryParams.collection = query.collection;
    if (query.search) queryParams.search = query.search;
    if (query.limit !== undefined) queryParams.limit = query.limit;
    if (query.offset !== undefined) queryParams.offset = query.offset;

    return this.call<TerminologyPaginatedResponse<TerminologyConcept>>(
      'GET',
      '/concepts',
      queryParams,
    );
  }

  async getSources(): Promise<any> {
    return this.call<any>('GET', '/sources');
  }

  async getCollections(): Promise<any> {
    return this.call<any>('GET', '/collections');
  }

  async getVersions(): Promise<any> {
    return this.call<any>('GET', '/versions');
  }
}
