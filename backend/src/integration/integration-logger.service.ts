import { Injectable } from '@nestjs/common';
import { SafeLoggerService } from '../resilience/safe-logger.service';
import type { ApiCallLogEntry } from './integration.types';

/**
 * Structured logging for the integration layer. Every external API
 * interaction is logged with timestamp, endpoint, request id, response code,
 * latency, retry count, and correlation id. Delegates to SafeLoggerService so
 * secret redaction always applies.
 */
@Injectable()
export class IntegrationLoggerService {
  constructor(private readonly logger: SafeLoggerService) {}

  apiCall(entry: ApiCallLogEntry) {
    const context = {
      timestamp: new Date().toISOString(),
      integration: entry.integration,
      endpoint: entry.endpoint,
      method: entry.method,
      requestId: entry.requestId,
      correlationId: entry.correlationId,
      responseCode: entry.httpStatus,
      latencyMs: entry.latencyMs,
      retryCount: entry.retryCount,
      outcome: entry.outcome,
      error: entry.errorMessage,
    };

    if (entry.outcome === 'SUCCESS') {
      this.logger.info('Integration API call', context);
    } else {
      this.logger.warn('Integration API call failed', context);
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    this.logger.info(`[integration] ${message}`, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.logger.warn(`[integration] ${message}`, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.logger.error(`[integration] ${message}`, context);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.logger.debug(`[integration] ${message}`, context);
  }
}
