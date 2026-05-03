import { spawnSync } from 'child_process';

process.env.DATABASE_URL ||= 'file:./dev.db';

const isWindows = process.platform === 'win32';
const dbPush = spawnSync(
  isWindows ? 'npx prisma db push' : 'npx',
  isWindows ? [] : ['prisma', 'db', 'push'],
  {
    stdio: 'inherit',
    env: process.env,
    shell: isWindows,
  },
);

if (dbPush.status !== 0) {
  process.exit(dbPush.status ?? 1);
}

const { seedDemoWorkspace } = await import('./seed.js');
await seedDemoWorkspace();

await import('./index.js');
