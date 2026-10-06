import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class ReadinessError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ReadinessError';
    this.details = details;
  }
}

export function normalizeScenarioPart(value) {
  return value
    .replace(/\*\*/g, '')
    .replace(/^[\s>*-]+/gm, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:\s]+$/g, '')
    .trim()
    .toLowerCase();
}

export function extractScenarios(markdown) {
  const prepared = markdown
    .replace(/-\s+\*\*(GIVEN|WHEN|THEN)\*\*\s*/gi, '$1 ')
    .replace(/\r/g, '');
  const scenarioBlocks = prepared.split(/(?=####?\s+(?:Scenario|Unit|Integration|E2E)\b)/i);
  const scenarios = [];

  for (const block of scenarioBlocks) {
    const given = block.match(/\bGIVEN\s+([\s\S]*?)(?=(?:,\s*|\n\s*)WHEN\s)/i);
    const when = block.match(/(?:,\s*|\n\s*)WHEN\s+([\s\S]*?)(?=(?:,\s*|\n\s*)THEN\s)/i);
    const then = block.match(/(?:,\s*|\n\s*)THEN\s+([\s\S]*?)(?=\n\s*#{2,4}\s|$)/i);
    if (!given || !when || !then) continue;
    scenarios.push([
      normalizeScenarioPart(given[1]),
      normalizeScenarioPart(when[1]),
      normalizeScenarioPart(then[1]),
    ].join(' | '));
  }

  return [...new Set(scenarios)].sort();
}

export function extractChangeId(markdown) {
  return markdown.match(/\*\*Change ID:\*\*\s*`([^`]+)`/i)?.[1] ?? null;
}

export function validateIssueDescription(description, expectedChangeId) {
  const requiredSections = [
    '## OpenSpec',
    '## Problem',
    '## Required behavior',
    '## Given/When/Then test specification',
    '### Unit',
    '### Integration',
    '### E2E',
    '## Acceptance criteria',
    '## Open questions',
  ];
  const missing = requiredSections.filter((section) => !description.includes(section));
  if (missing.length > 0) {
    throw new ReadinessError(`Linear issue is missing required section(s): ${missing.join(', ')}`);
  }

  const actualChangeId = extractChangeId(description);
  if (actualChangeId !== expectedChangeId) {
    throw new ReadinessError(
      `Linear issue change ID mismatch: expected ${expectedChangeId}, received ${actualChangeId ?? 'none'}`,
    );
  }

  const openQuestions = description
    .split('## Open questions')[1]
    ?.split(/\n##\s/)[0]
    ?.trim();
  if (!openQuestions || !/^None(?:[.\s]|$)/i.test(openQuestions)) {
    throw new ReadinessError('Linear issue has unresolved open questions');
  }

  const scenarios = extractScenarios(description);
  if (scenarios.length !== 3) {
    throw new ReadinessError(
      `Linear issue must contain exactly three mirrored scenarios; found ${scenarios.length}`,
    );
  }
  return scenarios;
}

export function validateManifest(manifest) {
  const requiredStrings = ['issue', 'changeId', 'reportPath', 'openSpecCommand'];
  const missing = requiredStrings.filter(
    (key) => typeof manifest[key] !== 'string' || manifest[key].trim() === '',
  );
  if (missing.length > 0) {
    throw new ReadinessError(`Verification manifest is missing: ${missing.join(', ')}`);
  }
  if (!/^CAI-\d+$/.test(manifest.issue)) {
    throw new ReadinessError('Verification manifest issue must use a CAI-123 identifier');
  }

  const requiredClasses = ['unit', 'integration', 'e2e', 'regression'];
  for (const testClass of requiredClasses) {
    if (typeof manifest.tests?.[testClass] !== 'string' || !manifest.tests[testClass].trim()) {
      throw new ReadinessError(`Verification manifest is missing ${testClass} test command`);
    }
  }
  if (!Array.isArray(manifest.trackedPaths) || manifest.trackedPaths.length === 0) {
    throw new ReadinessError('Verification manifest must declare trackedPaths');
  }
  if (!Array.isArray(manifest.deltaSpecFiles) || manifest.deltaSpecFiles.length === 0) {
    throw new ReadinessError('Verification manifest must declare deltaSpecFiles');
  }
  if (!Array.isArray(manifest.evidenceFiles) || manifest.evidenceFiles.length === 0) {
    throw new ReadinessError('Verification manifest must declare evidenceFiles');
  }
  return manifest;
}

export async function loadLinearIssue({
  issue,
  apiKey = process.env.LINEAR_API_KEY,
  endpoint = process.env.LINEAR_API_URL ?? 'https://api.linear.app/graphql',
  fetchImpl = globalThis.fetch,
}) {
  if (!apiKey) {
    throw new ReadinessError('LINEAR_API_KEY is required to read the Linear issue');
  }
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'query ReadIssue($id: String!) { issue(id: $id) { identifier title description url } }',
      variables: { id: issue },
    }),
  });
  if (!response.ok) {
    throw new ReadinessError(`Linear request failed with status ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new ReadinessError('Linear returned a GraphQL error');
  }
  const result = payload.data?.issue;
  if (!result?.description || result.identifier !== issue) {
    throw new ReadinessError(`Linear issue ${issue} was not returned with a description`);
  }
  return result;
}

export async function runCommand(command, { cwd, env = process.env } = {}) {
  const result = await execFileAsync('/bin/sh', ['-c', command], {
    cwd,
    env: { ...env, FORCE_COLOR: '0', NO_COLOR: '1' },
    maxBuffer: 10 * 1024 * 1024,
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

export async function currentCommit(cwd) {
  const { stdout } = await runCommand('git rev-parse HEAD', { cwd });
  return stdout.trim();
}

export async function assertTrackedPathsClean(cwd, trackedPaths) {
  const quoted = trackedPaths.map((entry) => `'${entry.replaceAll("'", "'\\''")}'`).join(' ');
  const { stdout } = await runCommand(`git status --porcelain -- ${quoted}`, { cwd });
  if (stdout.trim()) {
    throw new ReadinessError(
      `Governance evidence is not commit-bound; dirty paths:\n${stdout.trim()}`,
    );
  }
}

export async function hashFiles(cwd, files) {
  const hashes = {};
  for (const relativePath of files) {
    const absolutePath = path.resolve(cwd, relativePath);
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      throw new ReadinessError(`Evidence path is not a file: ${relativePath}`);
    }
    const content = await readFile(absolutePath);
    hashes[relativePath] = createHash('sha256').update(content).digest('hex');
  }
  return hashes;
}

export async function runReadiness({
  repoRoot,
  manifestPath,
  issueDescription,
  commandRunner = runCommand,
  requireClean = true,
}) {
  const manifest = validateManifest(
    JSON.parse(await readFile(path.resolve(repoRoot, manifestPath), 'utf8')),
  );
  const issueScenarios = validateIssueDescription(issueDescription, manifest.changeId);
  const specMarkdownParts = await Promise.all(
    manifest.deltaSpecFiles.map((file) => readFile(path.resolve(repoRoot, file), 'utf8')),
  );
  const specScenarios = extractScenarios(specMarkdownParts.join('\n\n'));
  if (JSON.stringify(issueScenarios) !== JSON.stringify(specScenarios)) {
    throw new ReadinessError('Linear issue scenarios differ from the OpenSpec delta', {
      issueScenarios,
      specScenarios,
    });
  }

  if (requireClean) {
    await assertTrackedPathsClean(repoRoot, manifest.trackedPaths);
  }

  const commands = [
    ['openspec', manifest.openSpecCommand],
    ...Object.entries(manifest.tests),
  ];
  const commandResults = [];
  for (const [name, command] of commands) {
    try {
      const result = await commandRunner(command, { cwd: repoRoot });
      commandResults.push({ name, command, status: 'passed', ...result });
    } catch (error) {
      throw new ReadinessError(`${name} verification failed: ${command}`, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const commit = await currentCommit(repoRoot);
  const artifactHashes = await hashFiles(repoRoot, manifest.evidenceFiles);
  const report = {
    schemaVersion: 1,
    issue: manifest.issue,
    changeId: manifest.changeId,
    commit,
    generatedAt: new Date().toISOString(),
    artifactHashes,
    commands: commandResults.map(({ name, command, status }) => ({ name, command, status })),
  };
  const reportPath = path.resolve(repoRoot, manifest.reportPath);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  return report;
}
