import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Create or Update the Role first
  // We use 'code' because your schema requires it as a unique identifier
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'ADMIN',
      description: 'System Administrator',
      isSystem: true,
      isActive: true,
    },
  });

  // 2. Create or Update the Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hms.com' },
    update: {},
    create: {
      email: 'admin@hms.com',
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: 'System Admin',
      isActive: true,
      canAccessAllBranchesInFacility: true,
      roleId: adminRole.id, // Links the user to the Role created above
    },
  });

  console.log('✅ Seed successful! Admin user created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });