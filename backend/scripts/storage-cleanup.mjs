import { withPrisma } from './storage-utils.mjs';

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const dryRun = !execute || args.has('--dry-run');
const confirmed = process.argv.includes('--confirm=COMPACT_SAFE_CLEANUP');

const days = (name, fallback) => {
  const flag = process.argv.find((item) => item.startsWith(`--${name}=`));
  const value = Number(flag?.split('=')[1] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const beforeDays = (value) =>
  new Date(Date.now() - value * 24 * 60 * 60 * 1000);

const retention = {
  revokedSessionDays: days('revoked-session-days', 30),
  notificationDays: days('notification-days', 180),
  locationEventDays: days('location-event-days', 90),
  outboxDays: days('outbox-days', 30),
};

const jobs = [
  {
    name: 'expired password reset tokens',
    model: 'passwordResetToken',
    where: () => ({ expiresAt: { lt: new Date() } }),
  },
  {
    name: 'old revoked user sessions',
    model: 'userSession',
    where: () => ({
      revokedAt: { not: null, lt: beforeDays(retention.revokedSessionDays) },
    }),
  },
  {
    name: 'old resolved read notifications',
    model: 'notification',
    where: () => ({
      isResolved: true,
      isRead: true,
      createdAt: { lt: beforeDays(retention.notificationDays) },
    }),
  },
  {
    name: 'old non-pending data outbox events',
    model: 'dataOutboxEvent',
    where: () => ({
      status: { not: 'PENDING' },
      processedAt: { not: null, lt: beforeDays(retention.outboxDays) },
    }),
  },
  {
    name: 'expired IP geolocation cache rows',
    model: 'ipGeolocationCache',
    where: () => ({ expiresAt: { not: null, lt: new Date() } }),
  },
  {
    name: 'old user location request events',
    model: 'userLocationEvent',
    where: () => ({ occurredAt: { lt: beforeDays(retention.locationEventDays) } }),
  },
];

console.log('Safe storage cleanup');
console.log(dryRun ? 'Mode: dry run' : 'Mode: execute');
console.log(
  'This script never deletes clinical, billing, payment, stock, audit, SHA claim, prescription, lab, or patient history records.',
);
console.log(
  `Retention: sessions=${retention.revokedSessionDays}d, notifications=${retention.notificationDays}d, locationEvents=${retention.locationEventDays}d, outbox=${retention.outboxDays}d`,
);

if (execute && !confirmed) {
  console.error(
    'Refusing destructive cleanup without --confirm=COMPACT_SAFE_CLEANUP.',
  );
  process.exitCode = 1;
} else {
  await withPrisma(async (prisma) => {
    const results = [];

    for (const job of jobs) {
      const delegate = prisma[job.model];
      if (!delegate) {
        results.push({ job: job.name, count: 'skipped: missing model' });
        continue;
      }

      const where = job.where();
      const count = await delegate.count({ where });

      if (execute && count > 0) {
        await delegate.deleteMany({ where });
      }

      results.push({ job: job.name, count });
    }

    const width = Math.max(...results.map((row) => row.job.length), 4);
    console.log('\nCleanup candidates');
    for (const row of results) {
      console.log(`${row.job.padEnd(width)}  ${row.count}`);
    }
  });
}
