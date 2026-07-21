import { existsSync } from 'node:fs';
import process from 'node:process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env');
}

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is required. Add it to backend/.env or export it.',
  );
  process.exit(1);
}

if (
  process.env.NODE_ENV === 'production' &&
  process.env.ALLOW_SUPER_ADMIN_BOOTSTRAP !== 'true'
) {
  console.error(
    'Refusing to bootstrap a production super admin without ALLOW_SUPER_ADMIN_BOOTSTRAP=true.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const username = process.env.SUPER_ADMIN_USERNAME?.trim() || 'superadmin';
const email = process.env.SUPER_ADMIN_EMAIL?.trim() || 'superadmin@localhost';
const fullName =
  process.env.SUPER_ADMIN_FULL_NAME?.trim() || 'System Super Administrator';
const password = process.env.SUPER_ADMIN_PASSWORD;

function validatePassword(value) {
  const failures = [];
  if (value.length < 12) failures.push('at least 12 characters');
  if (!/[a-z]/.test(value)) failures.push('one lowercase letter');
  if (!/[A-Z]/.test(value)) failures.push('one uppercase letter');
  if (!/\d/.test(value)) failures.push('one number');
  if (!/[^A-Za-z0-9]/.test(value)) failures.push('one symbol');

  if (failures.length) {
    throw new Error(
      `SUPER_ADMIN_PASSWORD must contain ${failures.join(', ')}.`,
    );
  }
}

async function main() {
  if (!password) {
    throw new Error('SUPER_ADMIN_PASSWORD is required.');
  }

  validatePassword(password);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });

  if (existing) {
    throw new Error('A user already exists for the supplied account details.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const role = await tx.role.upsert({
      where: { code: 'SUPER_ADMIN' },
      update: {
        name: 'Super Administrator',
        description: 'Platform-wide system administrator',
        isSystem: true,
        isActive: true,
      },
      create: {
        code: 'SUPER_ADMIN',
        name: 'Super Administrator',
        description: 'Platform-wide system administrator',
        isSystem: true,
        isActive: true,
      },
    });

    return tx.user.create({
      data: {
        username,
        email,
        fullName,
        passwordHash,
        roleId: role.id,
        isActive: true,
        canAccessAllBranchesInFacility: true,
      },
      select: { id: true },
    });
  });

  console.log('Super admin account created successfully.');
  console.log(`User ID: ${user.id}`);
}

main()
  .catch(() => {
    console.error(
      'Super admin creation failed. Verify the configuration and database state; no sensitive details were logged.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
