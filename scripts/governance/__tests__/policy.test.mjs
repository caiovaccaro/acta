import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  auditProtection,
  desiredProtection,
  REQUIRED_CHECKS,
} from '../branch-protection.mjs';

const root = path.resolve(import.meta.dirname, '../../..');

test('pull-request template requires specification and test evidence', async () => {
  const template = await readFile(path.join(root, '.github/pull_request_template.md'), 'utf8');
  for (const field of [
    'Linear issue:',
    'OpenSpec change:',
    'OpenSpec artifact hashes:',
    '`/opsx:verify` result:',
    'Commit-bound `verify:pr-ready` report:',
    'Unit:',
    'Integration:',
    'End-to-end:',
    'Regression:',
  ]) {
    assert.ok(template.includes(field), `missing PR template field ${field}`);
  }
});

test('governance workflows remain read-only, bounded, and named for protection', async () => {
  const workflowFiles = [
    '.github/workflows/governance.yml',
    '.github/workflows/adversarial-review.yml',
  ];
  const workflows = await Promise.all(
    workflowFiles.map((file) => readFile(path.join(root, file), 'utf8')),
  );
  for (const workflow of workflows) {
    assert.match(workflow, /permissions:\n  contents: read/);
    assert.doesNotMatch(workflow, /\b(write|write-all)\b/);
    const timeout = Number(workflow.match(/timeout-minutes:\s*(\d+)/)?.[1]);
    assert.ok(timeout > 0 && timeout <= 30);
  }
  assert.match(workflows[0], /name: governance/);
  assert.match(workflows[1], /name: adversarial-review/);
});

test('branch-protection audit rejects missing checks and accepts the desired policy', () => {
  const desired = desiredProtection();
  assert.deepEqual(auditProtection(desired), []);
  const incomplete = structuredClone(desired);
  incomplete.required_status_checks.contexts = [REQUIRED_CHECKS[0]];
  assert.match(auditProtection(incomplete).join('; '), /adversarial-review/);
});
