import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1';

@Injectable()
export class SensitiveDataCipherService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: string): string {
    const key = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      PREFIX,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  }

  decrypt(value: string): string {
    if (!value.startsWith(`${PREFIX}:`)) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new Error(
          'Legacy plaintext sensitive data is blocked in production; re-authorize consent',
        );
      }
      return value;
    }

    const [, , ivValue, tagValue, ciphertextValue] = value.split(':');
    if (!ivValue || !tagValue || !ciphertextValue) {
      throw new Error('Encrypted sensitive value has an invalid format');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private key(): Buffer {
    const encoded = this.config.get<string>('DATA_ENCRYPTION_KEY')?.trim();
    const key = encoded ? Buffer.from(encoded, 'base64') : Buffer.alloc(0);
    if (key.length !== 32) {
      throw new Error(
        'DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
      );
    }
    return key;
  }
}
