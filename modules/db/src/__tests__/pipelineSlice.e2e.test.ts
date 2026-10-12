import { spawn } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const describeDatabase = process.env.RUN_PIPELINE_SLICE_E2E_TESTS === '1'
  ? describe
  : describe.skip;

function runSliceProcess(mode: string): Promise<{
  status?: string;
  backlogRemaining?: boolean;
  interrupted?: boolean;
  stages?: Array<{ stage: string; status: string }>;
}> {
  const runnerPath = resolvePath(
    process.cwd(),
    'src/__tests__/fixtures/killedSliceRunner.ts',
  );
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', runnerPath, mode], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
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
      if (code !== 0 && mode !== 'interrupt') {
        reject(new Error(`Slice runner failed (${code}): ${stderr}`));
        return;
      }
      resolve(JSON.parse(stdout.trim().split('\n').at(-1) ?? '{}'));
    });
  });
}

describeDatabase('killed pipeline slice resume E2E', () => {
  jest.setTimeout(30_000);
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('resumes a terminated slice and completes with a coherent summary', async () => {
    const first = await runSliceProcess('interrupt');
    expect(first.interrupted).toBe(true);

    await new Promise((resolve) => {
      setTimeout(resolve, 700);
    });

    const second = await runSliceProcess('resume');
    expect(second.status).toBe('completed');
    expect(second.backlogRemaining).toBe(true);
    expect(second.stages?.map((stage) => stage.stage)).toEqual([
      'preflight',
      'tavily_trends',
      'rss_refresh',
      'tavily_priority',
      'article_extraction',
      'topic_discovery',
      'tavily_corroboration',
      'topic_matching',
      'question_discovery',
      'question_validation',
      'stance_classification',
      'verdict_recalculation',
      'content_generation',
      'finalize',
    ]);
    expect(second.stages?.every((stage) => stage.status === 'completed')).toBe(true);

    const runs = await db.pipelineRun.findMany();
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe('completed');
    expect(runs[0].summary).toMatchObject({
      backlogRemaining: true,
      budget: { enforced: false },
      receipt: { sent: false, reason: 'email_out_of_scope' },
    });
  });
});
