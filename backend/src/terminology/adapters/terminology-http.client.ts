import { Injectable } from '@nestjs/common';
import { IntegrationHttpClient } from '../../integration/http/integration-http.client';
import { IntegrationHttpError } from '../../integration/http/retry-policy';
import { IntegrationConfigService } from '../../integration/integration-config.service';
import { INTEGRATION_NAMES } from '../../integration/integration.constants';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';
import { DhaApiError } from '../../integration/dha/dha.types';
import { DhaAccessTokenService } from '../../integration/dha/dha-access-token.service';
import type {
  TerminologyConceptQuery,
  TerminologyPaginatedResponse,
  TerminologyConcept,
} from '../terminology.types';

@Injectable()
export class TerminologyHttpClient {
  constructor(
    private readonly http: IntegrationHttpClient,
    private readonly config: IntegrationConfigService,
    private readonly logger: IntegrationLoggerService,
    private readonly tokens: DhaAccessTokenService,
  ) {}

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    let token = await this.tokens.getToken();

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
          this.tokens.invalidate();
          token = await this.tokens.getToken();
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
