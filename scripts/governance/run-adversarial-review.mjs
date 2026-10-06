#!/usr/bin/env node

import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { buildAdversarialPrompt, requestAdversarialReview } from './adversarial.mjs';
import { loadLinearIssue, ReadinessError, runCommand } from './readiness.mjs';

function extractReference(body, label, pattern) {
  const match = body.match(new RegExp(`${label}\\s*:?\\s*\`?(${pattern})\`?`, 'i'));
  if (!match) throw new ReadinessError(`Pull request body is missing ${label}`);
  return match[1];
}

async function main() {
  if (!process.env.GITHUB_EVENT_PATH) {
    throw new ReadinessError('GITHUB_EVENT_PATH is required');
  }
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const pullRequest = event.pull_request;
  if (!pullRequest?.body || !pullRequest.base?.sha || !pullRequest.head?.sha) {
    throw new ReadinessError('A pull_request event with body and commit SHAs is required');
  }

  const issueId = extractReference(pullRequest.body, 'Linear issue', 'CAI-\\d+');
  const changeId = extractReference(pullRequest.body, 'OpenSpec change', '[a-z0-9][a-z0-9-]+');
  const manifestPath = path.resolve(
    `openspec/changes/${changeId}/verification.json`,
  );
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.issue !== issueId || manifest.changeId !== changeId) {
    throw new ReadinessError('Pull request references do not match the verification manifest');
  }

  const linearIssue = await loadLinearIssue({ issue: issueId });
  const artifactParts = await Promise.all(
    manifest.evidenceFiles.map(async (file) => {
      const content = await readFile(path.resolve(file), 'utf8');
      return `--- ${file} ---\n${content}`;
    }),
  );
  const { stdout: diff } = await runCommand(
    `git diff --unified=40 ${pullRequest.base.sha}...${pullRequest.head.sha} -- . ':!package-lock.json'`,
    { cwd: process.cwd() },
  );
  const prompt = buildAdversarialPrompt({
    issue: linearIssue.description,
    artifacts: artifactParts.join('\n\n'),
    diff,
  });
  const review = await requestAdversarialReview({ prompt });

  const summary = [
    '# Adversarial review',
    '',
    `Verdict: **${review.verdict.toUpperCase()}**`,
    `Reviewed commit: \`${pullRequest.head.sha}\``,
    '',
    ...review.findings.flatMap((finding) => [
      `## ${finding.title}`,
      `- Evidence: ${finding.evidence}`,
      `- Required fix: ${finding.requiredFix}`,
      '',
    ]),
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, 'utf8');
  } else {
    process.stdout.write(`${summary}\n`);
  }

  if (review.verdict !== 'pass' || review.findings.length > 0) {
    throw new ReadinessError(
      `Adversarial review found ${review.findings.length} blocking issue(s)`,
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown adversarial review failure';
  process.stderr.write(`Adversarial review failed: ${message}\n`);
  process.exitCode = 1;
});
