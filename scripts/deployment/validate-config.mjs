#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import {
  formatDeploymentConfigIssues,
  validateDeploymentConfiguration,
} from './config.mjs';

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);

const [vercelConfig, rootPackage] = await Promise.all(
  ['vercel.json', 'package.json'].map(async (file) => (
    JSON.parse(await readFile(path.join(repoRoot, file), 'utf8'))
  )),
);
const nextConfigPath = path.join(repoRoot, 'apps/web/next.config.js');
delete require.cache[require.resolve(nextConfigPath)];
const nextConfig = require(nextConfigPath);

const result = validateDeploymentConfiguration({
  environment: process.env,
  nextConfig,
  rootPackage,
  vercelConfig,
});

if (!result.success) {
  console.error(formatDeploymentConfigIssues(result.issues));
  process.exitCode = 1;
} else {
  console.log(`Deployment configuration is valid (${result.outputDirectory}).`);
}
