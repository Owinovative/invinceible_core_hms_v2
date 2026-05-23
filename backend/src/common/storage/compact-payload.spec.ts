import {
  sanitizeForCompactStorage,
  serializeMaybeJsonCompact,
} from './compact-payload';

describe('compact-payload', () => {
  it('redacts secrets and masks phone-like values', () => {
    const compacted = sanitizeForCompactStorage({
      authorization: 'Bearer test-token',
      consumerSecret: 'daraja-secret',
      phoneNumber: '+254712345678',
      nested: {
        databaseUrl: 'postgresql://user:pass@example/db',
      },
    });

    expect(compacted).toEqual({
      authorization: '[redacted]',
      consumerSecret: '[redacted]',
      phoneNumber: '254***78',
      nested: {
        databaseUrl: '[redacted]',
      },
    });
  });

  it('truncates large serialized payloads', () => {
    const serialized = serializeMaybeJsonCompact(
      {
        message: 'x'.repeat(500),
        items: Array.from({ length: 20 }, (_, index) => ({ index })),
      },
      {
        maxBytes: 120,
        maxStringLength: 100,
        maxArrayItems: 5,
      },
    );

    expect(serialized).toContain('[truncated');
  });
});
