import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { readProductionWorkflow } from '../validate-production-workflow.mjs';

const root = path.resolve(import.meta.dirname, '../../..');

function run(command, env) {
  return new Promise((resolve, reject) => {
    const child = spawn('/bin/sh', ['-c', command], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('workflow command sequence migrates and runs one slice without secret output', async (t) => {
  if (process.env.RUN_PRODUCTION_WORKFLOW_DB_TESTS !== '1') {
    t.skip('requires disposable PostgreSQL');
    return;
  }
  const source = await readProductionWorkflow(root);
  assert.match(source, /npm ci/);
  assert.match(source, /npm run db:generate/);
  assert.match(source, /npm run config:validate:production/);
  assert.match(source, /npm run db:migrate:deploy/);
  assert.match(source, /npm run pipeline:run-slice/);

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_EMAIL: 'admin@example.invalid',
    ADMIN_PASSWORD: 'synthetic-password-123',
    ADMIN_SESSION_SECRET: 'synthetic-session-secret-1234567890',
    PIPELINE_EMAIL_DISABLED: '1',
    PIPELINE_LEASE_RESOURCE: 'p114-workflow-int',
  };
  const generate = await run('npm run db:generate', env);
  assert.equal(generate.code, 0, generate.stderr);
  const migrate = await run(
    'npx prisma db push --skip-generate --schema modules/db/prisma/schema.prisma',
    env,
  );
  assert.equal(migrate.code, 0, migrate.stderr);
  const slice = await run(
    'npm run pipeline:run-slice -- --max-runtime-minutes=285 --max-new-articles=1 --max-analysis-articles=1 --trigger=manual',
    env,
  );
  assert.equal(slice.code, 0, slice.stderr);
  assert.doesNotMatch(`${slice.stdout}\n${slice.stderr}`, /sk-|re_|tvly-|PIPELINE_EMAIL_TO=/);
  assert.match(slice.stdout, /"status":"completed"/);
});
