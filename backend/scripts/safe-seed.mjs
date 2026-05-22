import { spawnSync } from 'node:child_process';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run seed in production.');
  console.error('Use controlled migration/import tooling for production data.');
  process.exit(1);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['prisma', 'db', 'seed'], {
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
