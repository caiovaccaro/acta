#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { loadLinearIssue, ReadinessError, runReadiness } from './readiness.mjs';

function parseArgs(argv) {
  const args = {};
  for (const token of argv) {
    if (!token.startsWith('--') || !token.includes('=')) {
      throw new ReadinessError(`Unsupported argument: ${token}`);
    }
    const [key, ...valueParts] = token.slice(2).split('=');
    args[key] = valueParts.join('=');
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const issue = args.issue;
  if (!issue) {
    throw new ReadinessError('Usage: npm run verify:pr-ready -- --issue=CAI-123');
  }

  const repoRoot = process.cwd();
  const manifestPath = args.manifest
    ?? `openspec/changes/${args.change ?? ''}/verification.json`;
  if (!args.manifest && !args.change) {
    throw new ReadinessError('--change=<openspec-change-id> is required');
  }

  let issueDescription;
  if (args['issue-file']) {
    if (process.env.NODE_ENV !== 'test' && process.env.ALLOW_LINEAR_FIXTURE !== '1') {
      throw new ReadinessError('--issue-file is restricted to tests');
    }
    issueDescription = await readFile(path.resolve(repoRoot, args['issue-file']), 'utf8');
  } else {
    const linearIssue = await loadLinearIssue({ issue });
    issueDescription = linearIssue.description;
  }

  const manifest = JSON.parse(
    await readFile(path.resolve(repoRoot, manifestPath), 'utf8'),
  );
  if (manifest.issue !== issue) {
    throw new ReadinessError(
      `Requested issue ${issue} does not match manifest issue ${manifest.issue}`,
    );
  }

  const report = await runReadiness({
    repoRoot,
    manifestPath,
    issueDescription,
  });
  process.stdout.write(
    `PR readiness passed for ${report.issue} at ${report.commit}; report: ${manifest.reportPath}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof ReadinessError ? error.message : 'Unexpected readiness failure';
  process.stderr.write(`PR readiness failed: ${message}\n`);
  process.exitCode = 1;
});
