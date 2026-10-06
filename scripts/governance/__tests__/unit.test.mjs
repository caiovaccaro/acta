import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  extractScenarios,
  ReadinessError,
  validateIssueDescription,
  validateManifest,
} from '../readiness.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const fixturePath = path.join(import.meta.dirname, 'fixtures', 'cai-244.md');
const specPath = path.join(
  repoRoot,
  'openspec/changes/p1-00-spec-test-pr-governance/specs/change-governance/spec.md',
);

test('extracts the same normalized scenarios from Linear and OpenSpec Markdown', async () => {
  const [issue, spec] = await Promise.all([
    readFile(fixturePath, 'utf8'),
    readFile(specPath, 'utf8'),
  ]);
  assert.deepEqual(extractScenarios(issue), extractScenarios(spec));
  assert.equal(extractScenarios(issue).length, 3);
});

test('names a missing required issue section', async () => {
  const issue = await readFile(fixturePath, 'utf8');
  assert.throws(
    () => validateIssueDescription(issue.replace('## Open questions', '## Decisions'), 'p1-00-spec-test-pr-governance'),
    (error) => error instanceof ReadinessError && error.message.includes('## Open questions'),
  );
});

test('rejects a divergent change ID', async () => {
  const issue = await readFile(fixturePath, 'utf8');
  assert.throws(
    () => validateIssueDescription(issue, 'another-change'),
    /change ID mismatch/,
  );
});

test('rejects unresolved open questions', async () => {
  const issue = await readFile(fixturePath, 'utf8');
  assert.throws(
    () => validateIssueDescription(
      issue.replace('## Open questions\n\nNone.', '## Open questions\n\nChoose a provider.'),
      'p1-00-spec-test-pr-governance',
    ),
    /unresolved open questions/,
  );
});

test('requires every test class and evidence collection in a manifest', () => {
  const valid = {
    issue: 'CAI-244',
    changeId: 'change',
    reportPath: 'report.json',
    openSpecCommand: 'true',
    tests: { unit: 'true', integration: 'true', e2e: 'true', regression: 'true' },
    trackedPaths: ['scripts'],
    deltaSpecFiles: ['spec.md'],
    evidenceFiles: ['spec.md'],
  };
  assert.equal(validateManifest(valid), valid);
  assert.throws(
    () => validateManifest({ ...valid, tests: { ...valid.tests, e2e: '' } }),
    /e2e test command/,
  );
});
