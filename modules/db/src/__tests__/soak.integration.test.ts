import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { loadSoakReport } from '../pipeline/soak';

const describeDatabase = process.env.RUN_SOAK_DB_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('soak metrics from stored runs and ledger', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.pipelineNotification.deleteMany();
    await db.llmUsage.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('traces freshness, cost, and receipts to stored evidence', async () => {
    const run = await db.pipelineRun.create({
      data: {
        trigger: 'scheduled',
        status: 'completed',
        finishedAt: new Date('2026-10-11T12:00:00.000Z'),
      },
    });
    await db.llmUsage.create({
      data: {
        pipelineRunId: run.id,
        operation: 'classifyStance',
        provider: 'openai',
        model: 'gpt-4o-mini',
        promptTokens: 10,
        completionTokens: 5,
        estimatedCostUsd: '0.010000',
      },
    });
    await db.pipelineNotification.create({
      data: {
        pipelineRunId: run.id,
        kind: 'success',
        status: 'accepted',
        subject: '[Acta] Pipeline completed',
      },
    });

    const report = await loadSoakReport({
      db,
      now: new Date('2026-10-12T12:00:00.000Z'),
    });
    expect(report.countedDays).toEqual(['2026-10-11']);
    expect(report.freshness.lastFinishedAt).toBe('2026-10-11T12:00:00.000Z');
    expect(report.cost.observedSevenDayUsd).toBe('0.010000');
    expect(report.email.daysMissingReceipt).toEqual([]);
    expect(report.reliability.unrecoveredFailures).toBe(0);
  });
});
