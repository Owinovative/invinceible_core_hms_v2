import { Injectable, Logger } from '@nestjs/common';

const SECRET_KEY_PATTERN =
  /(authorization|cookie|password|pass(word)?hash|jwt|token|secret|passkey|consumersecret|consumer_secret|database_url|databaseurl|mpesa.*secret|mpesa.*passkey)/i;

function maskString(value: string) {
  if (!value) return value;
  if (value.length <= 8) return '[REDACTED]';
  return `${value.slice(0, 3)}...[REDACTED]...${value.slice(-2)}`;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[MAX_DEPTH]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (/^Bearer\s+/i.test(value)) return '[REDACTED_BEARER]';
    if (/^Basic\s+/i.test(value)) return '[REDACTED_BASIC]';
    if (/mysql:\/\/|postgres:\/\/|postgresql:\/\//i.test(value)) {
      return '[REDACTED_DATABASE_URL]';
    }
    return value.length > 2_000
      ? `${value.slice(0, 2_000)}...[TRUNCATED]`
      : value;
  }

  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (SECRET_KEY_PATTERN.test(key)) {
      output[key] =
        typeof nestedValue === 'string'
          ? maskString(nestedValue)
          : '[REDACTED]';
      continue;
    }

    output[key] = sanitizeValue(nestedValue, depth + 1);
  }

  return output;
}

@Injectable()
export class SafeLoggerService {
  private readonly logger = new Logger('HMS');

  sanitize(value: unknown) {
    return sanitizeValue(value);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.logger.log(this.format(message, context));
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.logger.warn(this.format(message, context));
  }

  error(message: string, context?: Record<string, unknown>, trace?: string) {
    this.logger.error(this.format(message, context), trace);
  }

  debug(message: string, context?: Record<string, unknown>) {
    if ((process.env.LOG_LEVEL || 'info').toLowerCase() === 'debug') {
      this.logger.debug(this.format(message, context));
    }
  }

  private format(message: string, context?: Record<string, unknown>) {
    if (!context || Object.keys(context).length === 0) return message;
    return `${message} ${JSON.stringify(this.sanitize(context))}`;
  }
}
