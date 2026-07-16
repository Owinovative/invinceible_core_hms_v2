import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const provider = (process.env.DATABASE_PROVIDER || '').trim().toLowerCase();
const databaseUrl = (process.env.DATABASE_URL || '').trim().toLowerCase();
const isPostgres =
  provider === 'postgres' ||
  provider === 'postgresql' ||
  databaseUrl.startsWith('postgres://') ||
  databaseUrl.startsWith('postgresql://');

const backendRoot = resolve(import.meta.dirname, '..');

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (isPostgres) {
  run([resolve(backendRoot, 'scripts/create-postgres-prisma-schema.mjs')]);
}

const schema = isPostgres
  ? 'prisma-postgresql/schema.prisma'
  : 'prisma/schema.prisma';

console.log(`Generating Prisma client for ${isPostgres ? 'PostgreSQL' : 'MySQL'}...`);
run([
  resolve(backendRoot, 'node_modules/prisma/build/index.js'),
  'generate',
  '--schema',
  schema,
]);
