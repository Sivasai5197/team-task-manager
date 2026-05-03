import { spawn } from 'child_process';

const commands = [
  ['server', 'npm', ['run', 'dev:server']],
  ['client', 'npm', ['run', 'dev:client']],
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`${name} process exited with code ${code}`);
      shutdown(code || 1);
    }
  });

  return child;
});

const shutdown = (code = 0) => {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
};

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
