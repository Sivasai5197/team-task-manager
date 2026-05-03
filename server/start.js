import { spawnSync } from 'child_process';

// Ensure DB
process.env.DATABASE_URL ||= 'file:./dev.db';

try {
  // Create DB
  spawnSync('npx', ['prisma', 'db', 'push'], { stdio: 'inherit' });

  // Seed demo users
  const { seedDemoWorkspace } = await import('./seed.js');
  await seedDemoWorkspace();

  // Start server
  await import('./index.js');

} catch (error) {
  console.error('Startup failed:', error);
  process.exit(1);
}