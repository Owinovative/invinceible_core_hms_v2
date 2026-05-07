import { BadRequestException } from '@nestjs/common';
import { assertStrongPassword } from './password-policy';

describe('assertStrongPassword', () => {
  it('accepts a strong password', () => {
    expect(() =>
      assertStrongPassword('SafeHospital#2026', {
        username: 'cashier',
        fullName: 'Cashier User',
      }),
    ).not.toThrow();
  });

  it('rejects short and common passwords', () => {
    expect(() => assertStrongPassword('password123')).toThrow(
      BadRequestException,
    );
  });

  it('rejects passwords containing the username', () => {
    expect(() =>
      assertStrongPassword('Cashier#2026', { username: 'cashier' }),
    ).toThrow(BadRequestException);
  });
});
