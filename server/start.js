// server/start.js

process.env.DATABASE_URL ||= 'file:./dev.db';

try {
  await import('./index.js');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}