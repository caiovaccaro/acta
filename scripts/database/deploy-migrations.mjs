#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';
import { DatabaseContractError, validateMigrationGate } from './production-contract.mjs';

async function main() {
  validateMigrationGate(process.env);
  process.stdout.write('Migration gate accepted; deploying with the direct connection role.\n');
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'migrate', 'deploy', '--schema', 'modules/db/prisma/schema.prisma'],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DIRECT_DATABASE_URL },
      stdio: 'inherit',
    },
  );
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) throw new DatabaseContractError('migration deployment', 'Prisma failed');
}

main().catch((error) => {
  const message = error instanceof DatabaseContractError
    ? error.message
    : 'unexpected controlled migration failure';
  process.stderr.write(`Controlled migration blocked: ${message}\n`);
  process.exitCode = 1;
});
