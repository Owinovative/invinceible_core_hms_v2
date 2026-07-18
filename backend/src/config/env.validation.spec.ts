import { validateEnvironment } from './env.validation';

const base = {
  NODE_ENV: 'test',
  DATABASE_URL: 'mysql://user:password@localhost:3306/hms',
  JWT_SECRET: 'test-secret-that-is-longer-than-thirty-two-characters',
};

const liveDha = {
  ...base,
  DHA_ENABLED: 'true',
  DHA_MODE: 'sandbox',
  DHA_BASE_URL: 'https://ilm-dev.dha.go.ke/uat-middleware/api/v1',
  DHA_TOKEN_URL: 'https://ilm-dev.dha.go.ke/uat-middleware/api/v1/hie-auth',
  DHA_USERNAME: 'uat-user',
  DHA_PASSWORD: 'uat-password',
  DHA_CONSUMER_KEY: 'uat-consumer-key',
  DHA_AGENT_ID: 'uat-agent',
  DHA_CALLBACK_USERNAME: 'callback-user',
  DHA_CALLBACK_PASSWORD: 'callback-password',
  DHA_FACILITY_ID: 'FID-TEST-001',
  DHA_FACILITY_ID_TYPE: 'fr-code',
  DHA_SPEC_VERSION: 'uat-2026-07',
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
};

describe('validateEnvironment DHA production gates', () => {
  it('accepts a complete HTTPS sandbox configuration', () => {
    expect(validateEnvironment(liveDha)).toEqual(
      expect.objectContaining({
        DHA_MODE: 'sandbox',
        DHA_FACILITY_ID_TYPE: 'fr-code',
      }),
    );
  });

  it('accepts the legacy DHA_AGENT name while normalizing it', () => {
    const legacyAgent = { ...liveDha, DHA_AGENT: liveDha.DHA_AGENT_ID };
    delete (legacyAgent as Partial<typeof liveDha>).DHA_AGENT_ID;
    expect(validateEnvironment(legacyAgent)).toEqual(
      expect.objectContaining({ DHA_AGENT_ID: 'uat-agent' }),
    );
  });

  it('normalizes DHA_MODE=uat to the live sandbox adapter', () => {
    expect(validateEnvironment({ ...liveDha, DHA_MODE: 'uat' })).toEqual(
      expect.objectContaining({ DHA_MODE: 'sandbox' }),
    );
  });

  it('rejects the legacy facility code configuration', () => {
    const legacy: Record<string, unknown> = { ...liveDha };
    delete legacy.DHA_FACILITY_ID;
    expect(() =>
      validateEnvironment({ ...legacy, DHA_FACILITY_CODE: 'KMHFL-1' }),
    ).toThrow('DHA_FACILITY_ID');
  });

  it('rejects non-HTTPS live endpoints', () => {
    expect(() =>
      validateEnvironment({ ...liveDha, DHA_BASE_URL: 'http://dha.local' }),
    ).toThrow('DHA_BASE_URL must use HTTPS');
  });

  it('blocks production without formal activation evidence', () => {
    expect(() =>
      validateEnvironment({ ...liveDha, DHA_MODE: 'production' }),
    ).toThrow('DHA production requires');
  });

  it('accepts production only after the explicit certification gate', () => {
    expect(
      validateEnvironment({
        ...liveDha,
        NODE_ENV: 'production',
        JWT_SECRET:
          'production-test-secret-that-is-longer-than-forty-eight-characters',
        FRONTEND_URL: 'https://hms.example.org',
        DHA_MODE: 'production',
        DHA_PRODUCTION_ACTIVATION_APPROVED: 'true',
        DHA_CERTIFICATION_REFERENCE: 'DHA-CERT-TEST-001',
      }),
    ).toEqual(expect.objectContaining({ DHA_MODE: 'production' }));
  });
});
