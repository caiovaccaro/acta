#!/usr/bin/env node

import { appendFile, readFile } from 'node:fs/promises';
import process from 'node:process';

function extract(body, label, pattern) {
  const match = body.match(new RegExp(`${label}\\s*:?\\s*\`?(${pattern})\`?`, 'i'));
  if (!match) throw new Error(`Pull request body is missing ${label}`);
  return match[1];
}

async function main() {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const body = event.pull_request?.body;
  if (typeof body !== 'string') throw new Error('Pull request body is required');
  const issue = extract(body, 'Linear issue', 'CAI-\\d+');
  const change = extract(body, 'OpenSpec change', '[a-z0-9][a-z0-9-]+');
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
  await appendFile(process.env.GITHUB_OUTPUT, `issue=${issue}\nchange=${change}\n`, 'utf8');
}

main().catch((error) => {
  process.stderr.write(`Reference extraction failed: ${error.message}\n`);
  process.exitCode = 1;
});
