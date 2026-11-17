import { spawn } from 'node:child_process';

const server = spawn('node', ['--import', 'tsx/esm', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3000' },
});

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  env: process.env,
});

function cleanup() {
  server.kill('SIGTERM');
  vite.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

server.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[backend] server exited with code ${code}`);
    cleanup();
  }
});

vite.on('exit', (code) => {
  if (code && code !== 0) {
    cleanup();
  }
});
