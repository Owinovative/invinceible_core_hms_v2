import type { ApiCallOutcome } from '../integration.types';

export interface BackoffOptions {
  baseDelayMs: number;
  maxDelayMs: number;
  /** 0..1 — fraction of the delay randomized to avoid thundering herds. */
  jitterRatio?: number;
}

/**
 * Exponential backoff with jitter: base * 2^(attempt-1), capped at
 * maxDelayMs, then +/- jitter. `attempt` is 1-based (attempt 1 = first
 * failure already happened).
 */
export function computeBackoffDelayMs(
  attempt: number,
  options: BackoffOptions,
): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const exponential =
    options.baseDelayMs * Math.pow(2, Math.min(safeAttempt - 1, 20));
  const capped = Math.min(exponential, options.maxDelayMs);
  const jitterRatio = Math.min(Math.max(options.jitterRatio ?? 0.2, 0), 1);
  const jitter = capped * jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

/** Transient statuses worth retrying; 4xx (except 408/425/429) are not. */
export function isRetryableHttpStatus(status: number): boolean {
  if (status === 408 || status === 425 || status === 429) return true;
  return status >= 500;
}

export class IntegrationHttpError extends Error {
  constructor(
    message: string,
    readonly outcome: Exclude<ApiCallOutcome, 'SUCCESS'>,
    readonly httpStatus?: number,
    readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = 'IntegrationHttpError';
  }

  get retryable(): boolean {
    if (this.outcome === 'TIMEOUT' || this.outcome === 'NETWORK_ERROR') {
      return true;
    }
    return this.httpStatus !== undefined
      ? isRetryableHttpStatus(this.httpStatus)
      : false;
  }
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
