import { spawn } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const describeDatabase = process.env.RUN_PIPELINE_E2E_TESTS === '1'
  ? describe
  : describe.skip;

interface RunnerResult {
  acquired: boolean;
}

function runCompetitor(startAt: number): Promise<RunnerResult> {
  const runnerPath = resolvePath(
    process.cwd(),
    'src/__tests__/fixtures/competingPipelineRunner.ts',
  );

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', runnerPath, String(startAt)],
      {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Competing runner failed (${code}): ${stderr}`));
        return;
      }
      const resultLine = stdout.trim().split('\n').at(-1);
      resolve(JSON.parse(resultLine ?? '{}') as RunnerResult);
    });
  });
}

describeDatabase('competing pipeline runner E2E', () => {
  jest.setTimeout(30_000);
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pipeline_e2e_mutations" (
        "id" BIGSERIAL PRIMARY KEY,
        "runId" TEXT NOT NULL
      )
    `);
    await db.$executeRawUnsafe('TRUNCATE TABLE "pipeline_e2e_mutations"');
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS "pipeline_e2e_mutations"');
    await db.$disconnect();
  });

  it('allows exactly one process to mutate', async () => {
    const startAt = Date.now() + 1_000;
    const results = await Promise.all([
      runCompetitor(startAt),
      runCompetitor(startAt),
    ]);

    expect(results.filter(({ acquired }) => acquired)).toHaveLength(1);
    expect(results.filter(({ acquired }) => !acquired)).toHaveLength(1);

    const rows = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "pipeline_e2e_mutations"
    `;
    expect(Number(rows[0].count)).toBe(1);
  });
});
