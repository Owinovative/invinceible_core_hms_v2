import { SensitiveDataCipherService } from './sensitive-data-cipher.service';

function service(environment = 'test') {
  const values = {
    NODE_ENV: environment,
    DATA_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString('base64'),
  };
  return new SensitiveDataCipherService({
    get: (key: keyof typeof values) => values[key],
  } as never);
}

describe('SensitiveDataCipherService', () => {
  it('encrypts with authenticated encryption and decrypts the value', () => {
    const cipher = service();
    const encrypted = cipher.encrypt('consent-token-secret');

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain('consent-token-secret');
    expect(cipher.decrypt(encrypted)).toBe('consent-token-secret');
  });

  it('rejects modified ciphertext', () => {
    const cipher = service();
    const encrypted = cipher.encrypt('secret');
    const parts = encrypted.split(':');
    parts[4] = `${parts[4][0] === 'A' ? 'B' : 'A'}${parts[4].slice(1)}`;
    expect(() => cipher.decrypt(parts.join(':'))).toThrow();
  });

  it('blocks legacy plaintext in production', () => {
    expect(() => service('production').decrypt('legacy-token')).toThrow(
      'Legacy plaintext sensitive data is blocked',
    );
  });
});
