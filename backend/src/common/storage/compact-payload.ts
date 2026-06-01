const SECRET_KEY_PATTERN =
  /(authorization|cookie|password|pass(word)?hash|jwt|token|secret|passkey|consumersecret|consumer_secret|database_url|databaseurl|apikey|api_key|mpesa.*secret|mpesa.*passkey)/i;

const PHONE_KEY_PATTERN = /(phone|msisdn|mobile|customerphone|phonenumber)/i;

export type CompactPayloadOptions = {
  maxBytes?: number;
  maxStringLength?: number;
  maxArrayItems?: number;
  maxDepth?: number;
};

const DEFAULT_OPTIONS: Required<CompactPayloadOptions> = {
  maxBytes: 6_000,
  maxStringLength: 1_000,
  maxArrayItems: 25,
  maxDepth: 5,
};

export function compactText(value: unknown, maxLength = 500) {
  if (value === null || value === undefined) return undefined;
  const text = String(value);
  return text.length > maxLength
    ? `${text.slice(0, maxLength)}...[truncated:${text.length}]`
    : text;
}

function maskIdentifier(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 9) {
    return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
  }
  if (value.length <= 6) return '[masked]';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function sanitizeValue(
  value: unknown,
  key: string | undefined,
  options: Required<CompactPayloadOptions>,
  depth: number,
): unknown {
  if (depth > options.maxDepth) return '[max-depth]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (key && SECRET_KEY_PATTERN.test(key)) return '[redacted]';
    if (/^Bearer\s+/i.test(value)) return '[redacted-bearer]';
    if (/^Basic\s+/i.test(value)) return '[redacted-basic]';
    if (/mysql:\/\/|postgres:\/\/|postgresql:\/\//i.test(value)) {
      return '[redacted-database-url]';
    }
    if (key && PHONE_KEY_PATTERN.test(key)) return maskIdentifier(value);
    return compactText(value, options.maxStringLength);
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const trimmed = value
      .slice(0, options.maxArrayItems)
      .map((item) => sanitizeValue(item, undefined, options, depth + 1));
    if (value.length > options.maxArrayItems) {
      trimmed.push(`[truncated-items:${value.length - options.maxArrayItems}]`);
    }
    return trimmed;
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      output[childKey] = SECRET_KEY_PATTERN.test(childKey)
        ? '[redacted]'
        : sanitizeValue(childValue, childKey, options, depth + 1);
    }
    return output;
  }

  return String(value);
}

export function sanitizeForCompactStorage(
  value: unknown,
  options?: CompactPayloadOptions,
) {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  return sanitizeValue(value, undefined, merged, 0);
}

export function serializeCompactForStorage(
  value: unknown,
  options?: CompactPayloadOptions,
) {
  const merged = { ...DEFAULT_OPTIONS, ...options };

  try {
    const sanitized = sanitizeForCompactStorage(value, merged);
    const serialized =
      typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);

    if (serialized.length <= merged.maxBytes) {
      return serialized;
    }

    return `${serialized.slice(0, merged.maxBytes)}...[truncated-bytes:${serialized.length}]`;
  } catch {
    return undefined;
  }
}

export function serializeMaybeJsonCompact(
  value: unknown,
  options?: CompactPayloadOptions,
) {
  if (typeof value === 'string') {
    try {
      return serializeCompactForStorage(JSON.parse(value), options);
    } catch {
      return serializeCompactForStorage(value, options);
    }
  }

  return serializeCompactForStorage(value, options);
}
