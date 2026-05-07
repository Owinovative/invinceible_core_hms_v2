import { BadRequestException } from '@nestjs/common';

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  'admin123',
  'admin1234',
  'qwerty123',
  '12345678',
  '123456789',
  'invinceible',
  'hospital123',
]);

export function assertStrongPassword(
  password: string,
  context?: {
    username?: string | null;
    fullName?: string | null;
    minLength?: number;
  },
) {
  const minLength = Math.max(8, context?.minLength ?? 12);
  const value = password ?? '';
  const lower = value.toLowerCase();
  const username = context?.username?.toLowerCase().trim();
  const fullNameParts =
    context?.fullName
      ?.toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 4) ?? [];

  const failures: string[] = [];

  if (value.length < minLength) {
    failures.push(`at least ${minLength} characters`);
  }
  if (!/[a-z]/.test(value)) {
    failures.push('one lowercase letter');
  }
  if (!/[A-Z]/.test(value)) {
    failures.push('one uppercase letter');
  }
  if (!/\d/.test(value)) {
    failures.push('one number');
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    failures.push('one symbol');
  }
  if (COMMON_PASSWORDS.has(lower)) {
    failures.push('not a common password');
  }
  if (username && lower.includes(username)) {
    failures.push('not contain the username');
  }
  if (fullNameParts.some((part) => lower.includes(part))) {
    failures.push('not contain the user name');
  }

  if (failures.length) {
    throw new BadRequestException(
      `Password is too weak. It must include ${failures.join(', ')}.`,
    );
  }
}
