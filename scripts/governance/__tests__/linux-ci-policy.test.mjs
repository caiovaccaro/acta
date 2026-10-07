import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../../..');
const workflowPath = path.join(root, '.github/workflows/linux-ci.yml');
const packagePath = path.join(root, 'package.json');
const manifestPath = path.join(
  root,
  'openspec/changes/p1-01-linux-ci-config-validation/verification.json',
);
const runbookPath = path.join(
  root,
  'documentation/governance/linux-production-readiness.md',
);

test('Linux CI is read-only, bounded, secret-free, and cancellable', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /permissions:\n  contents: read/);
  assert.doesNotMatch(workflow, /\b(?:write|write-all)\b/);
  assert.match(workflow, /timeout-minutes:\s*30/);
  assert.match(workflow, /cancel-in-progress:\s*true/);
  assert.match(workflow, /image:\s*postgres:16/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /\b(?:OPENAI|TAVILY|RESEND)_[A-Z0-9_]+\b/);
});

test('Linux CI consumes every canonical P1-01 command', async () => {
  const [workflow, packageJson, manifest] = await Promise.all([
    readFile(workflowPath, 'utf8'),
    readFile(packagePath, 'utf8').then(JSON.parse),
    readFile(manifestPath, 'utf8').then(JSON.parse),
  ]);

  for (const testClass of ['unit', 'integration', 'e2e', 'regression']) {
    const script = `test:p1-01:${testClass}`;
    assert.equal(typeof packageJson.scripts[script], 'string', `missing ${script}`);
    assert.match(workflow, new RegExp(`npm run ${script.replaceAll('-', '\\-')}`));
    assert.equal(manifest.tests[testClass], `npm run ${script}`);
  }
});

test('P1-01 commands preserve production and disposable database boundaries', async () => {
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));

  assert.match(packageJson.scripts['test:p1-01:integration'], /prisma db push --skip-generate/);
  assert.match(packageJson.scripts['test:p1-01:integration'], /npm test/);
  assert.match(packageJson.scripts['test:p1-01:e2e'], /NODE_ENV=production/);
  assert.match(packageJson.scripts['test:p1-01:e2e'], /@acta\/web/);
  assert.doesNotMatch(
    Object.entries(packageJson.scripts)
      .filter(([key]) => key.startsWith('test:p1-01:'))
      .map(([, command]) => command)
      .join('\n'),
    /\b(?:OPENAI|TAVILY|RESEND)_[A-Z0-9_]+\b/,
  );
});

test('the runbook documents every canonical command and recovery path', async () => {
  const [runbook, packageJson] = await Promise.all([
    readFile(runbookPath, 'utf8'),
    readFile(packagePath, 'utf8').then(JSON.parse),
  ]);

  for (const script of [
    'config:validate:production',
    'test:p1-01:unit',
    'test:p1-01:integration',
    'test:p1-01:e2e',
    'test:p1-01:regression',
    'verify:pr-ready',
  ]) {
    assert.equal(typeof packageJson.scripts[script], 'string', `missing ${script}`);
    assert.match(runbook, new RegExp(`npm run ${script.replaceAll('-', '\\-')}`));
  }
  assert.match(runbook, /Failure recovery/);
  assert.match(runbook, /prisma db push --skip-generate/);
});
