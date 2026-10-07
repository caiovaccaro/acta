import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import {
  loadLinearIssue,
  ReadinessError,
  runReadiness,
} from '../readiness.mjs';

const execFileAsync = promisify(execFile);
const fixturePath = path.join(import.meta.dirname, 'fixtures', 'cai-244.md');
const sourceSpecPath = path.resolve(
  import.meta.dirname,
  '../../../openspec/changes/p1-00-spec-test-pr-governance/specs/change-governance/spec.md',
);

async function withLinearServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function createReadinessRepo() {
  const root = await mkdtemp(path.join(tmpdir(), 'acta-governance-'));
  const changeRoot = path.join(root, 'openspec/changes/p1-00-spec-test-pr-governance');
  await mkdir(path.join(changeRoot, 'specs/change-governance'), { recursive: true });
  const spec = await readFile(sourceSpecPath, 'utf8');
  await writeFile(path.join(changeRoot, 'specs/change-governance/spec.md'), spec);
  const manifest = {
    issue: 'CAI-244',
    changeId: 'p1-00-spec-test-pr-governance',
    openSpecCommand: 'true',
    tests: { unit: 'true', integration: 'true', e2e: 'true', regression: 'true' },
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
  await execFileAsync('git', ['init', '-q'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'Governance Test'], { cwd: root });
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

test('reads a Linear issue through an authenticated GraphQL boundary', async () => {
  const issueDescription = await readFile(fixturePath, 'utf8');
  await withLinearServer((request, response) => {
    assert.equal(request.headers.authorization, 'fixture-token');
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({
      data: { issue: { identifier: 'CAI-244', description: issueDescription } },
    }));
  }, async (endpoint) => {
    const issue = await loadLinearIssue({
      issue: 'CAI-244',
      apiKey: 'fixture-token',
      endpoint,
    });
    assert.equal(issue.identifier, 'CAI-244');
  });
});

test('rejects unauthorized and malformed Linear responses without leaking credentials', async () => {
  await withLinearServer((_request, response) => {
    response.statusCode = 401;
    response.end('denied');
  }, async (endpoint) => {
    await assert.rejects(
      loadLinearIssue({ issue: 'CAI-244', apiKey: 'do-not-print', endpoint }),
      (error) => error instanceof ReadinessError
        && error.message.includes('status 401')
        && !error.message.includes('do-not-print'),
    );
  });
});

test('passes synchronized scenarios and rejects divergent scenarios', async () => {
  const root = await createReadinessRepo();
  const description = await readFile(fixturePath, 'utf8');
  const passing = await runReadiness({
    repoRoot: root,
    manifestPath: 'openspec/changes/p1-00-spec-test-pr-governance/verification.json',
    issueDescription: description,
    requireClean: true,
    commandRunner: async () => ({ stdout: '', stderr: '' }),
  });
  assert.equal(passing.issue, 'CAI-244');

  await assert.rejects(
    runReadiness({
      repoRoot: root,
      manifestPath: 'openspec/changes/p1-00-spec-test-pr-governance/verification.json',
      issueDescription: description.replace('only the synchronized change passes', 'both changes pass'),
      requireClean: true,
      commandRunner: async () => ({ stdout: '', stderr: '' }),
    }),
    /scenarios differ/,
  );
});

test('a failed required test class prevents report creation', async () => {
  const root = await createReadinessRepo();
  const description = await readFile(fixturePath, 'utf8');
  await assert.rejects(
    runReadiness({
      repoRoot: root,
      manifestPath: 'openspec/changes/p1-00-spec-test-pr-governance/verification.json',
      issueDescription: description,
      requireClean: true,
      commandRunner: async (command) => {
        if (command === 'true') throw new Error('fixture failure');
        return { stdout: '', stderr: '' };
      },
    }),
    /verification failed/,
  );
});
