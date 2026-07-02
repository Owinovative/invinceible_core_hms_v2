/**
 * Shared fakes for integration-layer tests. Excluded from coverage.
 */
import { ConfigService } from '@nestjs/config';
import { SafeLoggerService } from '../../resilience/safe-logger.service';
import { IntegrationAuditService } from '../integration-audit.service';
import { IntegrationConfigService } from '../integration-config.service';
import { IntegrationLoggerService } from '../integration-logger.service';
import type { InMemoryPrisma } from './in-memory-prisma';

export const DEFAULT_TEST_ENV: Record<string, string> = {
  ETIMS_ENABLED: 'true',
  ETIMS_MODE: 'mock',
  ETIMS_TIN: 'P051234567X',
  ETIMS_BHF_ID: '00',
  ETIMS_CMC_KEY: 'test-cmc-key',
  ETIMS_DEVICE_SERIAL: 'DEV001',
  ETIMS_BASE_URL: 'https://etims-api-sbx.kra.go.ke/etims-api',
  ETIMS_MAX_ATTEMPTS: '3',
  DHA_ENABLED: 'true',
  DHA_MODE: 'mock',
  DHA_BASE_URL: 'https://api.dha.go.ke',
  DHA_TOKEN_URL: 'https://auth.dha.go.ke/oauth2/token',
  DHA_CLIENT_ID: 'test-client',
  DHA_CLIENT_SECRET: 'test-secret',
  DHA_API_VERSION: 'v1',
  DHA_FACILITY_CODE: 'KMHFL-001',
  DHA_MAX_ATTEMPTS: '3',
  INTEGRATION_WORKER_ENABLED: 'false',
  INTEGRATION_RETRY_BASE_DELAY_MS: '1000',
  INTEGRATION_RETRY_MAX_DELAY_MS: '60000',
  INTEGRATION_QUEUE_BATCH_SIZE: '10',
};

export function makeConfig(
  overrides: Record<string, string> = {},
): IntegrationConfigService {
  const env = { ...DEFAULT_TEST_ENV, ...overrides };
  const configService = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new IntegrationConfigService(configService);
}

export function makeLogger(): IntegrationLoggerService {
  return new IntegrationLoggerService(new SafeLoggerService());
}

/** Audit service backed by the in-memory prisma; audit-log writes are no-ops. */
export function makeAudit(prisma: InMemoryPrisma): IntegrationAuditService {
  const auditLogService = {
    create: jest.fn().mockResolvedValue(undefined),
  };
  return new IntegrationAuditService(
    prisma as any,
    auditLogService as any,
    makeLogger(),
  );
}

/** fetch stub helpers ------------------------------------------------------ */

export interface FetchCall {
  url: string;
  init: RequestInit & { headers?: Record<string, string> };
}

export function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

export function textResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

export function installFetchMock(responses: Array<Response | Error>): {
  calls: FetchCall[];
  restore: () => void;
} {
  const calls: FetchCall[] = [];
  const original = global.fetch;
  let index = 0;
  global.fetch = jest.fn((url: any, init: any) => {
    calls.push({ url: String(url), init });
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next);
  }) as unknown as typeof fetch;
  return {
    calls,
    restore: () => {
      global.fetch = original;
    },
  };
}

export function abortError(): Error {
  const error = new Error('This operation was aborted');
  error.name = 'AbortError';
  return error;
}
