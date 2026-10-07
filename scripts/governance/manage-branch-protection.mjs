#!/usr/bin/env node

import process from 'node:process';
import {
  auditProtection,
  desiredProtection,
  githubRequest,
  REQUIRED_CHECKS,
} from './branch-protection.mjs';

async function main() {
  const mode = process.argv[2] ?? 'audit';
  if (!['audit', 'apply'].includes(mode)) {
    throw new Error('Usage: node manage-branch-protection.mjs [audit|apply]');
  }
  const repository = process.env.GITHUB_REPOSITORY ?? 'caiovaccaro/acta';
  const branch = process.env.GITHUB_BRANCH ?? 'main';
  const apiPath = `/repos/${repository}/branches/${encodeURIComponent(branch)}/protection`;

  if (mode === 'apply') {
    await githubRequest({ path: apiPath, method: 'PUT', body: desiredProtection() });
    process.stdout.write(
      `Applied branch protection to ${repository}:${branch} with checks ${REQUIRED_CHECKS.join(', ')}\n`,
    );
  }

  const protection = await githubRequest({ path: apiPath });
  const failures = auditProtection(protection);
  if (failures.length > 0) {
    throw new Error(`Branch protection audit failed: ${failures.join('; ')}`);
  }
  process.stdout.write(`Branch protection audit passed for ${repository}:${branch}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
