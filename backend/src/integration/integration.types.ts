import type { IntegrationName } from './integration.constants';

export type ApiCallOutcome =
  | 'SUCCESS'
  | 'HTTP_ERROR'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface IntegrationCallContext {
  correlationId?: string;
  facilityId?: number;
  branchId?: number;
}

export interface IntegrationHttpRequest {
  integration: IntegrationName;
  baseUrl: string;
  path: string;
  method: HttpMethod;
  /** Header values may contain secrets; they are never logged or persisted. */
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  timeoutMs?: number;
  /** Transport-level attempts (1 = no retry). Queue-level retries stack on top. */
  maxAttempts?: number;
  correlationId?: string;
  facilityId?: number;
}

export interface IntegrationHttpResponse<T = unknown> {
  status: number;
  data: T;
  requestId: string;
  latencyMs: number;
  retryCount: number;
}

export interface OutboundQueueItem {
  id: number;
  integration: string;
  operation: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  correlationId: string | null;
  idempotencyKey: string;
  facilityId: number | null;
  branchId: number | null;
}

export type OutboundQueueHandler = (item: OutboundQueueItem) => Promise<void>;

export interface ApiCallLogEntry {
  integration: IntegrationName;
  endpoint: string;
  method: HttpMethod;
  requestId: string;
  correlationId?: string;
  httpStatus?: number;
  outcome: ApiCallOutcome;
  latencyMs: number;
  retryCount: number;
  errorMessage?: string;
  facilityId?: number;
}

/** Marks an error the retry queue must not retry (validation, duplicates). */
export class NonRetryableIntegrationError extends Error {
  readonly retryable = false as const;

  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'NonRetryableIntegrationError';
  }
}

export function isNonRetryableError(error: unknown): boolean {
  return (
    error instanceof NonRetryableIntegrationError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { retryable?: unknown }).retryable === false)
  );
}
