import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { loadSoakReport } from '../pipeline/soak';
import { STEADY_STATE_CONFIG } from '../../../core/src/operations/soak';

const describeDatabase = process.env.RUN_SOAK_E2E_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('seven consecutive scheduled soak days', () => {
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

  it('closes as steady when freshness, recovery, email, and cost all pass', async () => {
    for (let day = 5; day <= 11; day += 1) {
      const stamp = new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z`);
      const run = await db.pipelineRun.create({
        data: {
          trigger: 'scheduled',
          status: 'completed',
          finishedAt: stamp,
          createdAt: stamp,
        },
      });
      await db.llmUsage.create({
        data: {
          pipelineRunId: run.id,
          operation: 'classifyStance',
          provider: 'openai',
          model: 'gpt-4o-mini',
          promptTokens: 8,
          completionTokens: 4,
          estimatedCostUsd: '0.050000',
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
    }

    const report = await loadSoakReport({
      db,
      now: new Date('2026-10-12T12:00:00.000Z'),
    });
    expect(report.countedDays).toHaveLength(7);
    expect(report.freshness.status).toBe('pass');
    expect(report.reliability.status).toBe('pass');
    expect(report.email.status).toBe('pass');
    expect(report.cost.status).toBe('pass');
    expect(report.recommendation).toBe('steady');
    expect(report.steadyStateConfig).toEqual(STEADY_STATE_CONFIG);
    expect(report.steadyStateConfig.autoApproveTopics).toBe(false);
  });
});
