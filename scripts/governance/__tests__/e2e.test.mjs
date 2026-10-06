import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve(import.meta.dirname, '../verify-pr-ready.mjs');
const issueFixturePath = path.join(import.meta.dirname, 'fixtures', 'cai-244.md');
const specSourcePath = path.resolve(
  import.meta.dirname,
  '../../../openspec/changes/p1-00-spec-test-pr-governance/specs/change-governance/spec.md',
);

async function createFixtureRepo() {
  const root = await mkdtemp(path.join(tmpdir(), 'acta-governance-e2e-'));
  const changeRoot = path.join(root, 'openspec/changes/p1-00-spec-test-pr-governance');
  await mkdir(path.join(changeRoot, 'specs/change-governance'), { recursive: true });
  await mkdir(path.join(root, 'fixtures'), { recursive: true });
  await writeFile(
    path.join(changeRoot, 'specs/change-governance/spec.md'),
    await readFile(specSourcePath, 'utf8'),
  );
  const pass = 'node -e "process.exit(0)"';
  const manifest = {
    issue: 'CAI-244',
    changeId: 'p1-00-spec-test-pr-governance',
    openSpecCommand: pass,
    tests: { unit: pass, integration: pass, e2e: pass, regression: pass },
    deltaSpecFiles: [
      'openspec/changes/p1-00-spec-test-pr-governance/specs/change-governance/spec.md',
    ],
    evidenceFiles: [
      'openspec/changes/p1-00-spec-test-pr-governance/specs/change-governance/spec.md',
      'openspec/changes/p1-00-spec-test-pr-governance/verification.json',
    ],
    trackedPaths: ['openspec'],
    reportPath: 'reports/CAI-244.json',
  };
  await writeFile(
    path.join(changeRoot, 'verification.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const completeIssue = await readFile(issueFixturePath, 'utf8');
  await writeFile(path.join(root, 'fixtures/complete.md'), completeIssue);
  await writeFile(
    path.join(root, 'fixtures/incomplete.md'),
    completeIssue.replace('## Open questions', '## Missing section'),
  );
  await execFileAsync('git', ['init', '-q'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'Governance Test'], { cwd: root });
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

async function runCli(root, issueFile) {
  return execFileAsync(
    process.execPath,
    [
      cliPath,
      '--issue=CAI-244',
      '--change=p1-00-spec-test-pr-governance',
      `--issue-file=${issueFile}`,
    ],
    {
      cwd: root,
      env: { ...process.env, NODE_ENV: 'test' },
    },
  );
}

test('an incomplete change fails and the compliant change emits commit-bound evidence', async () => {
  const root = await createFixtureRepo();
  await assert.rejects(
    runCli(root, 'fixtures/incomplete.md'),
    (error) => error.stderr.includes('missing required section'),
  );

  const result = await runCli(root, 'fixtures/complete.md');
  assert.match(result.stdout, /PR readiness passed for CAI-244/);
  const report = JSON.parse(await readFile(path.join(root, 'reports/CAI-244.json'), 'utf8'));
  const { stdout: commit } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root });
  assert.equal(report.commit, commit.trim());
  assert.deepEqual(
    report.commands.map((entry) => entry.name),
    ['openspec', 'unit', 'integration', 'e2e', 'regression'],
  );
});
