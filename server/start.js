import { spawnSync } from 'child_process';

// Ensure DATABASE_URL exists
process.env.DATABASE_URL ||= 'file:./dev.db';

try {
  // Run Prisma DB push at runtime (correct place)
  const result = spawnSync('npx', ['prisma', 'db', 'push'], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error('Prisma db push failed');
  }

  // Start server
  await import('./index.js');

} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}