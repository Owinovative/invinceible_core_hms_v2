import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IntegrationAuditService } from '../integration-audit.service';
import { IntegrationLoggerService } from '../integration-logger.service';
import type {
  ApiCallOutcome,
  IntegrationHttpRequest,
  IntegrationHttpResponse,
} from '../integration.types';
import {
  IntegrationHttpError,
  computeBackoffDelayMs,
  isRetryableHttpStatus,
  toErrorMessage,
} from './retry-policy';

const TRANSPORT_RETRY_BASE_DELAY_MS = 300;
const TRANSPORT_RETRY_MAX_DELAY_MS = 5_000;

/**
 * Shared resilient HTTP client for all government integrations.
 * Responsibilities: timeouts, transport-level retries with exponential
 * backoff, structured logging, and a persisted audit row per attempt.
 * Headers and bodies are never logged; only endpoint paths and metadata are.
 */
@Injectable()
export class IntegrationHttpClient {
  constructor(
    private readonly logger: IntegrationLoggerService,
    private readonly audit: IntegrationAuditService,
  ) {}

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
  }

  private buildUrl(request: IntegrationHttpRequest): string {
    const base = request.baseUrl.replace(/\/+$/, '');
    const path = request.path.startsWith('/')
      ? request.path
      : `/${request.path}`;
    const url = new URL(`${base}${path}`);
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async request<T = unknown>(
    request: IntegrationHttpRequest,
  ): Promise<IntegrationHttpResponse<T>> {
    const requestId = randomUUID();
    const maxAttempts = Math.max(1, request.maxAttempts ?? 1);
    const timeoutMs = request.timeoutMs ?? 15_000;
    const url = this.buildUrl(request);
    let lastError: IntegrationHttpError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const retryCount = attempt - 1;
      const startedAt = Date.now();
      let outcome: ApiCallOutcome = 'NETWORK_ERROR';
      let httpStatus: number | undefined;
      let errorMessage: string | undefined;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;
        try {
          response = await fetch(url, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Request-Id': requestId,
              ...(request.correlationId
                ? { 'X-Correlation-Id': request.correlationId }
                : {}),
              ...request.headers,
            },
            body:
              request.body === undefined
                ? undefined
                : typeof request.body === 'string'
                  ? request.body
                  : JSON.stringify(request.body),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        httpStatus = response.status;
        const data = (await this.parseBody(response)) as T;

        if (!response.ok) {
          outcome = 'HTTP_ERROR';
          errorMessage = `HTTP ${response.status} from ${request.integration}`;
          throw new IntegrationHttpError(
            errorMessage,
            'HTTP_ERROR',
            response.status,
            data,
          );
        }

        outcome = 'SUCCESS';
        return {
          status: response.status,
          data,
          requestId,
          latencyMs: Date.now() - startedAt,
          retryCount,
        };
      } catch (error) {
        if (error instanceof IntegrationHttpError) {
          lastError = error;
        } else if ((error as Error)?.name === 'AbortError') {
          outcome = 'TIMEOUT';
          errorMessage = `Request timed out after ${timeoutMs}ms`;
          lastError = new IntegrationHttpError(errorMessage, 'TIMEOUT');
        } else {
          outcome = 'NETWORK_ERROR';
          errorMessage = toErrorMessage(error);
          lastError = new IntegrationHttpError(errorMessage, 'NETWORK_ERROR');
        }
        errorMessage = lastError.message;

        const retryable = lastError.retryable && attempt < maxAttempts;
        if (retryable) {
          const delay = computeBackoffDelayMs(attempt, {
            baseDelayMs: TRANSPORT_RETRY_BASE_DELAY_MS,
            maxDelayMs: TRANSPORT_RETRY_MAX_DELAY_MS,
          });
          this.logger.debug('Retrying integration request', {
            integration: request.integration,
            endpoint: request.path,
            requestId,
            attempt,
            delayMs: delay,
          });
          await this.recordAttempt(
            request,
            requestId,
            outcome,
            httpStatus,
            Date.now() - startedAt,
            retryCount,
            errorMessage,
          );
          await this.sleep(delay);
          continue;
        }

        await this.recordAttempt(
          request,
          requestId,
          outcome,
          httpStatus,
          Date.now() - startedAt,
          retryCount,
          errorMessage,
        );
        throw lastError;
      } finally {
        if (outcome === 'SUCCESS') {
          await this.recordAttempt(
            request,
            requestId,
            outcome,
            httpStatus,
            Date.now() - startedAt,
            retryCount,
          );
        }
      }
    }

    // Unreachable: the loop either returns or throws, but satisfy TS.
    throw (
      lastError ??
      new IntegrationHttpError('Integration request failed', 'NETWORK_ERROR')
    );
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text().catch(() => '');
    if (!text) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private async recordAttempt(
    request: IntegrationHttpRequest,
    requestId: string,
    outcome: ApiCallOutcome,
    httpStatus: number | undefined,
    latencyMs: number,
    retryCount: number,
    errorMessage?: string,
  ): Promise<void> {
    const entry = {
      integration: request.integration,
      endpoint: request.path,
      method: request.method,
      requestId,
      correlationId: request.correlationId,
      httpStatus,
      outcome,
      latencyMs,
      retryCount,
      errorMessage,
      facilityId: request.facilityId,
    };
    this.logger.apiCall(entry);
    await this.audit.recordApiCall(entry);
  }
}

export { IntegrationHttpError, isRetryableHttpStatus };
