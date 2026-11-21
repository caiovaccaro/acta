#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const container = 'acta-cai-252-postgres';
const port = '55435';

function run(args, options = {}) {
  return spawnSync('docker', args, {
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
  });
}

function isRunning() {
  const result = run(['inspect', '-f', '{{.State.Running}}', container]);
  return result.status === 0 && result.stdout.trim() === 'true';
}

function isReady() {
  const result = run(['exec', container, 'pg_isready', '-U', 'acta', '-d', 'acta_cai252']);
  return result.status === 0;
}

if (!isRunning()) {
  run(['rm', '-f', container]);
  const started = run([
    'run',
    '--name',
    container,
    '-e',
    'POSTGRES_USER=acta',
    '-e',
    'POSTGRES_PASSWORD=acta',
    '-e',
    'POSTGRES_DB=acta_cai252',
    '-p',
    `127.0.0.1:${port}:5432`,
    '-d',
    'postgres:16',
  ]);
  if (started.status !== 0) {
    process.stderr.write(`${started.stderr || started.stdout || 'failed to start pipeline PostgreSQL'}\n`);
    process.exit(1);
  }
}

for (let attempt = 0; attempt < 30; attempt += 1) {
  if (isReady()) {
    process.stdout.write(`Disposable pipeline PostgreSQL is ready on host port ${port}.\n`);
    process.exit(0);
  }
  spawnSync('sleep', ['1']);
}

process.stderr.write('Disposable pipeline PostgreSQL did not become ready.\n');
process.exit(1);
