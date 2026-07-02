import {
  IntegrationHttpError,
  computeBackoffDelayMs,
  isRetryableHttpStatus,
  toErrorMessage,
} from './retry-policy';

describe('computeBackoffDelayMs', () => {
  const options = { baseDelayMs: 1000, maxDelayMs: 60_000, jitterRatio: 0 };

  it('grows exponentially with the attempt number', () => {
    expect(computeBackoffDelayMs(1, options)).toBe(1000);
    expect(computeBackoffDelayMs(2, options)).toBe(2000);
    expect(computeBackoffDelayMs(3, options)).toBe(4000);
    expect(computeBackoffDelayMs(4, options)).toBe(8000);
  });

  it('caps the delay at maxDelayMs', () => {
    expect(computeBackoffDelayMs(10, options)).toBe(60_000);
    expect(computeBackoffDelayMs(50, options)).toBe(60_000);
  });

  it('treats attempts below one as the first attempt', () => {
    expect(computeBackoffDelayMs(0, options)).toBe(1000);
    expect(computeBackoffDelayMs(-3, options)).toBe(1000);
  });

  it('keeps jitter within the configured ratio', () => {
    for (let index = 0; index < 200; index += 1) {
      const delay = computeBackoffDelayMs(2, {
        baseDelayMs: 1000,
        maxDelayMs: 60_000,
        jitterRatio: 0.2,
      });
      expect(delay).toBeGreaterThanOrEqual(1600);
      expect(delay).toBeLessThanOrEqual(2400);
    }
  });

  it('never returns a negative delay', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(
        computeBackoffDelayMs(1, {
          baseDelayMs: 1,
          maxDelayMs: 2,
          jitterRatio: 1,
        }),
      ).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('isRetryableHttpStatus', () => {
  it('retries server errors and transient client statuses', () => {
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(408)).toBe(true);
    expect(isRetryableHttpStatus(425)).toBe(true);
    expect(isRetryableHttpStatus(429)).toBe(true);
  });

  it('does not retry ordinary client errors or success codes', () => {
    expect(isRetryableHttpStatus(200)).toBe(false);
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(401)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(409)).toBe(false);
  });
});

describe('IntegrationHttpError', () => {
  it('marks timeouts and network errors retryable', () => {
    expect(new IntegrationHttpError('t', 'TIMEOUT').retryable).toBe(true);
    expect(new IntegrationHttpError('n', 'NETWORK_ERROR').retryable).toBe(true);
  });

  it('derives retryability from the HTTP status', () => {
    expect(new IntegrationHttpError('e', 'HTTP_ERROR', 503).retryable).toBe(
      true,
    );
    expect(new IntegrationHttpError('e', 'HTTP_ERROR', 400).retryable).toBe(
      false,
    );
    expect(new IntegrationHttpError('e', 'HTTP_ERROR').retryable).toBe(false);
  });
});

describe('toErrorMessage', () => {
  it('extracts messages from errors and stringifies the rest', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
    expect(toErrorMessage('plain')).toBe('plain');
    expect(toErrorMessage(42)).toBe('42');
  });
});
