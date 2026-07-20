import { existsSync } from 'node:fs';
import process from 'node:process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env');
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required in backend/.env.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to create demonstration staff in production.');
  process.exit(1);
}

const password = process.env.DEMO_STAFF_PASSWORD;

class DemoSetupError extends Error {}

function validatePassword(value) {
  if (
    !value ||
    value.length < 12 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/\d/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    throw new DemoSetupError(
      'DEMO_STAFF_PASSWORD must be at least 12 characters and contain uppercase, lowercase, number, and symbol characters.',
    );
  }
}

const facilityCode =
  process.env.DEMO_FACILITY_CODE?.trim() || 'HMS-DEMO-FACILITY';
const branchCode = process.env.DEMO_BRANCH_CODE?.trim() || 'HMS-DEMO-MAIN';

const departments = [
  { code: 'DEMO-OPD', name: 'Demonstration Outpatient Department' },
  { code: 'DEMO-LAB', name: 'Demonstration Laboratory' },
  { code: 'DEMO-PHARMACY', name: 'Demonstration Pharmacy' },
  { code: 'DEMO-FINANCE', name: 'Demonstration Finance and Billing' },
  { code: 'DEMO-ADMIN', name: 'Demonstration Administration' },
];

const staffProfiles = [
  {
    username: 'demo.reception',
    email: 'reception@demo.invalid',
    staffCode: 'DEMO-REC-001',
    firstName: 'Asha',
    lastName: 'Reception',
    designation: 'Receptionist',
    roleCode: 'RECEPTIONIST',
    roleName: 'Receptionist',
    departmentCode: 'DEMO-OPD',
  },
  {
    username: 'demo.nurse',
    email: 'nurse@demo.invalid',
    staffCode: 'DEMO-NUR-001',
    firstName: 'Neema',
    lastName: 'Triage',
    designation: 'Triage Nurse',
    roleCode: 'TRIAGE_NURSE',
    roleName: 'Triage Nurse',
    departmentCode: 'DEMO-OPD',
  },
  {
    username: 'demo.doctor',
    email: 'doctor@demo.invalid',
    staffCode: 'DEMO-DOC-001',
    firstName: 'Daniel',
    lastName: 'Demo',
    designation: 'Medical Officer — Demonstration',
    roleCode: 'DOCTOR',
    roleName: 'Doctor',
    departmentCode: 'DEMO-OPD',
    isClinician: true,
    isPrescriber: true,
    clinicianRegistrationNumber: 'DEMO-KMPDC-001',
    clinicianBoard: 'DEMONSTRATION ONLY',
  },
  {
    username: 'demo.lab',
    email: 'laboratory@demo.invalid',
    staffCode: 'DEMO-LAB-001',
    firstName: 'Lilian',
    lastName: 'Laboratory',
    designation: 'Laboratory Technician',
    roleCode: 'LAB_TECHNICIAN',
    roleName: 'Laboratory Technician',
    departmentCode: 'DEMO-LAB',
  },
  {
    username: 'demo.pharmacy',
    email: 'pharmacy@demo.invalid',
    staffCode: 'DEMO-PHA-001',
    firstName: 'Peter',
    lastName: 'Pharmacy',
    designation: 'Pharmacist',
    roleCode: 'PHARMACIST',
    roleName: 'Pharmacist',
    departmentCode: 'DEMO-PHARMACY',
  },
  {
    username: 'demo.cashier',
    email: 'cashier@demo.invalid',
    staffCode: 'DEMO-CAS-001',
    firstName: 'Caroline',
    lastName: 'Cashier',
    designation: 'Cashier',
    roleCode: 'CASHIER',
    roleName: 'Cashier',
    departmentCode: 'DEMO-FINANCE',
  },
  {
    username: 'demo.facilityadmin',
    email: 'facility-admin@demo.invalid',
    staffCode: 'DEMO-ADM-001',
    firstName: 'Farida',
    lastName: 'Administrator',
    designation: 'Facility Administrator',
    roleCode: 'FACILITY_ADMIN',
    roleName: 'Facility Administrator',
    departmentCode: 'DEMO-ADMIN',
  },
];

const prisma = new PrismaClient();

