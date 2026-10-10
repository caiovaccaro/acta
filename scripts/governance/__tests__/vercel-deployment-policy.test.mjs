import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { extractScenarios, validateIssueDescription, validateManifest } from '../readiness.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const changeRoot = path.join(
  repoRoot,
  'openspec/changes/p1-03-vercel-monorepo-output',
);

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('CAI-248 fixture and OpenSpec contain exactly the same three scenarios', async () => {
  const [fixture, spec] = await Promise.all([
    read('scripts/governance/__tests__/fixtures/cai-248.md'),
    readFile(path.join(changeRoot, 'specs/vercel-deployment-readiness/spec.md'), 'utf8'),
  ]);
  const fixtureScenarios = validateIssueDescription(
    fixture,
    'p1-03-vercel-monorepo-output',
  );
  assert.equal(fixtureScenarios.length, 3);
  assert.deepEqual(fixtureScenarios, extractScenarios(spec));
});

test('CAI-248 manifest names all canonical verification commands', async () => {
  const [manifestSource, packageSource] = await Promise.all([
    readFile(path.join(changeRoot, 'verification.json'), 'utf8'),
    read('package.json'),
  ]);
  const manifest = validateManifest(JSON.parse(manifestSource));
  const rootPackage = JSON.parse(packageSource);
  for (const [testClass, command] of Object.entries(manifest.tests)) {
    assert.equal(command, `npm run test:p1-03:${testClass}`);
    assert.ok(rootPackage.scripts[`test:p1-03:${testClass}`]);
  }
});

test('tracked Vercel policy uses one deterministic app-local output', async () => {
  const [vercelSource, nextSource, packageSource] = await Promise.all([
    read('vercel.json'),
    read('apps/web/next.config.js'),
    read('package.json'),
  ]);
  const vercel = JSON.parse(vercelSource);
  const rootPackage = JSON.parse(packageSource);
  assert.equal(vercel.installCommand, 'npm ci');
  assert.equal(vercel.buildCommand, 'npm run build:vercel');
  assert.equal(vercel.outputDirectory, 'apps/web/.next');
  assert.doesNotMatch(nextSource, /\bdistDir\s*:/);
  assert.match(rootPackage.scripts['build:vercel'], /^npm run config:validate:production/);
  assert.match(rootPackage.scripts['build:vercel'], /npm run deploy:validate/);
});
