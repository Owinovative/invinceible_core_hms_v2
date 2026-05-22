import { PrismaClient } from '@prisma/client';

const dryRun = process.argv.includes('--dry-run');

const criticalModels = [
  ['facilities', 'facility'],
  ['branches', 'branch'],
  ['roles', 'role'],
  ['users', 'user'],
  ['staff_members', 'staff'],
  ['patients', 'patient'],
  ['appointments', 'appointment'],
  ['consultations', 'consultation'],
  ['lab_orders', 'labOrder'],
  ['prescriptions', 'prescription'],
  ['branch_medicine_stocks', 'branchMedicineStock'],
  ['invoices', 'invoice'],
  ['payments', 'payment'],
  ['sha_claims', 'shaClaim'],
  ['audit_logs', 'auditLog'],
  ['notifications', 'notification'],
];

if (dryRun) {
  console.log('Critical data validation dry run.');
  console.log('The script will count these Prisma models without printing row data:');
  for (const [tableName, modelName] of criticalModels) {
    console.log(`- ${tableName} via prisma.${modelName}.count()`);
  }
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. The value is never printed.');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  console.log('Validating critical HMS table counts. No patient data is printed.');
  const counts = {};

  for (const [tableName, modelName] of criticalModels) {
    const delegate = prisma[modelName];
    if (!delegate || typeof delegate.count !== 'function') {
      throw new Error(`Prisma model delegate is missing: ${modelName}`);
    }
    counts[tableName] = await delegate.count();
  }

  for (const [tableName, count] of Object.entries(counts)) {
    console.log(`${tableName}: ${count}`);
  }

  console.log('Critical table count validation completed.');
} finally {
  await prisma.$disconnect();
}
