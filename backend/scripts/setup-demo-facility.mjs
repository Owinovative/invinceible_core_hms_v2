import { existsSync } from 'node:fs';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env');
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required in backend/.env.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to create demonstration data in production.');
  process.exit(1);
}

const administratorUsername =
  process.argv[2]?.trim() || process.env.DEMO_ADMIN_USERNAME?.trim();

if (!administratorUsername) {
  console.error(
    'Administrator username is required. Run: npm run demo:setup-facility -- <username>',
  );
  process.exit(1);
}

const facilityCode =
  process.env.DEMO_FACILITY_CODE?.trim() || 'HMS-DEMO-FACILITY';
const branchCode = process.env.DEMO_BRANCH_CODE?.trim() || 'HMS-DEMO-MAIN';
const facilityName =
  process.env.DEMO_FACILITY_NAME?.trim() ||
  'Invinceible Demonstration Hospital';
const branchName =
  process.env.DEMO_BRANCH_NAME?.trim() || 'Demonstration Main Branch';

const prisma = new PrismaClient();

async function main() {
  const administrator = await prisma.user.findUnique({
    where: { username: administratorUsername },
    select: {
      id: true,
      isActive: true,
      role: { select: { code: true } },
    },
  });

  if (!administrator) {
    throw new Error('The supplied administrator account was not found.');
  }

  if (!administrator.isActive) {
    throw new Error('The supplied administrator account is inactive.');
  }

  if (
    !['SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN'].includes(
      administrator.role.code,
    )
  ) {
    throw new Error('The supplied account is not an administrator.');
  }

  await prisma.$transaction(async (tx) => {
    const facility = await tx.facility.upsert({
      where: { code: facilityCode },
      update: { isActive: true },
      create: {
        code: facilityCode,
        branchCode: `${branchCode}-HQ`,
        name: facilityName,
        facilityType: 'Demonstration Hospital',
        county: 'Nairobi',
        town: 'Nairobi',
        country: 'Kenya',
        address: 'Synthetic demonstration location',
        latitude: -1.286389,
        longitude: 36.817223,
        mapLocationLabel: 'Demonstration location — not a registered facility',
        timezone: 'Africa/Nairobi',
        currency: 'KES',
        mpesaEnabled: false,
        showCashOnInvoice: true,
        showPaybillOnInvoice: false,
        showTillOnInvoice: false,
        showPochiOnInvoice: false,
        dhaFacilityId: null,
        dhaRegistryStatus: 'NOT_ONBOARDED',
        subscriptionStatus: 'ACTIVE',
        complianceStatus: 'COMPLIANT',
        isDefault: false,
        isActive: true,
      },
      select: { id: true, code: true, name: true },
    });

    const existingBranch = await tx.branch.findUnique({
      where: { code: branchCode },
      select: { id: true, facilityId: true },
    });

    if (existingBranch && existingBranch.facilityId !== facility.id) {
      throw new Error(
        'The demonstration branch code is already used by another facility.',
      );
    }

    const branch = await tx.branch.upsert({
      where: { code: branchCode },
      update: { isActive: true },
      create: {
        code: branchCode,
        name: branchName,
        facilityId: facility.id,
        county: 'Nairobi',
        town: 'Nairobi',
        country: 'Kenya',
        address: 'Synthetic demonstration location',
        latitude: -1.286389,
        longitude: 36.817223,
        mapLocationLabel: 'Demonstration location — not a registered branch',
        timezone: 'Africa/Nairobi',
        currency: 'KES',
        isDefault: true,
        isActive: true,
      },
      select: { id: true, code: true, name: true },
    });

    await tx.user.update({
      where: { id: administrator.id },
      data: {
        homeFacilityId: facility.id,
        homeBranchId: branch.id,
        canAccessAllBranchesInFacility: true,
      },
    });

    await tx.userBranchAccess.upsert({
      where: {
        userId_branchId: {
          userId: administrator.id,
          branchId: branch.id,
        },
      },
      update: {
        facilityId: facility.id,
        isActive: true,
      },
      create: {
        userId: administrator.id,
        facilityId: facility.id,
        branchId: branch.id,
        isActive: true,
      },
    });
  });

  console.log('Demonstration facility setup completed.');
  console.log('Facility: Invinceible Demonstration Hospital');
  console.log('Branch: Demonstration Main Branch');
  console.log('DHA status: NOT_ONBOARDED (mock mode only)');
  console.log('Sign out and sign in again before registering a patient.');
}

main()
  .catch(() => {
    console.error(
      'Demonstration facility setup failed. Verify the username, database connection, and existing demo codes.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
