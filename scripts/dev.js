import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let nodeBin = 'node';
let nodeEnv = { ...process.env, PORT: '3000' };

// If the running node process is not ABI 127 (Node 22 LTS), look for Node 22 in nvm
if (process.versions.modules !== '127') {
  const nvmDir = path.join(os.homedir(), '.nvm', 'versions', 'node');
  if (fs.existsSync(nvmDir)) {
    const v22 = fs.readdirSync(nvmDir).find((v) => v.startsWith('v22.'));
    if (v22) {
      const candidate = path.join(nvmDir, v22, 'bin', 'node');
      if (fs.existsSync(candidate)) {
        nodeBin = candidate;
        const binDir = path.dirname(candidate);
        nodeEnv = { ...process.env, PATH: `${binDir}:${process.env.PATH || ''}`, PORT: '3000' };
        console.log(`[afterglow] Using Node 22 LTS (${v22}) for SQLite native addon compatibility.`);
      }
    }
  }
}

const server = spawn(nodeBin, ['--import', 'tsx/esm', 'server/index.ts'], {
  stdio: 'inherit',
  env: nodeEnv,
});

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  env: nodeEnv,
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