async function main() {
  validatePassword(password);

  const [facility, branch] = await Promise.all([
    prisma.facility.findUnique({ where: { code: facilityCode } }),
    prisma.branch.findUnique({ where: { code: branchCode } }),
  ]);

  if (!facility || !branch || branch.facilityId !== facility.id) {
    throw new DemoSetupError(
      'The demonstration facility and branch do not exist. Run demo:setup-facility first.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const departmentByCode = new Map();

    for (const definition of departments) {
      const department = await tx.department.upsert({
        where: { code: definition.code },
        update: {
          name: definition.name,
          facilityId: facility.id,
          branchId: branch.id,
          isActive: true,
        },
        create: {
          ...definition,
          facilityId: facility.id,
          branchId: branch.id,
          isActive: true,
        },
      });
      departmentByCode.set(definition.code, department);
    }

    const outpatientDepartment = departmentByCode.get('DEMO-OPD');
    await tx.clinic.upsert({
      where: { code: 'DEMO-GENERAL-OPD' },
      update: {
        name: 'Demonstration General Outpatient Clinic',
        facilityId: facility.id,
        branchId: branch.id,
        departmentId: outpatientDepartment.id,
        isActive: true,
      },
      create: {
        code: 'DEMO-GENERAL-OPD',
        name: 'Demonstration General Outpatient Clinic',
        clinicType: 'GENERAL_OPD',
        facilityId: facility.id,
        branchId: branch.id,
        departmentId: outpatientDepartment.id,
        roomLocation: 'Demo OPD Room 1',
        consultationMinutes: 20,
        maxDailyCapacity: 40,
        serviceStartTime: '08:00',
        serviceEndTime: '17:00',
        isWalkInAllowed: true,
        isReferralRequired: false,
        isActive: true,
        notes: 'Synthetic clinic for demonstrations only.',
      },
    });

    for (const [index, profile] of staffProfiles.entries()) {
      const role = await tx.role.upsert({
        where: { code: profile.roleCode },
        update: {
          name: profile.roleName,
          isActive: true,
        },
        create: {
          code: profile.roleCode,
          name: profile.roleName,
          description: 'Synthetic demonstration role account',
          isSystem: true,
          isActive: true,
        },
      });

      const user = await tx.user.upsert({
        where: { username: profile.username },
        update: {
          email: profile.email,
          fullName: `${profile.firstName} ${profile.lastName}`,
          passwordHash,
          roleId: role.id,
          homeFacilityId: facility.id,
          homeBranchId: branch.id,
          canAccessAllBranchesInFacility: false,
          isActive: true,
          failedLoginAttempts: 0,
          lockedAt: null,
          lockReason: null,
          sessionVersion: { increment: 1 },
        },
        create: {
          username: profile.username,
          email: profile.email,
          fullName: `${profile.firstName} ${profile.lastName}`,
          passwordHash,
          roleId: role.id,
          homeFacilityId: facility.id,
          homeBranchId: branch.id,
          canAccessAllBranchesInFacility: false,
          isActive: true,
        },
      });

      const department = departmentByCode.get(profile.departmentCode);
      await tx.staff.upsert({
        where: { staffCode: profile.staffCode },
        update: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          gender: index % 2 === 0 ? 'FEMALE' : 'MALE',
          designation: profile.designation,
          nationalIdNumber: `DEMO-STAFF-ID-${String(index + 1).padStart(3, '0')}`,
          clinicianRegistrationNumber:
            profile.clinicianRegistrationNumber ?? null,
          clinicianBoard: profile.clinicianBoard ?? null,
          isClinician: profile.isClinician ?? false,
          isPrescriber: profile.isPrescriber ?? false,
          canLogin: true,
          isActive: true,
          facilityId: facility.id,
          branchId: branch.id,
          departmentId: department.id,
          roleId: role.id,
          userId: user.id,
        },
        create: {
          staffCode: profile.staffCode,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          gender: index % 2 === 0 ? 'FEMALE' : 'MALE',
          designation: profile.designation,
          nationalIdNumber: `DEMO-STAFF-ID-${String(index + 1).padStart(3, '0')}`,
          clinicianRegistrationNumber:
            profile.clinicianRegistrationNumber ?? undefined,
          clinicianBoard: profile.clinicianBoard ?? undefined,
          isClinician: profile.isClinician ?? false,
          isPrescriber: profile.isPrescriber ?? false,
          canLogin: true,
          isActive: true,
          facilityId: facility.id,
          branchId: branch.id,
          departmentId: department.id,
          roleId: role.id,
          userId: user.id,
        },
      });

      await tx.userBranchAccess.upsert({
        where: {
          userId_branchId: {
            userId: user.id,
            branchId: branch.id,
          },
        },
        update: { facilityId: facility.id, isActive: true },
        create: {
          userId: user.id,
          facilityId: facility.id,
          branchId: branch.id,
          isActive: true,
        },
      });
    }
  });

  console.log('Demonstration staff setup completed.');
  console.log('Clinic: Demonstration General Outpatient Clinic');
  console.log('Login usernames:');
  for (const profile of staffProfiles) {
    console.log(`- ${profile.username} (${profile.roleName})`);
  }
  console.log('The shared password was not printed.');
}

main()
  .catch((error) => {
    const message =
      error instanceof DemoSetupError
        ? error.message
        : 'Demonstration staff setup failed. Verify the database is running and the demo records do not conflict with existing data.';
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
