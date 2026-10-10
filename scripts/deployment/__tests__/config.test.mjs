import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import {
  effectiveNextOutputDirectory,
  formatDeploymentConfigIssues,
  validateDeploymentConfiguration,
} from '../config.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const require = createRequire(import.meta.url);
const validRootPackage = {
  scripts: {
    'build:vercel': [
      'npm run config:validate:production',
      'npm run deploy:validate',
      'npm run build --workspace @acta/web',
    ].join(' && '),
  },
};
const validVercelConfig = {
  buildCommand: 'npm run build:vercel',
  installCommand: 'npm ci',
  outputDirectory: 'apps/web/.next',
};

test('accepts the supported production output contract', () => {
  const result = validateDeploymentConfiguration({
    environment: { NODE_ENV: 'production' },
    nextConfig: {},
    rootPackage: validRootPackage,
    vercelConfig: validVercelConfig,
  });
  assert.deepEqual(result, {
    success: true,
    issues: [],
    outputDirectory: 'apps/web/.next',
  });
});

test('rejects a non-production build environment without exposing its value', () => {
  const result = validateDeploymentConfiguration({
    environment: { NODE_ENV: 'sentinel-non-production' },
    nextConfig: {},
    rootPackage: validRootPackage,
    vercelConfig: validVercelConfig,
  });
  assert.equal(result.success, false);
  const output = formatDeploymentConfigIssues(result.issues);
  assert.match(output, /NODE_ENV/);
  assert.doesNotMatch(output, /sentinel-non-production/);
});

test('rejects Vercel and Next.js output disagreement', () => {
  const result = validateDeploymentConfiguration({
    environment: { NODE_ENV: 'production' },
    nextConfig: { distDir: '../../.next' },
    rootPackage: validRootPackage,
    vercelConfig: validVercelConfig,
  });
  assert.equal(effectiveNextOutputDirectory({ distDir: '../../.next' }), '.next');
  assert.equal(result.success, false);
  assert.match(formatDeploymentConfigIssues(result.issues), /outputDirectory/);
});

test('rejects build commands that can run before both preflights', () => {
  const result = validateDeploymentConfiguration({
    environment: { NODE_ENV: 'production' },
    nextConfig: {},
    rootPackage: {
      scripts: {
        'build:vercel': 'npm run build --workspace @acta/web && npm run deploy:validate',
      },
    },
    vercelConfig: validVercelConfig,
  });
  assert.equal(result.success, false);
  assert.match(formatDeploymentConfigIssues(result.issues), /scripts\.build:vercel/);
});

test('tracked Vercel and Next.js settings satisfy the contract', async () => {
  const [vercelConfig, rootPackage] = await Promise.all(
    ['vercel.json', 'package.json'].map(async (file) => (
      JSON.parse(await readFile(path.join(repoRoot, file), 'utf8'))
    )),
  );
  const nextConfigPath = path.join(repoRoot, 'apps/web/next.config.js');
  delete require.cache[require.resolve(nextConfigPath)];
  const nextConfig = require(nextConfigPath);
  const result = validateDeploymentConfiguration({
    environment: { NODE_ENV: 'production' },
    nextConfig,
    rootPackage,
    vercelConfig,
  });
  assert.deepEqual(result.issues, []);
});
