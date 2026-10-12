import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { createFixtureStageAdapters } from '../pipeline/sliceAdapters';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_PIPELINE_SLICE_DB_TESTS === '1'
  ? describe
  : describe.skip;

const argv = [
  '--max-runtime-minutes=285',
  '--max-new-articles=2',
  '--max-analysis-articles=2',
  '--trigger=manual',
];

describeDatabase('pipeline slice repository integration', () => {
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

  it('persists pause and recoverable failure at the last committed unit', async () => {
    const failed = await runPipelineSlice({
      argv,
      db,
      resource: 'p107-integration-fail',
      ownerToken: 'owner-fail',
      adapters: createFixtureStageAdapters({
        unitsByStage: { rss_refresh: ['a', 'b'] },
        failStage: { stage: 'rss_refresh', kind: 'failed_recoverable', afterCommitted: 1 },
      }),
    });

    expect(failed.exitCode).toBe(0);
    expect(failed.summary.status).toBe('failed_recoverable');
    const rss = failed.summary.stages.find((stage) => stage.stage === 'rss_refresh');
    expect(rss?.status).toBe('failed_recoverable');
    expect(rss?.cursor).toMatchObject({ id: 'a' });

    const persisted = await db.pipelineRun.findUniqueOrThrow({
      where: { id: failed.summary.runId! },
      include: { stageRuns: true },
    });
    expect(persisted.status).toBe('failed_recoverable');
    expect(persisted.errorCode).toBe('STAGE_FAILED_RECOVERABLE');
    expect(persisted.stageRuns.find((row) => row.stage === 'rss_refresh')?.cursor).toMatchObject({
      id: 'a',
    });
  });

  it('pauses for deadline before later stages run', async () => {
    const paused = await runPipelineSlice({
      argv: [
        '--max-runtime-minutes=1',
        '--max-new-articles=2',
        '--max-analysis-articles=2',
        '--trigger=manual',
      ],
      db,
      resource: 'p107-integration-deadline',
      ownerToken: 'owner-deadline',
      adapters: createFixtureStageAdapters({
        unitsByStage: { rss_refresh: ['a'] },
      }),
    });
    expect(paused.summary.status).toBe('paused_deadline');
    expect(paused.exitCode).toBe(0);
    expect(paused.summary.stages.find((stage) => stage.stage === 'rss_refresh')).toBeUndefined();
  });
});
